# WMS v1 Service

Service backend pour l'exécution opérationnelle WMS.

## Philosophie

> **Le WMS exécute des ordres, il ne raisonne pas.**

Ce service gère les opérations terrain : picking, assemblage, expédition et retours.
Il ne prend aucune décision métier, il exécute.

## Structure

```
services/wms-service/
├── prisma/schema.prisma
├── src/
│   ├── app.ts
│   ├── server.ts                      # Port 3004
│   ├── routes/wms.routes.ts
│   ├── controllers/wms.controller.ts
│   ├── services/wms.service.ts
│   ├── repositories/
│   │   ├── picking.repository.ts
│   │   ├── assembly.repository.ts
│   │   ├── shipment.repository.ts
│   │   └── return.repository.ts
│   ├── domain/
│   │   ├── picking.types.ts
│   │   ├── assembly.types.ts
│   │   ├── shipment.types.ts
│   │   └── return.types.ts
│   ├── integrations/
│   │   ├── inventory.client.ts
│   │   └── asset.client.ts
│   ├── events/wms.events.ts
│   └── tests/wms.service.test.ts
└── package.json
```

## Dépendances inter-services

| Service | Appels |
|---------|--------|
| **Inventory Service** | Vérifier réservation, déplacer Asset |
| **Asset Service** | Changer statut (SOLD, RMA) |

❌ Le WMS ne possède aucun stock
❌ Aucune écriture directe sur les bases Inventory ou Asset

## Workflows

### Picking
```
POST /wms/picking → Créer ordre (vérifie réservation)
POST /wms/picking/:id/start → Démarrer
POST /wms/picking/:id/complete → Terminer + mouvement MOVE
```

### Assemblage CTO
```
POST /wms/assembly → Créer ordre avec tâches
POST /wms/assembly/:id/start → Démarrer
POST /wms/assembly/:id/complete → Marquer toutes tâches exécutées
```

### Expédition
```mermaid
sequenceDiagram
    participant WMS
    participant Inventory
    participant Asset

    Note over WMS: POST /wms/shipments
    WMS->>WMS: Vérifier picking COMPLETED
    WMS->>WMS: Vérifier assemblage COMPLETED
    WMS->>Inventory: moveAsset(SHIP)
    WMS->>Asset: changeStatus → SOLD
    WMS->>WMS: Créer Shipment SHIPPED
```

### Retour (RMA)
```
POST /wms/returns
  → Asset Service: statut RMA
  → Inventory Service: mouvement RETURN
  → Création Return RECEIVED
```

## API

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/wms/picking` | Créer ordre de picking |
| `POST` | `/wms/picking/:id/complete` | Terminer picking |
| `POST` | `/wms/assembly` | Créer ordre d'assemblage |
| `POST` | `/wms/assembly/:id/complete` | Terminer assemblage |
| `POST` | `/wms/shipments` | Expédier (picking + assemblage requis) |
| `POST` | `/wms/returns` | Traiter un retour |

## Configuration

```env
DATABASE_URL=postgresql://user:password@localhost:5432/wms_db
INVENTORY_SERVICE_URL=http://localhost:3003
ASSET_SERVICE_URL=http://localhost:3000
PORT=3004
```

## Tests

```bash
npm test
```

## Limites du WMS v1

- Pas de calcul CTO (Sprint 6)
- Pas de pricing
- Pas de SLA
- Pas de UI mobile
- Pas de multi-colis
- Événements en console.log
