-- =========================================================
-- GROUPE SCOLAIRE EDEN PROVIDENCE
-- SCRIPT SQL COMPLET — BASE DE DONNÉES + STORAGE
-- =========================================================
-- Colle TOUT ce fichier dans Supabase > SQL Editor > Run.
-- Ce script peut être exécuté plusieurs fois sans erreur.
--
-- Ce script tente de tout faire automatiquement, y compris les
-- policies du bucket de médias. Sur certains projets Supabase,
-- la création de policies sur storage.objects est restreinte au
-- rôle interne "supabase_storage_admin" (erreur "must be owner of
-- table objects"). Le script détecte ce cas et continue sans
-- planter : si besoin, termine alors les 4 dernières policies en
-- 2 minutes via l'interface (voir supabase/storage-policies.md).
-- =========================================================

create extension if not exists pgcrypto;

-- =========================================================
-- 1) TABLE PARTAGÉE DU SITE (site_state)
-- =========================================================

create table if not exists public.site_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_state enable row level security;

-- Les policies RLS ne suffisent pas seules : il faut aussi les
-- droits de base (GRANT) pour les rôles utilisés par le frontend.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.site_state to anon, authenticated;

drop policy if exists "Public can read site_state" on public.site_state;
drop policy if exists "Public can write site_state" on public.site_state;
drop policy if exists "Public can update site_state" on public.site_state;
drop policy if exists "Public can delete site_state" on public.site_state;

create policy "Public can read site_state"
on public.site_state for select
to anon, authenticated
using (true);

create policy "Public can write site_state"
on public.site_state for insert
to anon, authenticated
with check (true);

create policy "Public can update site_state"
on public.site_state for update
to anon, authenticated
using (true) with check (true);

create policy "Public can delete site_state"
on public.site_state for delete
to anon, authenticated
using (true);

-- Ligne initiale obligatoire : le frontend lit toujours l'id 'public-site'
insert into public.site_state (id, data)
values ('public-site', '{}'::jsonb)
on conflict (id) do nothing;

-- Active le temps réel pour que les changements soient vus par
-- tout le monde instantanément, sans recharger la page.
do $$
begin
  alter publication supabase_realtime add table public.site_state;
exception
  when duplicate_object then
    null;
end;
$$;

-- =========================================================
-- 2) STORAGE : bucket pour les photos, vidéos et documents
-- =========================================================

insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do update set public = true;

-- =========================================================
-- 3) STORAGE : tentative automatique des policies
-- =========================================================
-- Si ton projet autorise la modification de storage.objects en
-- SQL, ces 4 policies seront créées automatiquement et il ne te
-- restera plus rien à faire manuellement.
-- Si ton projet le refuse (message "privilèges insuffisants" dans
-- les résultats ci-dessous, sans faire planter le script), va dans
-- Storage > site-media > Policies et crée les 4 policies décrites
-- dans supabase/storage-policies.md (2 minutes, 4 formulaires).
-- =========================================================

do $$
begin
  execute 'drop policy if exists "Public can read site-media" on storage.objects';
  execute $p$create policy "Public can read site-media" on storage.objects for select to anon, authenticated using (bucket_id = 'site-media')$p$;

  execute 'drop policy if exists "Public can upload site-media" on storage.objects';
  execute $p$create policy "Public can upload site-media" on storage.objects for insert to anon, authenticated with check (bucket_id = 'site-media')$p$;

  execute 'drop policy if exists "Public can update site-media" on storage.objects';
  execute $p$create policy "Public can update site-media" on storage.objects for update to anon, authenticated using (bucket_id = 'site-media') with check (bucket_id = 'site-media')$p$;

  execute 'drop policy if exists "Public can delete site-media" on storage.objects';
  execute $p$create policy "Public can delete site-media" on storage.objects for delete to anon, authenticated using (bucket_id = 'site-media')$p$;

  raise notice 'SUCCÈS : les 4 policies du bucket site-media ont été créées automatiquement. Aucune action manuelle nécessaire.';
exception
  when insufficient_privilege then
    raise notice 'INFO : ce projet Supabase ne permet pas de créer les policies de storage.objects en SQL (restriction normale de Supabase). Termine cette étape via Storage > site-media > Policies en suivant supabase/storage-policies.md (2 minutes, 4 formulaires).';
end;
$$;

-- =========================================================
-- 4) VÉRIFICATION RAPIDE (facultatif)
-- =========================================================
-- Lance ces lignes séparément pour vérifier que tout est en place :
--
-- select * from public.site_state;
-- select * from storage.buckets where id = 'site-media';
-- select policyname from pg_policies where tablename = 'objects' and schemaname = 'storage';
-- =========================================================
