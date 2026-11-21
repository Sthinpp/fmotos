-- Crea primero el usuario en Authentication → Users.
-- Sustituye este correo antes de ejecutar el bloque en SQL Editor.
do $$
declare
  correo text := 'cambiar@ejemplo.com';
  miembro uuid;
begin
  select id into miembro from auth.users where lower(email) = lower(correo);
  if miembro is null then raise exception 'Primero crea el usuario indicado en Supabase Auth'; end if;
  insert into fmotos_privado.miembros(espacio, usuario) values ('fmotos', miembro)
    on conflict do nothing;
end $$;
