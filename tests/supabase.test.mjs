import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {PGlite} from '@electric-sql/pglite';

test('PostgreSQL: permisos, revisión concurrente y restauración de la base',async()=>{
  const db = new PGlite();
  const uid='11111111-1111-4111-8111-111111111111';
  const fuera='22222222-2222-4222-8222-222222222222';
  const base={ventas:[],leads:[],motos:[],repuestos:[],clientes:[],movimientosRepuestos:[],mesesVentas:[],corteInventario:'2026-11-04'};
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key, email text);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;`);
    await db.exec(await readFile(new URL('../supabase/migrations/202611200001_fmotos.sql',import.meta.url),'utf8'));
    await db.query("insert into auth.users (id,email) values ($1,'verificacion@ejemplo.com'),($2,'sin-acceso@ejemplo.com')",[uid,fuera]);
    await db.query("insert into fmotos_privado.espacios (clave, datos, base) values ('fmotos', $1::jsonb, $1::jsonb)",[JSON.stringify(base)]);
    const autorizar = await readFile(new URL('../supabase/autorizar-usuario.sql',import.meta.url),'utf8');
    await db.exec(autorizar.replace('cambiar@ejemplo.com','verificacion@ejemplo.com'));
    await db.exec('set role anon');
    await assert.rejects(db.query("select public.fmotos_leer('fmotos')"),{code:'42501'});
    await db.exec('set role authenticated');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[fuera]);
    await assert.rejects(db.query("select public.fmotos_leer('fmotos')"),{code:'42501'});
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);
    await assert.rejects(db.query('select * from fmotos_privado.espacios'),{code:'42501'});
    const ejecutar=async(funcion,parametros=[])=> (await db.query(`select public.fmotos_${funcion}('fmotos'${parametros.map((_,i)=>`,$${i+1}`).join('')}) as estado`,parametros)).rows[0].estado;
    assert.deepEqual(await ejecutar('leer'),{datos:base,revision:0});
    await assert.rejects(ejecutar('guardar',['0','{}']),{code:'22023'});
    const siguiente={...base,motos:[{id:'moto-prueba'}]};
    assert.deepEqual(await ejecutar('guardar',[0,JSON.stringify(siguiente)]),{datos:siguiente,revision:1});
    await assert.rejects(ejecutar('guardar',[0,JSON.stringify(base)]),{code:'40001'});
    assert.deepEqual(await ejecutar('restaurar',[1]),{datos:base,revision:2});
  } finally {await db.close();}
});
