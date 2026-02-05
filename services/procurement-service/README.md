# Procurement & Intake Service

Service backend pour la gestion des achats de lots et l'entrée en stock sérialisée.

## Structure

```
services/procurement-service/
├── prisma/
│   └── schema.prisma         # Modèle de données
├── src/
│   ├── app.ts                # Configuration Express
│   ├── server.ts             # Point d'entrée (port 3001)
│   ├── routes/
│   │   └── procurement.routes.ts
│   ├── controllers/
│   │   └── procurement.controller.ts
│   ├── services/
│   │   └── procurement.service.ts  # Logique métier + client Asset Service
│   ├── repositories/
│   │   ├── procurementLot.repository.ts
│   │   └── procurementItem.repository.ts
│   ├── domain/
│   │   ├── supplier.types.ts
│   │   └── procurement.types.ts
│   ├── events/
│   │   └── procurement.events.ts
│   └── tests/
│       └── procurement.service.test.ts
└── package.json
```

## Installation

```bash
cd services/procurement-service
npm install
npx prisma generate
```

## Configuration

Variables d'environnement :

```env
DATABASE_URL=postgresql://user:password@localhost:5432/procurement_db
ASSET_SERVICE_URL=http://localhost:3000   # URL de l'Asset Service
PORT=3001
```

## Workflow Intake

```mermaid
sequenceDiagram
    participant Client
    participant Procurement
    participant AssetService
    participant DB

    Client->>Procurement: POST /lots/{lotId}/intake
    Procurement->>DB: Vérifier lot existe
    Procurement->>DB: Vérifier quota (items < declared)
    Procurement->>AssetService: POST /assets
    AssetService-->>Procurement: Asset créé (assetId)
    Procurement->>DB: Créer ProcurementLotItem
    Procurement-->>Client: Item créé
```

## API

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/procurement/lots` | Créer un lot d'achat |
| `GET` | `/procurement/lots` | Lister tous les lots |
| `GET` | `/procurement/lots/:lotId` | Récupérer un lot |
| `GET` | `/procurement/lots/:lotId/items` | Lister les items d'un lot |
| `POST` | `/procurement/lots/:lotId/intake` | Intake d'une machine |

## Dépendance Asset Service

Ce service **DOIT** appeler l'Asset Service pour créer un asset.

- Il ne crée **JAMAIS** d'asset directement en base
- Si l'Asset Service échoue, l'intake échoue aussi
- L'`assetId` retourné est stocké dans `ProcurementLotItem`

## Tests

```bash
npm test
```

## Lancement

```bash
# Prérequis : Asset Service doit tourner sur port 3000
cd ../asset-service && npm run dev &

# Lancer Procurement Service
npm run dev
```

## Limites du Sprint 2

- Pas de qualité / grading (Sprint 3)
- Pas de stock physique / WMS
- Pas de modification d'Asset
- Événements en console.log uniquement
- Pas de validation avancée (Zod)
