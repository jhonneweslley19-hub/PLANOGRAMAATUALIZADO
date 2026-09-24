-- Migração: alias de login vira coluna real em public.profiles
-- Consultada pela Edge Function resolve-alias (supabase/functions/resolve-alias).
-- Idempotente, seguro rodar mais de uma vez.

alter table public.profiles add column if not exists alias text;

-- case-insensitive; NULL não conflita com NULL, cobre usuários sem alias ainda
create unique index if not exists profiles_alias_lower_idx on public.profiles (lower(alias));

update public.profiles set alias = 'admin' where email = 'admin@exemplo.com' and alias is null;
update public.profiles set alias = 'gerente' where email = 'gerente@exemplo.com' and alias is null;
update public.profiles set alias = 'repositor' where email = 'repositor@exemplo.com' and alias is null;

-- fallback pra qualquer outro usuário: parte antes do @ do e-mail
update public.profiles set alias = lower(split_part(email, '@', 1))
where alias is null;

-- handle_new_user() passa a gravar o alias enviado no signUp (options.data.alias)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, alias)
  values (
    new.id,
    new.email,
    'repositor',
    lower(coalesce(nullif(trim(new.raw_user_meta_data->>'alias'), ''), split_part(new.email, '@', 1)))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
