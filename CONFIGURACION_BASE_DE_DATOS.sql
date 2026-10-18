-- Bellas Conecta · registro real de clientes · Supabase / PostgreSQL
-- Ejecutar UNA VEZ en SQL Editor, en un proyecto nuevo. Revisar antes de producción.
-- IMPORTANTE: nunca pegar una clave service_role o secret en el sitio GitHub Pages.

create table if not exists public.clientes (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null check (length(btrim(nombre)) between 3 and 100),
  rut text not null unique,
  telefono text not null check (telefono ~ '^\+569[0-9]{8}$'),
  email text not null,
  autoriza_promociones boolean not null default false,
  consentimiento_version text not null default '2026-10',
  creado_en timestamptz not null default now()
);

create table if not exists public.administradores (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- Verifica el dígito verificador del RUT chileno antes de guardar un perfil.
create or replace function public.rut_valido(valor text)
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  limpio text;
  cuerpo text;
  dv text;
  suma integer := 0;
  factor integer := 2;
  resto integer;
  requerido text;
  i integer;
begin
  limpio := upper(pg_catalog.regexp_replace(coalesce(valor,''),'[^0-9kK]','','g'));
  if limpio !~ '^[0-9]{1,8}[0-9K]$' then return false; end if;
  cuerpo := left(limpio,length(limpio)-1);
  dv := right(limpio,1);
  for i in reverse length(cuerpo)..1 loop
    suma := suma + pg_catalog.substring(cuerpo from i for 1)::integer * factor;
    factor := case when factor = 7 then 2 else factor + 1 end;
  end loop;
  resto := 11 - (suma % 11);
  requerido := case when resto = 11 then '0' when resto = 10 then 'K' else resto::text end;
  return dv = requerido;
end;
$$;

-- Un RUT almacenado se escribe sin puntos y con guion.
alter table public.clientes drop constraint if exists clientes_rut_valido;
alter table public.clientes add constraint clientes_rut_valido
  check (rut ~ '^[0-9]{1,8}-[0-9K]$' and public.rut_valido(rut));

-- Crea la ficha central cuando el usuario se registra con Auth.
-- El insert corre en el servidor incluso si debe confirmar el correo después.
create or replace function public.crear_ficha_cliente()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_nombre text;
  v_rut_raw text;
  v_rut text;
  v_telefono text;
  v_cuerpo text;
  v_dv text;
begin
  v_nombre := btrim(coalesce(new.raw_user_meta_data->>'nombre',''));
  v_rut_raw := new.raw_user_meta_data->>'rut';
  v_telefono := new.raw_user_meta_data->>'telefono';
  if length(v_nombre) not between 3 and 100 or not public.rut_valido(v_rut_raw) then
    raise exception 'Datos de registro invalidos';
  end if;
  if coalesce(v_telefono,'') !~ '^\+569[0-9]{8}$' then
    raise exception 'Telefono no valido';
  end if;
  if coalesce(new.raw_user_meta_data->>'consentimiento_version','') <> '2026-10' then
    raise exception 'Consentimiento no informado';
  end if;
  v_rut_raw := upper(pg_catalog.regexp_replace(v_rut_raw,'[^0-9kK]','','g'));
  v_cuerpo := left(v_rut_raw,length(v_rut_raw)-1);
  v_dv := right(v_rut_raw,1);
  v_rut := (v_cuerpo::bigint)::text || '-' || v_dv;
  insert into public.clientes (id,nombre,rut,telefono,email,autoriza_promociones,consentimiento_version)
  values (new.id,v_nombre,v_rut,v_telefono,new.email,
    coalesce((new.raw_user_meta_data->>'autoriza_promociones')::boolean,false),'2026-10');
  return new;
end;
$$;

-- Si la persona actualiza su correo mediante Auth, sincronizarlo en la ficha.
create or replace function public.actualizar_correo_cliente()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email is distinct from old.email then
    update public.clientes set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists bellas_crear_ficha on auth.users;
create trigger bellas_crear_ficha after insert on auth.users
for each row execute function public.crear_ficha_cliente();
drop trigger if exists bellas_actualizar_correo on auth.users;
create trigger bellas_actualizar_correo after update of email on auth.users
for each row execute function public.actualizar_correo_cliente();

-- Reglas de seguridad: usuarios solo ven su propia ficha; personal autorizado ve cartera.
create or replace function public.es_administrador()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.administradores a where a.user_id = (select auth.uid()));
$$;

alter table public.clientes enable row level security;
alter table public.administradores enable row level security;

drop policy if exists clientes_leer_propia_o_admin on public.clientes;
create policy clientes_leer_propia_o_admin on public.clientes
for select to authenticated using (id = (select auth.uid()) or (select public.es_administrador()));

drop policy if exists clientes_actualizar_propia on public.clientes;
create policy clientes_actualizar_propia on public.clientes
for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists administradores_ver_propia_fila on public.administradores;
create policy administradores_ver_propia_fila on public.administradores
for select to authenticated using (user_id = (select auth.uid()));

-- Revoca permisos amplios; solo lectura de fichas y edición de nombre/teléfono.
revoke all on public.clientes from anon,authenticated;
revoke all on public.administradores from anon,authenticated;
grant select on public.clientes to authenticated;
grant update (nombre,telefono) on public.clientes to authenticated;
grant select on public.administradores to authenticated;
revoke all on function public.es_administrador() from public;
grant execute on function public.es_administrador() to authenticated;
revoke all on function public.crear_ficha_cliente() from public;
revoke all on function public.actualizar_correo_cliente() from public;

-- Para permitir a una cuenta acceder a la cartera, crea primero su usuario
-- desde la aplicación. Luego ejecuta manualmente (con el correo real):
-- insert into public.administradores (user_id)
-- select id from auth.users where email = 'CORREO_ADMIN@EJEMPLO.CL'
-- on conflict (user_id) do nothing;
-- IMPORTANTE: no publiques esa instrucción con datos reales de administradores.
