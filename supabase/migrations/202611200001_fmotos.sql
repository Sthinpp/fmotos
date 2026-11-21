begin;

create schema if not exists fmotos_privado;
revoke all on schema fmotos_privado from public, anon, authenticated;

create table if not exists fmotos_privado.espacios (
  clave text primary key,
  revision bigint not null default 0 check (revision >= 0),
  datos jsonb not null check (jsonb_typeof(datos) = 'object'),
  base jsonb not null check (jsonb_typeof(base) = 'object'),
  modificado_en timestamptz not null default now()
);

create table if not exists fmotos_privado.miembros (
  espacio text not null references fmotos_privado.espacios(clave) on delete cascade,
  usuario uuid not null references auth.users(id) on delete cascade,
  primary key (espacio, usuario)
);

alter table fmotos_privado.espacios enable row level security;
alter table fmotos_privado.miembros enable row level security;
revoke all on all tables in schema fmotos_privado from public, anon, authenticated;

create or replace function fmotos_privado.verificar(p_espacio text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (
    select 1 from fmotos_privado.miembros where espacio = p_espacio and usuario = auth.uid()
  ) then
    raise exception 'Sin acceso al espacio de FMotos' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.fmotos_leer(p_espacio text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform fmotos_privado.verificar(p_espacio);
  return (select jsonb_build_object('revision', revision, 'datos', datos)
          from fmotos_privado.espacios where clave = p_espacio);
end;
$$;

create or replace function public.fmotos_guardar(p_espacio text, p_revision bigint, p_datos jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare resultado jsonb;
begin
  perform fmotos_privado.verificar(p_espacio);
  if p_datos is null or jsonb_typeof(p_datos) <> 'object' or octet_length(p_datos::text) > 10485760 or exists (
    select 1 from unnest(array['ventas','motos','repuestos','leads','clientes','movimientosRepuestos','mesesVentas']) as campos(nombre)
    where jsonb_typeof(p_datos -> campos.nombre) is distinct from 'array'
  ) then
    raise exception 'Estado no válido' using errcode = '22023';
  end if;
  update fmotos_privado.espacios set datos = p_datos, revision = revision + 1, modificado_en = now()
    where clave = p_espacio and revision = p_revision
    returning jsonb_build_object('revision', revision, 'datos', datos) into resultado;
  if not found then raise exception 'La revisión cambió' using errcode = '40001'; end if;
  return resultado;
end;
$$;

create or replace function public.fmotos_restaurar(p_espacio text, p_revision bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare resultado jsonb;
begin
  perform fmotos_privado.verificar(p_espacio);
  update fmotos_privado.espacios set datos = base, revision = revision + 1, modificado_en = now()
    where clave = p_espacio and revision = p_revision
    returning jsonb_build_object('revision', revision, 'datos', datos) into resultado;
  if not found then raise exception 'La revisión cambió' using errcode = '40001'; end if;
  return resultado;
end;
$$;

revoke all on function fmotos_privado.verificar(text) from public, anon, authenticated;
revoke all on function public.fmotos_leer(text), public.fmotos_guardar(text,bigint,jsonb), public.fmotos_restaurar(text,bigint) from public, anon, authenticated;
grant execute on function public.fmotos_leer(text), public.fmotos_guardar(text,bigint,jsonb), public.fmotos_restaurar(text,bigint) to authenticated;

commit;
