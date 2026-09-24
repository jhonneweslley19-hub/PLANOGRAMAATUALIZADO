-- RLS (Row Level Security) — Sistema de Planograma
-- Idempotente, seguro rodar de novo.
-- Rodar: painel do Supabase → SQL Editor → New query → colar → Run.

-- 0. Cleanup de policies antigas baseadas em comparação de e-mail
drop policy if exists "escrita so admin" on public.departamentos;
drop policy if exists "escrita so admin subs" on public.submercadologicos;
drop policy if exists "leitura logados" on public.departamentos;
drop policy if exists "leitura logados subs" on public.submercadologicos;
drop policy if exists "delete layouts admin" on storage.objects;
drop policy if exists "update layouts admin" on storage.objects;
drop policy if exists "upload layouts admin" on storage.objects;

-- 1. profiles: fonte de verdade do papel admin/repositor
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'repositor' check (role in ('admin','repositor'))
);
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();

-- 2. Popula com os usuários já existentes no Auth
insert into public.profiles (id, email, role)
select
  u.id,
  u.email,
  case
    when u.email in ('admin@exemplo.com', 'gerente@exemplo.com') then 'admin'
    else 'repositor'
  end
from auth.users u
on conflict (id) do update set email = excluded.email, role = excluded.role;

alter table public.profiles alter column email set not null;

-- 3. Trigger: todo usuário novo do Auth ganha uma linha em profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'repositor')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- SECURITY DEFINER pra checar admin sem recursão de policy
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- 4. RLS
alter table public.departamentos enable row level security;
alter table public.submercadologicos enable row level security;
alter table public.profiles enable row level security;

-- 5. Policies — departamentos / submercadologicos
drop policy if exists "leitura autenticada" on public.departamentos;
create policy "leitura autenticada" on public.departamentos
  for select using (auth.role() = 'authenticated');

drop policy if exists "leitura autenticada" on public.submercadologicos;
create policy "leitura autenticada" on public.submercadologicos
  for select using (auth.role() = 'authenticated');

drop policy if exists "somente admin escreve" on public.departamentos;
create policy "somente admin escreve" on public.departamentos
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "somente admin escreve" on public.submercadologicos;
create policy "somente admin escreve" on public.submercadologicos
  for all using (public.is_admin()) with check (public.is_admin());

-- Policies — profiles
drop policy if exists "le o proprio perfil" on public.profiles;
create policy "le o proprio perfil" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "admin le todos os perfis" on public.profiles;
create policy "admin le todos os perfis" on public.profiles
  for select using (public.is_admin());

drop policy if exists "admin atualiza perfis" on public.profiles;
create policy "admin atualiza perfis" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- 6. Storage — bucket "layouts"
drop policy if exists "leitura publica layouts" on storage.objects;
drop policy if exists "leitura layouts" on storage.objects;
create policy "leitura layouts" on storage.objects
  for select using (bucket_id = 'layouts');

drop policy if exists "admin sobe layouts" on storage.objects;
create policy "admin sobe layouts" on storage.objects
  for insert with check (bucket_id = 'layouts' and public.is_admin());

drop policy if exists "admin atualiza layouts" on storage.objects;
create policy "admin atualiza layouts" on storage.objects
  for update using (bucket_id = 'layouts' and public.is_admin());

drop policy if exists "admin remove layouts" on storage.objects;
create policy "admin remove layouts" on storage.objects
  for delete using (bucket_id = 'layouts' and public.is_admin());

-- 7. EXECUTE das SECURITY DEFINER restrito ao mínimo necessário
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Promover um admin novo, se precisar:
--   update public.profiles set role = 'admin' where email = 'novo@email.com';
