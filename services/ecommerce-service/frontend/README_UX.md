# Interface B2B Premium — Guide UX

## Principe fondamental

> **Le frontend affiche, explique et rassure. Il ne prend jamais de décision backend.**

## Design System

### Couleurs
- **Primaire** : `#1E3A5F` — Bleu industriel profond
- **Success** : `#388E3C` — Vert validation
- **Warning** : `#FFA000` — Orange attention
- **Error** : `#C62828` — Rouge erreur

### Typographie
- **Famille** : Inter (Google Fonts)
- **Hiérarchie** : h1 (36px) → h2 (24px) → h3 (20px) → body (16px)

### Espacement
- Padding cards : 24px (`p-6`)
- Gap grids : 24px (`gap-6`)
- Sections : 80px (`py-16 lg:py-20`)

## Composants

| Composant | Usage |
|-----------|-------|
| `Button` | Actions principales/secondaires |
| `Card` | Conteneurs d'information |
| `Badge` | Status, types, labels |
| `Alert` | Informations contextuelles |
| `Table` | Spécifications techniques |
| `TrustBanner` | Arguments de réassurance |

## Pages

### Homepage (`/`)
- Hero avec proposition de valeur
- Trust banner (garantie, tests, SAV)
- Arguments B2B
- Catalogue avec filtres

### Fiche produit (`/products/[assetId]`)
- Spécifications techniques (données API)
- Contrôle qualité / Grade
- Indicateurs RSE
- Call-to-action configuration

### Configurateur CTO (`/cto/[assetId]`)
- Étapes guidées (RAM → Stockage → Réseau → Récap)
- Gestion des incompatibilités
- Validation technique
- Récapitulatif temps réel

### Pages réassurance
- `/process` — Processus industriel (6 étapes)
- `/quality` — Contrôle qualité (47 points)
- `/data-erasure` — Effacement RGPD
- `/warranty` — Garantie et SAV

## Règles absolues

1. **Ne jamais recalculer les prix** — Afficher uniquement les données API
2. **Ne jamais contourner la validation** — Le backend décide de la compatibilité
3. **Ne jamais inventer de données** — Afficher "N/A" si absent
4. **Ne jamais masquer l'info technique** — DSI ≠ grand public
5. **Toujours citer les limites** — "Estimations basées sur moyennes sectorielles"

## Démarrage

```bash
cd services/ecommerce-service/frontend
npm install
npm run dev
```

L'interface est accessible sur `http://localhost:3000`.
