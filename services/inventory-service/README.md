# Inventory & Stock Service

Service backend pour la gestion du stock sérialisé et des mouvements.

## Principe Fondamental

> **Le stock = somme des mouvements, jamais une quantité.**

Chaque Asset a un emplacement courant calculé à partir de son dernier mouvement.

## Structure

```
services/inventory-service/
├── prisma/schema.prisma
├── src/
│   ├── app.ts
│   ├── server.ts                         # Port 3003
│   ├── routes/inventory.routes.ts
│   ├── controllers/inventory.controller.ts
│   ├── services/inventory.service.ts
│   ├── repositories/
│   │   ├── warehouse.repository.ts
│   │   ├── location.repository.ts
│   │   ├── movement.repository.ts        # APPEND-ONLY
│   │   └── reservation.repository.ts
│   ├── domain/
│   │   ├── location.types.ts
│   │   ├── movement.types.ts
│   │   └── reservation.types.ts
│   ├── integrations/asset.client.ts
│   ├── events/inventory.events.ts
│   └── tests/inventory.service.test.ts
└── package.json
```

## Modèle Stock Sérialisé

| Concept | Description |
|---------|-------------|
| **1 Asset = 1 unité** | Pas de quantité, sérialisation stricte |
| **Position courante** | `toLocation` du dernier mouvement |
| **Mouvements** | Append-only, audit trail complet |
| **Réservation** | Bloque la double-vente |

## Règles de Réservation

```mermaid
sequenceDiagram
    participant Client
    participant Inventory
    participant AssetService

    Client->>Inventory: POST /assets/{id}/reserve
    Inventory->>AssetService: GET /assets/{id}
    alt status ≠ SELLABLE
        Inventory-->>Client: ❌ 422 AssetNotSellableError
    else already reserved
        Inventory-->>Client: ❌ 409 AssetAlreadyReservedError
    else OK
        Inventory->>Inventory: Create reservation
        Inventory->>Inventory: Record RESERVE movement
        Inventory-->>Client: ✅ 201 Reservation
    end
```

## API

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/inventory/warehouses` | Créer un entrepôt |
| `POST` | `/inventory/warehouses/:id/locations` | Créer un emplacement |
| `POST` | `/inventory/assets/:id/move` | Déplacer un asset |
| `POST` | `/inventory/assets/:id/reserve` | Réserver un asset |
| `POST` | `/inventory/assets/:id/release` | Libérer une réservation |
| `GET` | `/inventory/assets/:id/availability` | Vérifier disponibilité |

## Disponibilité

Un asset est disponible si :
1. ✅ Statut = `SELLABLE`
2. ✅ Pas de réservation active
3. ✅ Emplacement connu

## Configuration

```env
DATABASE_URL=postgresql://user:password@localhost:5432/inventory_db
ASSET_SERVICE_URL=http://localhost:3000
PORT=3003
```

## Tests

```bash
npm test
```

## Limites du Sprint 4

- Pas d'assemblage CTO
- Pas d'expédition
- Pas de multi-entrepôts avancé
- Pas de WMS UI mobile
- Événements en console.log
