# Guide très simple — Étape par étape

Ce guide est écrit comme si tu n'avais jamais fait ça de ta vie.
Suis chaque étape dans l'ordre. Ne saute rien.

---

## PARTIE 1 — SUPABASE (la base de données)

### Étape 1 — Ouvrir ton projet Supabase

1. Va sur https://supabase.com
2. Connecte-toi
3. Clique sur ton projet dont l'adresse commence par :
   `https://quozdflhaswesohghehx.supabase.co`

### Étape 2 — Ouvrir l'endroit où on écrit du SQL

1. Sur la gauche de l'écran, tu vois une liste de menus
2. Clique sur **SQL Editor**
3. Clique sur le bouton **New query** (nouvelle requête)
4. Une case vide et noire apparaît : c'est là qu'on va écrire

### Étape 3 — Copier le grand script

1. Sélectionne TOUT le texte ci-dessous (du mot `create` jusqu'à la
   toute dernière ligne)
2. Copie-le (Ctrl+C ou clic droit → Copier)
3. Colle-le (Ctrl+V) dans la case noire de Supabase

```sql
create extension if not exists pgcrypto;

create table if not exists public.site_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_state enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.site_state to anon, authenticated;

drop policy if exists "Public can read site_state" on public.site_state;
drop policy if exists "Public can write site_state" on public.site_state;
drop policy if exists "Public can update site_state" on public.site_state;
drop policy if exists "Public can delete site_state" on public.site_state;

create policy "Public can read site_state" on public.site_state
for select to anon, authenticated using (true);

create policy "Public can write site_state" on public.site_state
for insert to anon, authenticated with check (true);

create policy "Public can update site_state" on public.site_state
for update to anon, authenticated using (true) with check (true);

create policy "Public can delete site_state" on public.site_state
for delete to anon, authenticated using (true);

insert into public.site_state (id, data)
values ('public-site', '{}'::jsonb)
on conflict (id) do nothing;

do $$
begin
  alter publication supabase_realtime add table public.site_state;
exception
  when duplicate_object then null;
end;
$$;

insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do update set public = true;
```

### Étape 4 — Lancer le script

1. Cherche un bouton **Run** (généralement en bas à droite, ou
   raccourci **Ctrl + Entrée**)
2. Clique dessus
3. Attends 2-3 secondes
4. En bas, tu dois voir un message qui dit que ça a réussi (pas de
   texte rouge)

### Étape 5 — Vérifier que ça a marché

1. Clique encore sur **New query** (une case vide toute neuve)
2. Colle ceci :
   ```sql
   select * from public.site_state;
   ```
3. Clique sur **Run**
4. Tu dois voir apparaître **une ligne** avec écrit `public-site` dedans

Si tu vois cette ligne : **c'est gagné, la base est prête.**

---

## PARTIE 2 — LES DROITS SUR LES PHOTOS/VIDÉOS (Storage)

Cette partie ne peut pas se faire avec du SQL, il faut cliquer dans
les menus.

### Étape 1 — Ouvrir Storage

1. Sur la gauche, clique sur **Storage**
2. Tu dois voir une case appelée **site-media**
3. Clique dessus

### Étape 2 — Ouvrir les règles (Policies)

1. En haut de la page, clique sur **Policies**
2. Clique sur **New policy**
3. Choisis l'option **Create a policy from scratch** (créer depuis
   zéro)

### Étape 3 — Créer 4 règles, une par une

Pour chaque règle, tu dois remplir un petit formulaire, cliquer
**Save**, puis recommencer pour la suivante.

**Règle 1 — pour REGARDER les photos/vidéos**
- Nom : `Public read site-media`
- Type d'action (Operation) : coche **SELECT**
- Qui peut le faire (Target roles) : `anon` et `authenticated`
- Dans la case de condition, écris :
  ```
  bucket_id = 'site-media'
  ```
- Clique **Save**

**Règle 2 — pour AJOUTER des photos/vidéos**
- Nom : `Public upload site-media`
- Operation : coche **INSERT**
- Target roles : `anon` et `authenticated`
- Condition :
  ```
  bucket_id = 'site-media'
  ```
- Clique **Save**

**Règle 3 — pour REMPLACER un média**
- Nom : `Public update site-media`
- Operation : coche **UPDATE**
- Target roles : `anon` et `authenticated`
- Condition (mets-la dans les deux cases si elles existent) :
  ```
  bucket_id = 'site-media'
  ```
- Clique **Save**

**Règle 4 — pour SUPPRIMER un média**
- Nom : `Public delete site-media`
- Operation : coche **DELETE**
- Target roles : `anon` et `authenticated`
- Condition :
  ```
  bucket_id = 'site-media'
  ```
- Clique **Save**

Une fois les 4 règles créées, cette partie est terminée.

---

## PARTIE 3 — RÉCUPÉRER TES CLÉS (déjà connues, à vérifier)

1. Sur la gauche, clique sur **Project Settings** (roue crantée en bas)
2. Clique sur **API**
3. Vérifie que tu vois bien :
   - **Project URL** = `https://quozdflhaswesohghehx.supabase.co`
   - **anon / publishable key** = `sb_publishable_Zns2BRUIGkjB4gRCmLHOSQ_Nl0lngmf`

Si c'est différent de ce qui est écrit ici, utilise ce que TU vois
réellement à l'écran (pas ce qui est écrit dans ce guide).

---

## PARTIE 4 — METTRE LE PROJET SUR GITHUB

### Étape 1 — Créer un compte / dépôt (si pas déjà fait)

1. Va sur https://github.com
2. Connecte-toi
3. Clique sur **New repository** (nouveau dépôt)
4. Donne un nom, par exemple : `eden-providence-site`
5. Ne coche PAS "Add a README"
6. Clique **Create repository**

### Étape 2 — Envoyer les fichiers du projet

**Si tu utilises le terminal (Git installé) :**

```bash
git init
git add .
git commit -m "Site Eden Providence"
git branch -M main
git remote add origin https://github.com/TON-COMPTE/eden-providence-site.git
git push -u origin main
```

**Si tu préfères sans terminal :**

1. Sur la page de ton dépôt GitHub, clique **Add file**
2. Clique **Upload files**
3. Glisse tous les fichiers et dossiers du projet téléchargé (sauf le
   dossier `node_modules` s'il existe, et sauf tout fichier `.env`)
4. En bas, écris un message, par exemple : "Premier envoi"
5. Clique **Commit changes**

---

## PARTIE 5 — DÉPLOYER SUR VERCEL

### Étape 1 — Importer le projet

1. Va sur https://vercel.com
2. Connecte-toi avec le **même compte GitHub**
3. Clique **Add New** → **Project**
4. Choisis ton dépôt `eden-providence-site`
5. Clique **Import**

### Étape 2 — Ajouter les 4 variables

Avant de cliquer sur le gros bouton "Deploy", cherche la section
**Environment Variables**. Ajoute une par une, en cliquant sur
**Add** après chacune :

| Nom à écrire | Valeur à écrire |
|---|---|
| `VITE_SUPABASE_URL` | `https://quozdflhaswesohghehx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_Zns2BRUIGkjB4gRCmLHOSQ_Nl0lngmf` |
| `VITE_SUPABASE_BUCKET` | `site-media` |
| `VITE_SITE_STATE_ID` | `public-site` |

⚠️ Ne mets pas d'espace avant ou après les valeurs.

### Étape 3 — Déployer

1. Clique sur le bouton **Deploy**
2. Attends 1 à 2 minutes
3. Clique sur le lien de ton site quand c'est fini

### Étape 4 — Si tu changes une variable plus tard

Il faut TOUJOURS refaire ceci après :
1. Va dans l'onglet **Deployments**
2. Clique sur les trois petits points **...** à côté du dernier
   déploiement
3. Clique **Redeploy**

---

## PARTIE 6 — VÉRIFIER QUE ÇA MARCHE

1. Ouvre ton site : `ton-nom-de-projet.vercel.app`
2. À la fin de l'adresse, ajoute `#/admin`
   (exemple : `ton-site.vercel.app/#/admin`)
3. Connecte-toi avec le code : `1234567890`
4. Cherche le bouton **"Tester la connexion"** (en haut de l'écran ou
   dans la section **Sécurité**)
5. Clique dessus
6. Regarde le message qui apparaît

- Si le message dit que la connexion a réussi → tout fonctionne, tu
  peux modifier des choses dans l'admin et elles seront vues par tout
  le monde.
- Si le message affiche une erreur → copie-le entièrement et
  montre-le-moi, il expliquera précisément ce qui ne va pas.

---

## Résumé en une phrase par étape

1. Copier-coller le grand script SQL dans Supabase → Run
2. Vérifier avec `select * from public.site_state;`
3. Créer les 4 règles de Storage à la main dans l'interface
4. Vérifier les clés dans Project Settings → API
5. Envoyer le projet sur GitHub
6. Importer sur Vercel + ajouter les 4 variables + Deploy
7. Tester avec le bouton "Tester la connexion" dans l'admin
