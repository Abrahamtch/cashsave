---
name: premium-theme-system
description: >
  Système de thèmes Dark/Light premium pour Cash Save.
  Active ce skill pour tout ce qui concerne la gestion des couleurs,
  variables CSS, bascule de thème, anti-flash, et cohérence visuelle
  entre le mode sombre et le mode clair.
---

# Premium Theme System — Cash Save

## Rôle

Garantir que chaque élément de l'interface respecte le système de thèmes
Dark/Light défini pour Cash Save, avec une cohérence absolue et zéro
régression visuelle lors du changement de mode.

---

## 1. Architecture du système

### Principe fondamental

> Toutes les couleurs passent exclusivement par des variables CSS.
> Aucune couleur hardcodée. Aucune classe Tailwind `dark:`.

### Fichier de référence

Le fichier source des variables est :
`src/app/globals.css`

### Activation des thèmes

Les thèmes sont activés par une classe sur `document.documentElement` :

| Classe | Mode |
|--------|------|
| `.dark` | Mode sombre (défaut) |
| `.light` | Mode clair |

---

## 2. Variables CSS à utiliser

### Backgrounds

```css
var(--bg-base)        /* Fond principal de la page */
var(--bg-surface)     /* Fond de la sidebar, header */
var(--bg-card)        /* Fond des cartes et surfaces élevées */
var(--bg-card-hover)  /* Fond au survol, inputs */
var(--bg-input)       /* Fond des champs de formulaire */
```

### Bordures

```css
var(--border)         /* Bordures légères — dividers, cartes */
var(--border-strong)  /* Bordures plus visibles — focus, accent */
```

### Texte

```css
var(--text-primary)    /* Texte principal — titres, valeurs importantes */
var(--text-secondary)  /* Texte secondaire — labels, descriptions */
var(--text-tertiary)   /* Texte discret — placeholders, métadonnées */
var(--text-inverse)    /* Texte sur fond coloré (ex: bouton primary) */
```

### Accent

```css
var(--accent)          /* Couleur principale d'action — indigo */
var(--accent-hover)    /* Accent au survol */
var(--accent-subtle)   /* Fond léger de l'accent (états actifs) */
```

### Ombres

```css
var(--shadow-sm)       /* Ombre légère — cartes au repos */
var(--shadow-md)       /* Ombre standard — cartes au survol, modals */
var(--shadow-accent)   /* Ombre colorée — boutons primaires */
```

### Couleurs sémantiques

```css
var(--color-success)        /* Vert — revenus, succès */
var(--color-success-light)  /* Vert clair */
var(--color-danger)         /* Rouge — dépenses, erreurs */
var(--color-danger-light)   /* Rouge clair */
var(--color-warning)        /* Ambre — alertes, séries */
var(--color-warning-light)  /* Ambre clair */
```

---

## 3. Valeurs des thèmes

### Mode Sombre (`.dark`)

| Variable | Valeur |
|----------|--------|
| `--bg-base` | `#0A0A0F` |
| `--bg-surface` | `#0D0D14` |
| `--bg-card` | `#16161E` |
| `--bg-card-hover` | `#1E1E2A` |
| `--border` | `rgba(255,255,255,0.08)` |
| `--border-strong` | `rgba(255,255,255,0.14)` |
| `--text-primary` | `#F1F5F9` |
| `--text-secondary` | `#94A3B8` |
| `--text-tertiary` | `#64748B` |
| `--accent` | `#6366F1` |

### Mode Clair (`.light`)

| Variable | Valeur |
|----------|--------|
| `--bg-base` | `#FFFFFF` |
| `--bg-surface` | `#F8F9FF` |
| `--bg-card` | `#FFFFFF` |
| `--bg-card-hover` | `#F3F4FD` |
| `--border` | `#E8EAFF` |
| `--border-strong` | `#C7CAF0` |
| `--text-primary` | `#0F172A` |
| `--text-secondary` | `#475569` |
| `--text-tertiary` | `#94A3B8` |
| `--accent` | `#4F46E5` |

---

## 4. Composant ThemeToggle

Le composant de bascule est situé dans :
`src/components/ThemeToggle.tsx`

### Comportement

1. Au montage, lit `localStorage.getItem('cashsave-theme')`
2. Fallback sur `prefers-color-scheme` du système
3. Applique `.dark` ou `.light` sur `document.documentElement`
4. Stocke le choix dans `localStorage` sous la clé `cashsave-theme`

### Placement

- **Desktop** : dans la sidebar, à droite du logo
- **Mobile** : dans le header, à droite du titre

### Icônes

- Mode sombre actif → afficher icône **Sun** (pour passer en clair)
- Mode clair actif → afficher icône **Moon** (pour passer en sombre)
- Animation de rotation `180deg` sur la transition
- Utiliser Lucide : `import { Sun, Moon } from 'lucide-react'`

---

## 5. Script anti-flash

Le script suivant doit être présent dans `src/app/layout.tsx`
dans une balise `<script dangerouslySetInnerHTML>` **avant** le `<body>`,
pour appliquer le thème avant le premier rendu et éviter tout flash :

```js
(function() {
  try {
    var saved = localStorage.getItem('cashsave-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = saved ? saved === 'dark' : prefersDark;
    var root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  } catch(e) {
    document.documentElement.classList.add('dark');
  }
})();
```

---

## 6. Règles strictes

### Ne jamais faire

- Utiliser des classes Tailwind `dark:` pour les couleurs
- Écrire des couleurs hex directement dans le JSX ou Tailwind
- Utiliser `bg-gray-900`, `text-white`, `bg-white`, `text-gray-500`, etc.
- Mélanger des valeurs hardcodées et des variables CSS sur le même composant

### Toujours faire

- Passer **toutes** les couleurs par `var(--nom-de-la-variable)`
- Utiliser `style={{ color: 'var(--text-primary)' }}` en inline si nécessaire
- Pour les couleurs sémantiques fixes (succès/danger), les écrire directement
  en hex car elles ne changent pas entre les thèmes : `#10B981`, `#F43F5E`

---

## 7. Couleurs sémantiques stables (identiques dans les deux thèmes)

Ces couleurs sont les mêmes en dark et light. Les écrire en hex direct :

| Usage | Couleur | Hex |
|-------|---------|-----|
| Revenus / Succès | Vert émeraude | `#10B981` |
| Dépenses / Erreur | Rose vif | `#F43F5E` |
| Série / Alerte | Ambre | `#F59E0B` |

Backgrounds semi-transparents associés :

| Usage | Background |
|-------|-----------|
| Succès | `rgba(16,185,129,0.10)` |
| Danger | `rgba(244,63,94,0.10)` |
| Warning | `rgba(245,158,11,0.10)` |

---

## 8. Checklist avant livraison

Avant de considérer un composant comme terminé, vérifier :

- [ ] Aucune couleur hardcodée en dehors des couleurs sémantiques stables
- [ ] Toutes les bordures utilisent `var(--border)` ou `var(--border-strong)`
- [ ] Tous les textes utilisent `var(--text-primary/secondary/tertiary)`
- [ ] Tous les fonds utilisent `var(--bg-base/surface/card/card-hover)`
- [ ] Le composant a été vérifié visuellement en mode sombre ET en mode clair
- [ ] Aucune ombre hardcodée — utiliser `var(--shadow-sm/md)`
- [ ] Les charts Recharts utilisent des tooltips adaptatifs via CSS variables
- [ ] Le ThemeToggle est présent et fonctionnel sur mobile et desktop
