-- =========================================================
-- GROUPE SCOLAIRE EDEN PROVIDENCE
-- SCRIPT SQL — BASE DE DONNÉES PARTAGÉE DU SITE
-- =========================================================
-- Ce script peut être exécuté plusieurs fois sans erreur.
-- Colle TOUT ce fichier dans Supabase > SQL Editor > Run.
--
-- IMPORTANT : ce script ne contient QUE la partie base de
-- données (table site_state) + la création du bucket Storage.
-- Les policies du bucket "site-media" doivent être créées
-- séparément depuis l'interface Supabase (Storage > Policies),
-- car PostgreSQL interdit de modifier storage.objects en SQL
-- direct (erreur "must be owner of table objects").
-- Suis le fichier supabase/storage-policies.md pour cette étape.
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

-- Active la sécurité au niveau des lignes (obligatoire pour définir des policies)
alter table public.site_state enable row level security;

-- ---------------------------------------------------------
-- IMPORTANT : les policies RLS ne suffisent pas à elles seules.
-- Il faut AUSSI donner les droits de base sur la table
-- aux rôles utilisés par le frontend (anon = visiteur public,
-- authenticated = utilisateur connecté). Sans ce GRANT, même
-- une policy "using (true)" peut être bloquée silencieusement.
-- ---------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.site_state to anon, authenticated;

-- Nettoyage complet des anciennes policies (si elles existent déjà)
drop policy if exists "Public can read site_state" on public.site_state;
drop policy if exists "Public can write site_state" on public.site_state;
drop policy if exists "Public can update site_state" on public.site_state;
drop policy if exists "Public can delete site_state" on public.site_state;

-- Lecture publique (le site public doit pouvoir lire le contenu)
create policy "Public can read site_state"
on public.site_state
for select
to anon, authenticated
using (true);

-- Création (upsert) depuis l'admin
create policy "Public can write site_state"
on public.site_state
for insert
to anon, authenticated
with check (true);

-- Mise à jour (c'est la policy la plus importante pour les suppressions
-- et les modifications faites depuis l'admin)
create policy "Public can update site_state"
on public.site_state
for update
to anon, authenticated
using (true)
with check (true);

-- Suppression (au cas où une ligne devrait être supprimée un jour)
create policy "Public can delete site_state"
on public.site_state
for delete
to anon, authenticated
using (true);

-- Ligne initiale obligatoire : le frontend lit toujours l'id 'public-site'
insert into public.site_state (id, data)
values ('public-site', '{}'::jsonb)
on conflict (id) do nothing;

-- Ajout à la publication realtime (pour que les autres visiteurs
-- reçoivent les mises à jour instantanément sans recharger la page)
do $$
begin
  alter publication supabase_realtime add table public.site_state;
exception
  when duplicate_object then
    null;
end;
$$;

-- =========================================================
-- 2) STORAGE : création du bucket (sans les policies)
-- =========================================================
-- La création du bucket lui-même fonctionne en SQL.
-- Les POLICIES du bucket doivent être ajoutées ensuite via
-- l'interface Supabase : voir supabase/storage-policies.md
-- =========================================================

insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do update set public = true;

-- =========================================================
-- 3) VÉRIFICATION RAPIDE (facultatif)
-- =========================================================
-- Après exécution, lance ces lignes séparément pour vérifier :
--
-- select * from public.site_state;
-- select * from storage.buckets where id = 'site-media';
-- =========================================================
