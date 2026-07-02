# Déploiement final — Groupe Scolaire Eden Providence

Ce document regroupe TOUTES les étapes, dans l'ordre, pour :
1. récupérer le projet ;
2. créer une base de données Supabase fonctionnelle ;
3. envoyer le projet sur GitHub ;
4. déployer sur Vercel avec les bonnes variables ;
5. vérifier que les modifications faites par l'administrateur sont
   bien visibles par tout le monde.

---

## ÉTAPE 1 — Récupérer le projet

Le projet est déjà présent dans ton espace de travail. Pour le
télécharger sur ton ordinateur, utilise l'option d'export/téléchargement
de ton outil (bouton "Download" / "Export project" selon l'interface
que tu utilises). Décompresse-le ensuite dans un dossier clair, par
exemple :

```
eden-providence-website
```

Fichiers importants à connaître dans ce dossier :

| Fichier | Rôle |
|---|---|
| `supabase/schema.sql` | Script SQL de la base de données (à coller dans Supabase) |
| `supabase/storage-policies.md` | Étapes pour activer l'upload de médias (via interface, pas SQL) |
| `.env.example` | Modèle des variables à configurer |
| `src/App.tsx` | Site public |
| `src/AdminPanel.tsx` | Espace administrateur |
| `src/supabase.ts` / `src/cmsSync.ts` | Connexion technique à Supabase |

---

## ÉTAPE 2 — Créer la base de données Supabase

### A. Créer le projet (si pas déjà fait)

1. Va sur [supabase.com](https://supabase.com) et connecte-toi.
2. Clique sur **New project**.
3. Donne un nom, choisis un mot de passe de base de données, valide.
4. Attends la fin de la création (1-2 minutes).

### B. Exécuter le script SQL

1. Menu de gauche → **SQL Editor** → **New query**.
2. Ouvre le fichier `supabase/schema.sql` du projet.
3. Copie tout son contenu, colle-le dans l'éditeur.
4. Clique sur **Run**.

Résultat attendu : pas d'erreur rouge. Ce script crée :
- la table `public.site_state` (état partagé du site) ;
- les droits d'accès (GRANT) et les policies de sécurité (RLS) ;
- la ligne initiale `public-site` ;
- l'activation du temps réel (realtime) ;
- le bucket de stockage `site-media`.

### C. Activer les policies du bucket (obligatoire pour les médias)

Cette étape ne peut **pas** se faire en SQL (restriction Supabase).
Suis exactement le fichier `supabase/storage-policies.md` du projet :
il explique comment créer les 4 policies (lecture, upload,
remplacement, suppression) depuis **Storage → site-media → Policies**.

### D. Récupérer les clés du projet

1. Menu de gauche → **Project Settings** → **API**.
2. Note :
   - **Project URL** (ex : `https://xxxxxxxx.supabase.co`)
   - **anon / publishable key** (commence par `sb_publishable_...` ou `eyJ...`)

⚠️ Ne récupère **jamais** la `service_role` / `secret` key pour ce
projet : elle ne doit jamais être utilisée côté site.

---

## ÉTAPE 3 — Configurer le projet en local (optionnel mais recommandé)

À la racine du projet, crée un fichier `.env.local` :

```env
VITE_SUPABASE_URL=https://TON-PROJET.supabase.co
VITE_SUPABASE_ANON_KEY=ta_cle_publishable
VITE_SUPABASE_BUCKET=site-media
VITE_SITE_STATE_ID=public-site
```

Puis teste :

```bash
npm install
npm run dev
```

Ouvre le site (`http://localhost:5173`), puis `#/admin` (code par
défaut : `1234567890`). Dans **Sécurité**, clique sur **"Tester la
connexion Supabase"** pour confirmer que tout fonctionne avant de
déployer.

---

## ÉTAPE 4 — Envoyer le projet sur GitHub

### A. Créer le dépôt

1. Va sur [github.com](https://github.com) → **New repository**.
2. Nom suggéré : `eden-providence-site`.
3. Ne coche pas "Add a README" (le projet existe déjà).
4. Clique sur **Create repository**.

### B. Envoyer les fichiers

**Avec Git (terminal) :**

```bash
git init
git add .
git commit -m "Site Eden Providence - version finale"
git branch -M main
git remote add origin https://github.com/TON-COMPTE/eden-providence-site.git
git push -u origin main
```

**Sans terminal (upload direct) :**

1. Sur la page du dépôt GitHub → **Add file** → **Upload files**.
2. Glisse tous les fichiers/dossiers du projet (sauf `node_modules`,
   `dist`, `.env`, `.env.local` — déjà exclus par `.gitignore`).
3. Écris un message de commit, clique **Commit changes**.

---

## ÉTAPE 5 — Déployer sur Vercel

### A. Importer le projet

1. Va sur [vercel.com](https://vercel.com) et connecte-toi avec le
   **même compte GitHub** que celui où se trouve le dépôt.
2. Clique sur **Add New** → **Project**.
3. Choisis **Import Git Repository**.
4. Sélectionne `eden-providence-site`.

Vercel détecte automatiquement Vite (Framework Preset = Vite). Ne
touche pas à "Build and Output Settings", les valeurs par défaut sont
correctes.

### B. Ajouter les variables d'environnement

Dans la section **Environment Variables** (avant de cliquer Deploy,
ou ensuite dans Settings) :

| Key | Value | Environments |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://TON-PROJET.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | ta clé publishable | Production, Preview, Development |
| `VITE_SUPABASE_BUCKET` | `site-media` | Production, Preview, Development |
| `VITE_SITE_STATE_ID` | `public-site` | Production, Preview, Development |

Clique **Save** après chaque variable.

### C. Déployer

Clique sur **Deploy**. Attends la fin du build (1-2 minutes), puis
ouvre le lien fourni.

### D. Si tu ajoutes ou changes les variables après un premier déploiement

Les variables d'environnement ne s'appliquent **pas** rétroactivement.
Après toute modification :

1. Va dans l'onglet **Deployments**.
2. Clique sur les **...** du dernier déploiement.
3. Clique sur **Redeploy**.

---

## ÉTAPE 6 — Vérifier que tout le monde voit les changements

1. Ouvre `ton-site.vercel.app/#/admin`.
2. Connecte-toi (code : `1234567890`, à changer ensuite dans
   Paramètres → Sécurité).
3. Va dans l'onglet **Sécurité** → clique **"Tester la connexion
   Supabase"**.
   - ✅ "Connexion Supabase réussie" → tout est bon.
   - ❌ Un message d'erreur → lis-le, il indique la cause précise
     (variable manquante, table absente, policy manquante...).
4. Modifie ou supprime un élément dans **Collections** ou **Médias**.
5. Attends 5 à 10 secondes (sauvegarde automatique + envoi Supabase).
6. Ouvre le site public dans un **autre navigateur** ou en navigation
   privée (ou demande à quelqu'un d'autre d'ouvrir le lien).
7. Le changement doit être visible.

Si un média (photo/vidéo) importé ne s'affiche pas ailleurs, vérifie
en priorité l'étape 2.C (policies du bucket) : c'est la cause la plus
fréquente.

---

## Résumé express

- **Base de données** : `supabase/schema.sql` (SQL Editor → Run)
- **Médias** : `supabase/storage-policies.md` (Storage → Policies, via interface)
- **Variables** : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  `VITE_SUPABASE_BUCKET=site-media`, `VITE_SITE_STATE_ID=public-site`
- **Clé à utiliser** : la clé publique uniquement, jamais la clé secrète
- **GitHub** : `git push` ou upload manuel
- **Vercel** : Import → variables → Deploy → Redeploy si les variables
  changent après coup
- **Vérification** : onglet Sécurité → "Tester la connexion Supabase"
