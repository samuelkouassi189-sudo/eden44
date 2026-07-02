# Policies du bucket "site-media" — à faire via l'interface Supabase

## Pourquoi via l'interface et pas en SQL ?

La table `storage.objects` appartient à un rôle interne de Supabase
(`supabase_storage_admin`), pas à `postgres`. C'est pourquoi l'exécution
de `CREATE POLICY ... ON storage.objects` dans le SQL Editor renvoie
l'erreur :

```
ERROR: 42501: must be owner of table objects
```

Ce n'est pas une erreur de configuration de ta part : c'est une
restriction volontaire de Supabase. La solution officielle est de
créer ces policies depuis l'interface graphique.

## Étapes exactes

1. Dans le menu de gauche Supabase, clique sur **Storage**.
2. Clique sur le bucket **site-media** (créé automatiquement par le
   script `schema.sql`). S'il n'existe pas encore, exécute d'abord
   `supabase/schema.sql`.
3. Clique sur l'onglet **Policies** (en haut de la page du bucket).
4. Clique sur **New policy**.
5. Choisis **"Create a policy from scratch"** (ou "For full
   customization" selon la version de l'interface).

Crée les **4 policies suivantes**, une par une :

### Policy 1 — Lecture publique

- **Policy name** : `Public read site-media`
- **Allowed operation** : `SELECT`
- **Target roles** : `anon`, `authenticated`
- **USING expression** :
  ```sql
  bucket_id = 'site-media'
  ```

### Policy 2 — Upload (import de photos/vidéos/documents)

- **Policy name** : `Public upload site-media`
- **Allowed operation** : `INSERT`
- **Target roles** : `anon`, `authenticated`
- **WITH CHECK expression** :
  ```sql
  bucket_id = 'site-media'
  ```

### Policy 3 — Remplacement d'un média existant

- **Policy name** : `Public update site-media`
- **Allowed operation** : `UPDATE`
- **Target roles** : `anon`, `authenticated`
- **USING expression** :
  ```sql
  bucket_id = 'site-media'
  ```
- **WITH CHECK expression** :
  ```sql
  bucket_id = 'site-media'
  ```

### Policy 4 — Suppression d'un média

- **Policy name** : `Public delete site-media`
- **Allowed operation** : `DELETE`
- **Target roles** : `anon`, `authenticated`
- **USING expression** :
  ```sql
  bucket_id = 'site-media'
  ```

Clique sur **Save** (ou **Review** puis **Save policy**) après chacune.

## Vérification

Une fois les 4 policies créées, retourne dans **SQL Editor** et lance :

```sql
select * from storage.buckets where id = 'site-media';
```

Tu dois voir une ligne avec `public = true`.

Ensuite, dans l'admin du site (`#/admin`), utilise le bouton
**"Tester la connexion Supabase"** (onglet Sécurité) pour confirmer
que tout fonctionne de bout en bout.
