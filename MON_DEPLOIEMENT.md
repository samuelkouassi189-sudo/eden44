# Mon déploiement personnalisé — Groupe Scolaire Eden Providence

Ce document est pré-rempli avec TES informations Supabase actuelles,
pour éviter toute erreur de copier-coller. Suis-le dans l'ordre, sans
sauter d'étape.

---

## Tes informations actuelles

- **Projet Supabase (URL correcte à utiliser)** :
  `https://quozdflhaswesohghehx.supabase.co`
- **Clé publique (anon / publishable) à utiliser** :
  `sb_publishable_Zns2BRUIGkjB4gRCmLHOSQ_Nl0lngmf`

⚠️ Cette clé publique n'est **pas secrète** par nature (elle est faite
pour être visible côté site), donc pas de souci à la voir écrite ici.
Ce qu'il ne faut **jamais** partager, c'est la clé qui commence par
`sb_secret_...`.

---

## ÉTAPE 1 — Exécuter le SQL sur CE projet précis

1. Va sur [supabase.com](https://supabase.com) → ouvre le projet dont
   l'URL est `https://quozdflhaswesohghehx.supabase.co`.
   (Vérifie bien que c'est CE projet-là, pas un autre créé avant.)
2. Menu de gauche → **SQL Editor** → **New query**.
3. Copie-colle EXACTEMENT le script ci-dessous (identique au fichier
   `supabase/schema.sql` du projet) :

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

4. Clique sur **Run**.
5. Résultat attendu : pas de message rouge d'erreur (un simple
   "Success" en bas suffit).

### Vérification immédiate (obligatoire)

Toujours dans SQL Editor, lance séparément :

```sql
select * from public.site_state;
```

Tu dois voir **une ligne** avec `id = 'public-site'`. Si tu ne vois
rien ou une erreur, le SQL n'a pas été exécuté correctement sur ce
projet — recommence l'étape 1.

---

## ÉTAPE 2 — Créer les 4 policies du bucket (obligatoire pour les médias)

Cette étape ne peut **pas** se faire en SQL (Supabase l'interdit
volontairement). Il faut passer par l'interface :

1. Menu de gauche → **Storage**.
2. Clique sur le bucket **site-media** (créé à l'étape 1).
3. Onglet **Policies** en haut de la page.
4. Clique **New policy** → **Create a policy from scratch**.

Crée ces 4 policies, une par une (clique **Save** après chacune) :

| # | Name | Operation | Roles | Expression |
|---|---|---|---|---|
| 1 | Public read site-media | SELECT | anon, authenticated | `bucket_id = 'site-media'` (USING) |
| 2 | Public upload site-media | INSERT | anon, authenticated | `bucket_id = 'site-media'` (WITH CHECK) |
| 3 | Public update site-media | UPDATE | anon, authenticated | `bucket_id = 'site-media'` (USING **et** WITH CHECK) |
| 4 | Public delete site-media | DELETE | anon, authenticated | `bucket_id = 'site-media'` (USING) |

### Vérification

Retourne dans **SQL Editor** :

```sql
select * from storage.buckets where id = 'site-media';
```

Tu dois voir une ligne avec `public = true`.

---

## ÉTAPE 3 — Vérifier que ta clé correspond bien à CE projet

1. Dans Supabase, va dans **Project Settings** → **API** (ou **API Keys**).
2. Vérifie que la ligne **Project URL** affiche bien :
   `https://quozdflhaswesohghehx.supabase.co`
3. Vérifie que la clé **publishable** affichée est bien :
   `sb_publishable_Zns2BRUIGkjB4gRCmLHOSQ_Nl0lngmf`

Si l'une des deux valeurs est différente de ce que tu as mis dans
Vercel, c'est la cause du problème : il faut que ce soit **exactement**
les mêmes des deux côtés.

---

## ÉTAPE 4 — Mettre à jour Vercel avec ces valeurs exactes

1. Va sur ton projet Vercel → **Settings** → **Environment Variables**.
2. Vérifie/mets à jour ces 4 variables (sur **Production**, **Preview**
   et **Development**) :

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://quozdflhaswesohghehx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_Zns2BRUIGkjB4gRCmLHOSQ_Nl0lngmf` |
| `VITE_SUPABASE_BUCKET` | `site-media` |
| `VITE_SITE_STATE_ID` | `public-site` |

⚠️ Copie ces valeurs **caractère par caractère**, sans espace avant ou
après (une erreur fréquente est un espace collé par accident).

3. Clique **Save** sur chaque variable si tu les modifies.

---

## ÉTAPE 5 — Redéployer (obligatoire après tout changement de variable)

1. Va dans l'onglet **Deployments**.
2. Clique sur les **...** du dernier déploiement.
3. Clique sur **Redeploy**.
4. Attends la fin du build (1-2 minutes).

Les variables d'environnement ne s'appliquent **jamais** à un
déploiement déjà existant : il faut toujours redéployer après un
changement.

---

## ÉTAPE 6 — Tester avec le diagnostic intégré

1. Ouvre `ton-site.vercel.app/#/admin`.
2. Connecte-toi (code par défaut : `1234567890`).
3. En haut de l'écran ou dans l'onglet **Sécurité**, clique sur
   **"Tester la connexion Supabase"**.

Le message affiché te dira maintenant précisément :
- si les variables sont bien détectées ;
- si la clé est refusée (mauvais projet) ;
- si la table est introuvable (SQL pas exécuté sur ce projet) ;
- ou si tout fonctionne, avec la date de dernière mise à jour.

**Copie-moi ce message exact** s'il indique encore une erreur — avec
ce diagnostic précis, la cause sera identifiable immédiatement.

---

## ÉTAPE 7 — Vérifier que tout le monde voit les changements

1. Dans `#/admin`, modifie ou supprime un élément (Collections ou
   Médias).
2. Attends 5 à 10 secondes (sauvegarde automatique).
3. Ouvre le site public dans un **autre navigateur** ou en navigation
   privée.
4. Le changement doit être visible immédiatement.

---

## Récapitulatif ultra-court

1. SQL exécuté sur `quozdflhaswesohghehx` ✅
2. 4 policies Storage créées via l'interface ✅
3. Variables Vercel = valeurs exactes ci-dessus ✅
4. Redeploy fait après le changement de variables ✅
5. "Tester la connexion" → message positif ✅
6. Modification admin visible ailleurs ✅
