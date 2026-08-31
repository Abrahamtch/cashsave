# SKILL — Questionnaire d'Onboarding "Cash Save"

**Contexte projet :** Cash Save (PWA/Web App), Next.js 16 (App Router), TypeScript strict, Supabase (PostgreSQL + RLS), TailwindCSS, design system "Quiet Luxury" (voir tokens ci-dessous). Persistance hybride offline-first (localStorage → sync Supabase asynchrone).

**Objectif de ce skill :** Construire le flux d'onboarding déclenché **immédiatement après l'inscription** d'un nouvel utilisateur, avant son premier accès au Dashboard. Ce flux collecte le strict minimum d'informations pour (a) initialiser un solde net de départ cohérent dans *My Cash*, et (b) personnaliser le module *My Habits* dès la première visite. Le tout doit rester rapide, non intrusif, et entièrement contournable.

---

## 1. Déclenchement & positionnement dans le parcours

- Le questionnaire s'affiche **une seule fois**, juste après la création de compte réussie (post `sign_up` Supabase Auth), avant toute redirection vers `/dashboard`.
- Il ne doit **jamais** bloquer l'accès à l'application : à tout moment, l'utilisateur peut le quitter via le bouton "Skip" (voir §4).
- Si l'utilisateur skip ou complète partiellement, ne plus jamais le re-proposer automatiquement à la connexion suivante. Prévoir cependant un accès manuel ultérieur : un lien discret dans les Réglages ("Configurer mon point de départ") qui rouvre le même flux, pré-rempli avec les données déjà connues.
- Stocker un flag `onboarding_status` sur `profiles` : `not_started | skipped | partial | completed`.

## 2. Structure générale de l'UI

- Composant modal plein écran (pas une simple modale flottante) en `bg-base`, cartes en `bg-card`, conforme aux tokens de couleur du cahier des charges (mode sombre/clair). Pas d'emoji, typographie nette, cartes translucides — cohérent avec l'esthétique "Quiet Luxury" déjà en place ailleurs dans l'app.
- **Stepper à 4 étapes** avec indicateur de progression discret en haut (ex. 4 points ou une barre fine `--accent`), jamais de pourcentage anxiogène.
- Navigation : bouton "Suivant" (désactivé tant qu'une validation minimale n'est pas remplie sur les champs obligatoires — voir chaque étape), bouton "Précédent" secondaire, et bouton **"Skip"** toujours visible, discret (texte simple, pas de style bouton primaire — voir §4).
- Aucune étape ne doit comporter plus de 6 éléments interactifs visibles simultanément à l'écran (défilement accepté, mais pas de surcharge visuelle).
- Toute saisie est conservée en state React + `localStorage` (clé `onboarding_draft`) à chaque étape, pour survivre à un refresh accidentel.

## 3. Détail des 4 étapes

### Étape 1 — Comptes & soldes de départ

**But fonctionnel :** initialiser `profiles.initial_balance_total` et créer les enregistrements de comptes sources qui alimenteront le solde net de *My Cash*.

- Titre : "D'où partons-nous ?"
- Sous-titre de réassurance (obligatoire, affiché en petit texte sous le titre) :
  > "Ces informations servent uniquement à configurer ta trésorerie de départ. Elles restent strictement confidentielles et ne sont jamais partagées."
- Champ 1 : liste de cases à cocher (multi-select), design en "chips" sélectionnables (pas de liste déroulante) :
  `T-Money` · `Flooz` · `Compte bancaire` · `Espèces` · `Portefeuille en ligne` · `Autre`
- Comportement dynamique : dès qu'une chip est cochée, un champ numérique apparaît en dessous (animation douce, cohérente avec le reste de l'app) : "Solde actuel (FCFA)" avec formatage automatique des milliers, valeur par défaut vide (pas 0 pré-rempli pour éviter les faux positifs de saisie).
- Si "Autre" est coché, un champ texte libre court apparaît pour nommer le moyen (max 30 caractères).
- Aucun champ n'est obligatoire à ce stade — si l'utilisateur ne coche rien, on affiche : "Tu pourras renseigner ton solde plus tard depuis My Cash" et le bouton "Suivant" reste actif.
- Calcul : la somme des soldes saisis devient le **solde net de départ**. Afficher un total live en bas de l'étape (format `XXX XXX FCFA`) pour donner un feedback immédiat.
- Persistance : à la validation finale du questionnaire, créer une transaction initiale de type `solde_initial` par compte (ou un enregistrement dédié table `initial_balances`, voir §6) — ne pas mélanger avec les transactions courantes de type revenu/dépense.

### Étape 2 — Diagnostic de routine

**But fonctionnel :** déterminer si l'utilisateur a déjà une discipline établie, pour adapter le ton de l'étape 3 (encart pédagogique ou non).

- Titre : "As-tu déjà une routine quotidienne ?"
- Choix unique (radio/cards) :
  - "Oui, assez régulière"
  - "Un peu, mais pas constante"
  - "Non, pas vraiment"
- Champ obligatoire pour avancer (mais toujours contournable via "Skip" global).
- Logique conditionnelle :
  - Si "Oui" → passage direct à l'étape 3, sans encart.
  - Si "Un peu" ou "Non" → afficher un encart court (3-4 phrases, ton sobre, pas de pavé) rappelant que la régularité des comportements structurés est le socle de Cash Save. Texte à valider avec le porteur de projet avant intégration finale — prévoir une constante éditable (`ONBOARDING_ROUTINE_TIP`) plutôt que du texte en dur dans le composant.
- Stocker la réponse dans `profiles.routine_status` (enum `regular | irregular | none`).

### Étape 3 — Sélection des habitudes à suivre

**But fonctionnel :** personnaliser `My Habits` dès la première ouverture en activant un sous-ensemble des 14 habitudes définies dans le cahier des charges (4 axes : Esprit & Foi, Santé & Énergie, Focus & Travail, Business & Growth).

- Titre : "Choisis tes habitudes de départ"
- Sous-titre : "On te propose un socle simple — tu pourras tout ajuster plus tard dans My Habits."
- Affichage groupé par axe (4 sections repliables ou en accordéon léger), chaque habitude étant une chip/checkbox.
- **Présélection par défaut** (pré-cochées à l'ouverture, l'utilisateur peut décocher) : environ 1 à 2 habitudes "phares" par axe, soit un socle de 5 à 6 habitudes au total plutôt que les 14. Liste exacte des habitudes phares à définir avec le porteur de projet, mais suggestion de départ :
  - Esprit & Foi : Prière, Lecture
  - Santé & Énergie : Sport
  - Focus & Travail : Deep Work
  - Business & Growth : Contenus publiés
- Les métriques à incrémentation (Business & Growth : prospects contactés, appels, formation en minutes) sont affichées mais **non pré-cochées par défaut** — signalées avec un badge discret "à activer plus tard" si non sélectionnées.
- Aucune limite dure au nombre d'habitudes sélectionnables, mais si l'utilisateur dépasse 8 sélections, afficher un message doux non bloquant : "Beaucoup d'habitudes à la fois peut être difficile à tenir — on te conseille de commencer simple."
- Stocker le résultat dans une table de jointure `user_habit_preferences (user_id, habit_key, is_active)` qui pilotera l'affichage initial de My Habits.

### Étape 4 — Récapitulatif & validation

- Titre : "Tout est prêt"
- Résumé synthétique en 3 blocs (pas de longue liste) :
  1. Solde net de départ (montant total)
  2. Statut de routine choisi
  3. Nombre d'habitudes activées (avec possibilité de "voir le détail" en accordéon, pas affiché par défaut)
- Un seul bouton d'action primaire : "Commencer" → déclenche la persistance finale (voir §6) et redirige vers `/dashboard`.
- Mise à jour de `profiles.onboarding_status = 'completed'`.

## 4. Bouton "Skip" — comportement exact

- Visible sur **chaque** étape, position constante (coin supérieur droit ou pied de modale), style texte discret (`text-muted`, pas de bordure ni de fond), jamais mis en avant visuellement par rapport au bouton primaire "Suivant"/"Commencer".
- Libellé : "Ignorer pour l'instant" (éviter l'anglicisme brut "Skip" dans l'UI finale, sauf si la marque le souhaite explicitement).
- Au clic : demander une confirmation légère (pas une modale intrusive — un simple message inline ou un `toast` de confirmation) du type : "Tu pourras configurer ces informations plus tard depuis les Réglages." avec un bouton "Confirmer" et "Annuler".
- Comportement de données : conserver toute donnée déjà saisie dans les étapes précédentes (ne pas tout jeter) et marquer `onboarding_status = 'skipped'` si aucune étape n'a été complétée, ou `'partial'` si certaines l'ont été. Le solde net reste à 0 tant que l'étape 1 n'a pas été validée.
- Redirection immédiate vers `/dashboard` après confirmation du skip.

## 5. Ton et réassurance sur la confidentialité

- Chaque étape comportant une donnée sensible (soldes financiers en particulier) doit inclure un texte de réassurance court, cohérent sur l'ensemble du flux. Proposition de formulation standard réutilisable :
  > "Ces informations restent strictement confidentielles et servent uniquement à configurer ta plateforme."
- Ne pas alourdir : une seule phrase par étape concernée, pas de lien vers une politique de confidentialité complète à ce stade (à réserver aux Réglages/mentions légales).
- Ton général : sobre, direct, jamais infantilisant — cohérent avec le refus de "surplus visuel inutile" et l'absence d'émoticônes mentionné dans le cahier des charges.

## 6. Modèle de données (Supabase / PostgreSQL)

Ajouts proposés, en cohérence avec le schéma existant (RLS par `user_id`/`auth.uid()`) :

**Table `profiles`** (extension) :
- `onboarding_status` : enum `not_started | skipped | partial | completed`, défaut `not_started`
- `routine_status` : enum `regular | irregular | none`, nullable
- `initial_balance_total` : numeric, nullable (calculé, dénormalisé pour lecture rapide au Dashboard)

**Nouvelle table `initial_balances`** :
- `id`, `user_id` (FK, RLS `auth.uid() = user_id`), `source_type` (enum : `tmoney | flooz | banque | especes | portefeuille_en_ligne | autre`), `source_label` (texte libre si `autre`), `amount`, `created_at`

**Nouvelle table `user_habit_preferences`** :
- `id`, `user_id` (FK, RLS `auth.uid() = user_id`), `habit_key` (référence aux clés des 14 habitudes définies dans le module My Habits), `is_active` (boolean), `created_at`

**Règle d'intégrité :** la somme des `initial_balances.amount` par utilisateur doit être répercutée dans le calcul du solde net affiché par My Cash **sans** être comptabilisée comme une transaction de type revenu ou dépense (impact sur les graphiques Entrées/Sorties à éviter).

## 7. Exigences non-fonctionnelles

- Persistance offline-first identique au reste de l'app : chaque étape sauvegarde en `localStorage` en 0ms, synchronisation Supabase en arrière-plan, avec repli local si la base distante est inaccessible (cohérent avec l'architecture hybride déjà en place).
- TypeScript strict, interfaces typées pour chaque payload d'étape (pas de `any`).
- Composants réutilisant les tokens de couleur et le style "verre translucide" déjà définis dans `cash-save-brand` (`--accent`, `--bg-card`, `--border`, etc.) pour garantir la cohérence visuelle avec le Dashboard et les autres modules.
- Accessible au clavier (navigation entre étapes, focus visible) et responsive mobile-first, l'app étant une PWA.

## 8. Critères d'acceptation

- [ ] Le questionnaire s'affiche automatiquement une seule fois, immédiatement après l'inscription.
- [ ] Chaque étape est franchissable indépendamment via "Skip" sans perte des données déjà saisies.
- [ ] Le solde net calculé à l'étape 1 correspond exactement à la somme des soldes saisis et alimente correctement My Cash sans polluer les graphiques Entrées/Sorties.
- [ ] Les habitudes pré-sélectionnées à l'étape 3 apparaissent activées dans My Habits dès la première visite du Dashboard.
- [ ] Le texte de réassurance confidentialité est visible sur l'étape 1 avant toute saisie de solde.
- [ ] Le lien "Configurer mon point de départ" dans les Réglages rouvre le flux avec les données déjà connues pré-remplies.
- [ ] Aucune étape n'expose plus de 6 éléments interactifs simultanés à l'écran.

