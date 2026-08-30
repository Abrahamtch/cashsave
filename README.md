# Cash Save — Application Web SaaS de Suivi de Productivité & Finances (Mobile-First / PWA)

**Cash Save** est une application web SaaS moderne qui transforme les tableurs de suivi de productivité et de finances en une plateforme automatisée, gamifiée et accessible sur smartphone et desktop.

---

## 🚀 Stack Technique

- **Frontend** : Next.js 14+ (App Router, TypeScript, TailwindCSS)
- **Design & UI** : Glassmorphism, animations fluides, mode clair / sombres (Notion & Linear design style)
- **Backend & Data** : Supabase (PostgreSQL, Authentication, Row Level Security, Storage)
- **Graphiques** : Recharts (Évolution du score, répartition des dépenses, Revenus vs Dépenses)
- **Gamification** : Canvas Confetti, Streaks (🔥), Records (🏆) & Moyennes (📊)
- **Paiement Mobile Money & CB** : API Maketou (Flooz, TMoney, Orange Money, MTN MoMo, Carte Bancaire)
- **PWA** : Web App Manifest, offline support, installable sur iOS & Android

---

## 📱 Modules de l'Application

1. **Module 0 : Authentification & Onboarding**
   - Connexion / Inscription par Email + Mot de passe ou Google OAuth
   - Config des objectifs au premier démarrage
   - **Paywall & Période d'essai** : 42 jours gratuits offerts, puis blocage (paywall) des fonctionnalités d'ajout avec redirection vers l'abonnement Maketou à **3 000 FCFA/mois**.

2. **Module 1 : "My Habits" (Daily Tracker)**
   - Formulaire quotidien dynamique avec 9 habitudes booléennes (Bible, Prière, Méditation, Lecture, Documentaire, Sport, Light Work, Deep Work, After Work)
   - 5 champs numériques (Prospects, Appels, Contenu publié, Projets clients, Minutes d'apprentissage)
   - Notes & Progression du jour
   - Calcul en temps réel du Score Habitudes, Score Travail, Score Business, Score Apprentissage et **Score Total**.

3. **Module 2 : "My Cash" (Trésorerie)**
   - Gestion des revenus et dépenses
   - Saisie rapide (+ Revenu, - Dépense) avec catégorie, date, note et toggle "Satisfait ?"
   - Cartes statistiques (Revenus Totaux, Dépenses Totales, Bénéfice Net, Solde)
   - Historique avec filtres par mois et par catégorie

4. **Module 3 : "Dashboard" (Visualisation & Gamification)**
   - Courbe d'évolution du Score Total sur 7j, 30j et 1 an
   - Diagramme circulaire de répartition des dépenses par catégorie
   - Histogramme mensuel Revenus vs Dépenses
   - Badges gamifiés : Streak Actuel, Record Streak, Moyenne de la semaine

5. **Module 4 : "To-Do List"**
   - Kanban board interactif (À faire, En cours, Terminé)
   - Niveaux de priorité avec code couleur (Basse, Moyenne, Haute)
   - Dates limites et passage rapide d'un statut à l'autre

6. **Module 5 : "Objectifs"**
   - Définition et suivi des grands objectifs à moyen / long terme
   - Barre de progression interactive (0 à 100%) avec feux d'artifice/confettis lorsque l'objectif atteint 100%

7. **Module 6 : "Paramètres"**
   - Gestion du profil et déconnexion
   - Statut de l'abonnement (Compte à rebours 42j d'essai / Statut Premium)
   - **Configuration dynamique de l'algorithme** : Modification des coefficients de points attribués à chaque action (sauvegardé en format JSONB sur le profil utilisateur)
   - Basculement Thème Clair / Sombre

---

## 📁 Structure du Projet

```
.
├── app/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (app)/            # Routes protégées avec Sidebar & BottomNav
│   │   │   │   ├── dashboard/    # Module Dashboard
│   │   │   │   ├── habits/       # Module My Habits
│   │   │   │   ├── cash/         # Module My Cash
│   │   │   │   ├── tasks/        # Module To-Do List
│   │   │   │   ├── objectives/   # Module Objectifs
│   │   │   │   └── settings/     # Module Paramètres
│   │   │   ├── auth/             # Login, Register, Callback OAuth
│   │   │   ├── onboarding/       # Écran d'accueil post-inscription
│   │   │   ├── paywall/          # Paywall au 43ème jour / Upgrade
│   │   │   ├── api/payment/      # Routes API Maketou (create cart, webhook)
│   │   │   ├── globals.css       # Design System CSS
│   │   │   └── layout.tsx        # Layout racine
│   │   ├── lib/
│   │   │   ├── supabase/         # Clients Supabase (browser, server, middleware)
│   │   │   ├── scoring.ts        # Moteur de calcul des scores
│   │   │   ├── stats.ts          # Calculs statistiques, streaks & graphiques
│   │   │   └── maketou.ts        # Intégration API de paiement Maketou
│   │   └── types/                # Types TypeScript
│   └── supabase/
│       └── migrations/
│           └── 001_initial_schema.sql  # Schéma SQL PostgreSQL complet
```

---

## 🛠️ Configuration & Installation

1. Clonez le dépôt et installez les dépendances :
   ```bash
   cd app
   npm install
   ```

2. Configurez le fichier `.env.local` :
   ```env
   NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon_supabase
   SUPABASE_SERVICE_ROLE_KEY=votre_cle_service_role_supabase

   MAKETOU_API_KEY=votre_cle_api_maketou
   MAKETOU_PRODUCT_DOCUMENT_ID=identifiant_produit_maketou
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. Exécutez la migration SQL dans la console SQL de votre projet Supabase (`app/supabase/migrations/001_initial_schema.sql`).

4. Lancez le serveur de développement :
   ```bash
   npm run dev
   ```
