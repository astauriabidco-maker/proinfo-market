# CTO Engine v1

Moteur de configuration **déterministe** pour serveurs refurbished.

## Philosophie

> **Le CTO valide, il ne décide pas.**

Ce moteur applique des règles strictement stockées en base. Il ne prend aucune décision métier.

## Structure

```
services/cto-service/
├── prisma/schema.prisma
├── src/
│   ├── app.ts
│   ├── server.ts                           # Port 3005
│   ├── routes/cto.routes.ts
│   ├── controllers/cto.controller.ts
│   ├── services/
│   │   ├── ctoValidation.service.ts
│   │   ├── ctoPricing.service.ts
│   │   └── ctoLeadTime.service.ts
│   ├── rules/
│   │   ├── rule.types.ts
│   │   └── rule.engine.ts
│   ├── repositories/
│   │   ├── rule.repository.ts
│   │   └── configuration.repository.ts
│   ├── domain/
│   │   ├── ctoConfiguration.types.ts
│   │   └── pricing.types.ts
│   ├── integrations/
│   │   ├── inventory.client.ts
│   │   └── asset.client.ts
│   ├── events/cto.events.ts
│   └── tests/cto.service.test.ts
└── package.json
```

## Types de Règles

| Type | Description |
|------|-------------|
| `COMPATIBILITY` | CPU autorisés pour un modèle |
| `QUANTITY` | Min/max composants |
| `DEPENDENCY` | Si X alors besoin de Y |
| `EXCLUSION` | X et Y mutuellement exclusifs |
| `PRICING` | Prix unitaire + labor + marge |
| `LEAD_TIME` | Temps assemblage par composant |

## Workflow de Validation

```mermaid
sequenceDiagram
    participant Client
    participant CTO
    participant Asset
    participant Rules

    Client->>CTO: POST /cto/validate
    CTO->>Asset: GET /assets/{id}
    alt status ≠ SELLABLE
        CTO-->>Client: ❌ 422 AssetNotSellableError
    end
    CTO->>Rules: Load active RuleSet
    CTO->>CTO: Evaluate COMPATIBILITY
    CTO->>CTO: Evaluate QUANTITY
    CTO->>CTO: Evaluate DEPENDENCY
    CTO->>CTO: Evaluate EXCLUSION
    alt Any rule fails
        CTO-->>Client: ❌ 422 InvalidConfiguration
    end
    CTO->>CTO: Calculate Price Snapshot (FROZEN)
    CTO->>CTO: Calculate Lead Time
    CTO->>CTO: Create CtoConfiguration
    CTO-->>Client: ✅ 201 + Assembly Order
```

## Prix FIGÉ

Le prix est un **snapshot** calculé une seule fois :

```json
{
  "priceSnapshot": {
    "components": [...],
    "laborCost": 50,
    "subtotal": 2000,
    "margin": 369,
    "total": 2419,
    "currency": "EUR",
    "frozenAt": "2026-02-04T23:00:00Z"
  }
}
```

❌ Le prix n'est **JAMAIS** recalculé après validation.

## API

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/cto/validate` | Valider une configuration |
| `GET` | `/cto/configurations/:id` | Récupérer une config validée |
| `GET` | `/cto/configurations/:id/price` | Récupérer le prix FIGÉ |

## Configuration

```env
DATABASE_URL=postgresql://user:password@localhost:5432/cto_db
INVENTORY_SERVICE_URL=http://localhost:3003
ASSET_SERVICE_URL=http://localhost:3000
PORT=3005
```

## Tests

```bash
npm test
```

## Limites v1

- Pas d'UI
- Pas de paiement
- Pas de modification des règles via API
- Pas d'optimisation heuristique
- Pas de suggestion de "meilleure config"
- Événements en console.log
