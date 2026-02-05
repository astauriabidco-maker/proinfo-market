# Asset Service

Service backend pour la gestion du cycle de vie des machines reconditionnées.

## Structure

```
services/asset-service/
├── prisma/
│   └── schema.prisma       # Modèle de données
├── src/
│   ├── app.ts              # Configuration Express
│   ├── server.ts           # Point d'entrée
│   ├── routes/
│   │   └── asset.routes.ts # Routes REST
│   ├── controllers/
│   │   └── asset.controller.ts
│   ├── services/
│   │   └── asset.service.ts    # Logique métier
│   ├── repositories/
│   │   ├── asset.repository.ts
│   │   └── assetHistory.repository.ts  # IMMUABLE
│   ├── domain/
│   │   ├── asset.types.ts      # DTOs et erreurs
│   │   ├── assetStatus.ts      # Enums
│   │   └── assetTransitions.ts # FSM
│   ├── events/
│   │   └── asset.events.ts     # Émetteurs (console.log)
│   └── tests/
│       └── asset.service.test.ts
└── package.json
```

## Installation

```bash
cd services/asset-service
npm install
npx prisma generate
```

## Configuration

Variable d'environnement requise :

```env
DATABASE_URL=postgresql://user:password@localhost:5432/asset_db
```

## Lancement

```bash
# Développement
npm run dev

# Production
npm run build
npm start
```

## API

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/assets` | Créer un asset (statut initial: ACQUIRED) |
| `GET` | `/assets` | Lister tous les assets |
| `GET` | `/assets/:id` | Récupérer un asset |
| `GET` | `/assets/:id/history` | Historique d'état |
| `POST` | `/assets/:id/status` | Changer le statut |

## Transitions autorisées

```
ACQUIRED → IN_REFURB → QUALITY_PENDING → SELLABLE → RESERVED → SOLD → RMA → SELLABLE
                                                                              ↓
                        (Depuis n'importe quel état) ───────────────→ SCRAPPED
```

## Tests

```bash
npm test
```

## Décisions techniques

1. **Séparation stricte des couches** : Controller → Service → Repository
2. **Historique immuable** : Pas de méthode `update` ou `delete` sur `AssetHistoryRepository`
3. **Erreurs typées** : `DuplicateSerialNumberError`, `InvalidTransitionError`, `AssetNotFoundError`
4. **Événements simulés** : `console.log` (Kafka prévu dans un sprint ultérieur)

## Limites connues

- Pas d'authentification/autorisation (prévu Sprint 2)
- Événements en console.log uniquement (pas de broker)
- Pas de validation Zod/class-validator (validation manuelle basique)
- Pas de pagination avancée (limit/offset simple)
