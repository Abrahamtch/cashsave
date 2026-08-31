# Cahier des Charges Fonctionnel & Technique — Cash Save

> **Document Officiel de Spécifications Système & Architecture**  
> **Société :** Digital Influence Marketing SARL U  
> **Application :** Cash Save (Web App & PWA)  
> **Version :** 2.0.0 (Production Ready)  
> **Date d'Édition :** 31 août 2026  
> **Fichier PDF généré :** [`Cahier_des_Charges_Cash_Save.pdf`](file:///f:/Digital%20Influence%20Marketing%20SARL%20U/Cash%20Save/Cahier_des_Charges_Cash_Save.pdf)

---

## 1. Sommaire Exécutif & Vision du Produit

**Cash Save** est une application web progressive (PWA) de haute précision conçue pour les entrepreneurs, indépendants, cadres et particuliers exigeants désireux de lier de manière indivisible leur rigueur financière personnelle et leur discipline de vie au quotidien.

> [!NOTE]
> **Vision Fondatrice :** Le succès financier et la maîtrise du patrimoine découlent de la répétition quotidienne de comportements structurés. Cash Save réunit dans un environnement unique : la trésorerie en temps réel (*My Cash*), la réservation de capital par enveloppe d'objectifs (*My Objectives*), la gestion visuelle des tâches (*My Tasks / Kanban*), et la mesure objective de l'auto-discipline (*My Habits & Scoring*).

### 1.1 Piliers d'Expérience Utilisateur ("Quiet Luxury")
- **Esthétique Luxueuse & Minimaliste :** Absence de bruit visuel, couleurs harmonieuses (*Émeraude Luxe*, *Or Champagne*, *Obsidian Floor*), typographie nette.
- **Zéro Latence Ressentie (0ms latency UI) :** Mise à jour synchrone instantanée de l'interface via le stockage local (`localStorage`) puis synchronisation asynchrone transparente avec la base de données distante (*Supabase*).
- **Composants Visuels Sur-Mesure :** Intégration d'un calendrier futuriste en verre translucide (`FuturisticDatePicker`) doté d'un spot lumineux ambiant réactif au survol de la souris avec inertie physique fluide.
- **Garde-fous Financiers Stricts :** Impossibilité structurelle d'allouer aux objectifs une somme supérieure au solde net réel disponible dans le compte *My Cash*.

---

## 2. Charte Graphique & Design System

La charte graphique est rigoureusement conforme à la directive de marque `cash-save-brand`. Elle garantit que le **Mode Sombre (Dark Mode - Obsidian Floor)** et le **Mode Clair (Light Mode - Warm Stone)** véhiculent le même standing luxueux sans simple inversion chromatique.

### 2.1 Jetons de Couleurs Sémantiques (Color Tokens)

| Jeton (Token) | Mode Sombre (Obsidian) | Mode Clair (Warm Stone) | Rôle & Application |
|---|---|---|---|
| `--accent` | `#0E9F6E` (Émeraude Luxe) | `#087A56` (Émeraude Profond) | Couleur primaire, boutons d'action, jauges de progrès. |
| `--accent-gold` | `#D6B36A` (Or Champagne) | `#B89446` (Or Chaud) | Accents de valeur, trophées, badges premium. |
| `--bg-base` | `#0B0E0D` | `#F7F7F3` | Fond de page général (Obsidian Floor vs Warm Stone). |
| `--bg-card` | `#121816` | `#FFFFFF` | Surface des cartes et panneaux translucides. |
| `--border` | `#1E292B` | `#E2E8F0` | Bordures subtiles séparatrices sans lignes agressives. |

### 2.2 Composant Calendrier Futuriste (`FuturisticDatePicker`)
- **Surface Translucide Dépolie :** `backdrop-filter: blur(24px) saturate(140%)`.
- **Spot Lumineux Ambiant Multicolore :** Émeraude, Cyan, Violet, Or calculé par `requestAnimationFrame` avec inertie physique fluide.
- **Positionnement Intelligent Auto-Adaptatif :** Ouverture vers le haut (`bottom-full mb-2`) ou vers le bas (`top-full mt-2`) selon l'espace vertical disponible évitant tout tronquage dans les modales.

---

## 3. Spécifications Fonctionnelles Détaillées

### 3.1 Module 1 : Tableau de Bord & Score de Discipline (Dashboard)
- **Score Global de Discipline sur 100 points** :
  - **40% - Score des Habitudes :** Exécution des 9 habitudes quotidiennes et des 5 métriques numériques de productivité.
  - **40% - Score de Trésorerie :** Solde net, rentabilité et maîtrise des dépenses par rapport aux revenus.
  - **20% - Score des Tâches :** Pourcentage de complétion des objectifs Kanban.
- **Visualisations** : Tendance du score global (30j / 365j via Recharts), Donut chart de ventilation des dépenses par catégorie, et histogramme bicolore Entrées vs Sorties.

### 3.2 Module 2 : Trésorerie & Registre Financier ("My Cash")
- **Catégories de Revenus (Entrées) :** Salaire, Freelance, Investissement, Ventes, Divers.
- **Catégories de Dépenses (Sorties) :** Alimentation, Logement, Transport, Loisirs, Santé, Éducation, Shopping, Services.
- **Solde Net en Temps Réel :** Calculé automatiquement selon la formule `Total Revenus - Total Dépenses` avec formatage strict en Francs CFA (`XAF`).

### 3.3 Module 3 : Objectifs Financiers & Allocations ("My Objectives")
> [!WARNING]
> **Garde-Fou d'Allocation Budgétaire Strict :**  
> Chaque objectif comporte un **Coût Total Visé** et un **Budget Alloué**.  
> L'application additionne en temps réel les budgets alloués sur tous les objectifs actifs et **interdit strictement** que cette somme dépasse le solde net disponible dans *My Cash*. Cette règle empêche toute fausse illusion de trésorerie disponible.

### 3.4 Module 4 : Habitudes & Discipline Personnelle ("My Habits")
Suivi quotidien structuré en 14 indicateurs clés de performance personnelle :
- **Esprit & Foi :** Bible, Prière, Méditation, Lecture, Documentaire (Cases à cocher).
- **Santé & Énergie :** Pratique du Sport / Exercice physique (Case à cocher).
- **Focus & Travail :** Travail Léger, Deep Work, After Work (Cases à cocher).
- **Business & Growth :** Prospects contactés, Appels, Contenus publiés, Projets clients, Formation (Incrémentation `+` / `-`).

### 3.5 Module 5 : Kanban des Tâches & Priorités ("My Tasks")
- **Glisser-Déposer HTML5 (Drag & Drop) :** Déplacement fluide de n'importe quelle carte avec surbrillance lumineuse émeraude de la colonne de destination.
- **Boutons de Statut Directs :** Badges tactiles `À faire`, `En cours`, `Terminé` intégrés à chaque carte pour un déplacement immédiat en 1 clic.
- **Code Couleur des Priorités :** Haute (Rouge Danger), Moyenne (Ambre Warning), Basse (Neutre).

---

## 4. Architecture Technique & Base de Données

### 4.1 Stack Technologique Moderne
- **Frontend :** Next.js 16 (App Router, Turbopack, React 19).
- **Langage :** TypeScript strict (Interfaces typées sans usage d'`any`).
- **Styles :** Vanilla CSS3 (Variables dynamiques `globals.css`) + TailwindCSS.
- **Backend / DB :** Supabase (PostgreSQL, Authentification JWT, RLS Row Level Security).
- **Iconographie & Effets :** Lucide Icons, Recharts, Canvas Confetti.

### 4.2 Architecture de Persistance Hybride (Offline-First)
1. Lors d'une action utilisateur, l'état React et `localStorage` sont mis à jour de manière synchrone en 0ms.
2. La synchronisation avec la base Supabase distante s'exécute en arrière-plan.
3. Si Supabase renvoie un résultat vide (mode démo ou hors-ligne), l'application bascule sur `localStorage`, empêchant toute perte de données.

### 4.3 Schéma des Tables PostgreSQL (Supabase)

| Table | Champs Clés | Politiques de Sécurité (RLS) |
|---|---|---|
| `profiles` | `id, email, full_name, is_premium, scoring_settings` | Propriétaire uniquement (`auth.uid() = id`). |
| `transactions` | `id, user_id, amount, type, category, date` | Accès isolé par utilisateur (`auth.uid() = user_id`). |
| `daily_habits` | `id, user_id, date, bible, prayer, sport, deep_work...` | Clé unique `(user_id, date)`. Isolement strict. |
| `objectives` | `id, user_id, title, target_amount, allocated_budget` | Contrôle RLS + validation des plafonds. |
| `tasks` | `id, user_id, title, priority, status, deadline` | Filtrage automatique par `user_id`. |

---

## 5. Déploiement & Qualité

- **Hébergement Production :** Vercel / Firebase App Hosting avec SSL/TLS automatique.
- **Contrôle de Version :** Synchronisation continue des modifications sur le dépôt Git distant (`main` branch).
- **Fichier PDF généré :** Également disponible à la racine du projet sous le nom [`Cahier_des_Charges_Cash_Save.pdf`](file:///f:/Digital%20Influence%20Marketing%20SARL%20U/Cash%20Save/Cahier_des_Charges_Cash_Save.pdf).
