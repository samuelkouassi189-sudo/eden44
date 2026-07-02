# Groupe Scolaire Eden Providence — Site + Administration

Site officiel du Groupe Scolaire Eden Providence : vitrine publique
premium (accueil, présentation, formations, tarifs, galerie,
actualités, événements, contact) et espace administrateur complet
(contenus, collections, médias, paramètres, sécurité), connecté à
Supabase pour que les modifications de l'administrateur soient vues
par tous les visiteurs.

---

## 1) Contenu du projet

| Élément | Emplacement |
|---|---|
| Site public + admin (code) | `src/App.tsx`, `src/AdminPanel.tsx` |
| Connexion Supabase | `src/supabase.ts`, `src/cmsSync.ts` |
| Script SQL de la base de données | `supabase/schema.sql` |
| Étapes de secours pour Storage | `supabase/storage-policies.md` |
| Modèle des variables d'environnement | `.env.example` |

---

## 2) Installer et lancer en local

```bash
npm install
npm run dev
```

- Site public : `http://localhost:5173/`
- Administration : `http://localhost:5173/#/admin`
- Code d'accès admin par défaut : `1234567890` (à changer dans
  Paramètres > Sécurité une fois connecté)

---

## 3) Configurer la base de données Supabase

### A. Exécuter le script SQL

1. Crée ou ouvre ton projet sur [supabase.com](https://supabase.com).
2. Menu de gauche → **SQL Editor** → **New query**.
3. Copie tout le contenu de `supabase/schema.sql`, colle-le, clique
   **Run**.

Ce script crée automatiquement :
- la table `public.site_state` (état partagé du site, lu par tous
  les visiteurs et modifié par l'administrateur) ;
- les droits d'accès (GRANT) et les règles de sécurité (RLS) ;
- la ligne initiale `public-site` ;
- l'activation du temps réel (les changements sont vus sans recharger
  la page) ;
- le bucket de stockage `site-media` pour les photos/vidéos/documents ;
- **il tente aussi de créer automatiquement** les 4 règles d'accès du
  bucket. Si ton projet Supabase l'autorise, tout est fait, il ne te
  reste plus que les variables d'environnement à ajouter (étape 5).

### B. Si le script indique qu'il ne peut pas créer les règles du bucket

C'est une restriction normale de certains projets Supabase (la table
`storage.objects` appartient à un rôle interne). Dans ce cas, va dans
**Storage > site-media > Policies** et crée les 4 règles décrites dans
`supabase/storage-policies.md` (environ 2 minutes, 4 petits
formulaires à remplir).

### C. Vérifier que tout est en place

Dans **SQL Editor**, lance séparément :

```sql
select * from public.site_state;
```

Tu dois voir une ligne avec `id = 'public-site'`.

```sql
select policyname from pg_policies where tablename = 'objects' and schemaname = 'storage';
```

Tu dois voir 4 lignes (les 4 règles du bucket), qu'elles aient été
créées automatiquement par le script ou manuellement via l'interface.

### D. Récupérer les clés du projet

**Project Settings > API** :
- **Project URL** → variable `VITE_SUPABASE_URL`
- **anon / publishable key** → variable `VITE_SUPABASE_ANON_KEY`

⚠️ Ne jamais utiliser la clé `service_role` / `secret` dans ce projet
(elle ne doit jamais apparaître côté site).

---

## 4) Variables d'environnement

Crée un fichier `.env.local` en local (jamais poussé sur GitHub, déjà
protégé par `.gitignore`), sur le modèle de `.env.example` :

```env
VITE_SUPABASE_URL=https://ton-projet.supabase.co
VITE_SUPABASE_ANON_KEY=ta_cle_publishable
VITE_SUPABASE_BUCKET=site-media
VITE_SITE_STATE_ID=public-site
```

Les mêmes 4 variables doivent être ajoutées dans **Vercel > Settings >
Environment Variables** (Production, Preview, Development) avant ou
après l'import du projet.

⚠️ Après tout ajout/modification de variable sur Vercel, il faut
toujours refaire un déploiement : **Deployments > ... > Redeploy**
(les variables ne s'appliquent jamais à un build déjà existant).

---

## 5) Déployer

### GitHub

```bash
git init
git add .
git commit -m "Site Eden Providence"
git branch -M main
git remote add origin https://github.com/TON-COMPTE/TON-DEPOT.git
git push -u origin main
```

### Vercel

1. [vercel.com](https://vercel.com) → **Add New** → **Project** →
   importe le dépôt GitHub.
2. Ajoute les 4 variables d'environnement (voir section 4).
3. Clique **Deploy**.

---

## 6) Vérifier que les modifications admin sont vues par tout le monde

1. Ouvre `ton-site.vercel.app/#/admin`, connecte-toi.
2. Onglet **Sécurité** (ou badge en haut) → clique **"Tester la
   connexion Supabase"**. Le message doit confirmer une connexion
   réussie.
3. Modifie ou supprime un élément (Collections ou Médias).
4. Attends 5 à 10 secondes (sauvegarde automatique).
5. Ouvre le site public dans un autre navigateur ou en navigation
   privée : le changement doit être visible.

Si le test de connexion échoue, le message affiché indique
précisément la cause (variable manquante, URL incorrecte, clé refusée,
table introuvable...).

---

## 7) Sécurité

- Le code administrateur est stocké sous forme de hachage (jamais en
  clair) et modifiable depuis Paramètres > Sécurité.
- Seule la clé publique Supabase (`anon` / `publishable`) est utilisée
  côté site : jamais la clé secrète.
- Les règles d'accès actuelles (RLS) sont volontairement ouvertes en
  lecture/écriture pour permettre le fonctionnement de l'administration
  sans backend serveur dédié. Pour un usage en production avec
  plusieurs administrateurs, prévoir une authentification Supabase
  réelle et des règles plus restrictives.
