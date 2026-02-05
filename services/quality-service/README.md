# Quality & Refurbishment Service

Service backend pour la gestion qualité et le reconditionnement.

## Structure

```
services/quality-service/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app.ts
│   ├── server.ts                      # Port 3002
│   ├── routes/quality.routes.ts
│   ├── controllers/quality.controller.ts
│   ├── services/quality.service.ts
│   ├── repositories/
│   │   ├── checklist.repository.ts
│   │   ├── checklistItem.repository.ts
│   │   ├── qualityResult.repository.ts  # APPEND-ONLY
│   │   └── battery.repository.ts
│   ├── domain/
│   │   ├── checklist.types.ts
│   │   ├── qualityResult.types.ts
│   │   └── battery.types.ts
│   ├── integrations/
│   │   └── asset.client.ts
│   ├── events/quality.events.ts
│   └── tests/quality.service.test.ts
└── package.json
```

## Règles Qualité (BLOQUANTES)

| Règle | Condition | Effet |
|-------|-----------|-------|
| Checklist complète | Tous les items testés | ❌ Si incomplet |
| Items bloquants | Aucun FAIL sur `isBlocking=true` | ❌ Si un FAIL |
| Batterie (LAPTOP) | `stateOfHealth >= 85%` | ❌ Si < 85% |

## Workflow Validation

```mermaid
sequenceDiagram
    participant Client
    participant Quality
    participant AssetService

    Client->>Quality: POST /assets/{id}/validate
    Quality->>AssetService: GET /assets/{id}
    Quality->>Quality: Charger checklist (version max)
    Quality->>Quality: Vérifier résultats complets
    Quality->>Quality: Vérifier aucun bloquant FAIL
    Quality->>Quality: Vérifier batterie >= 85%
    alt Tout OK
        Quality->>AssetService: POST /assets/{id}/status → SELLABLE
        Quality-->>Client: ✅ QualityPassed
    else Échec
        Quality-->>Client: ❌ QualityFailed + raison
    end
```

## API

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/quality/checklists` | Créer une checklist |
| `GET` | `/quality/checklists` | Lister les checklists |
| `POST` | `/quality/assets/:id/results` | Enregistrer un test |
| `POST` | `/quality/assets/:id/battery` | Enregistrer batterie |
| `POST` | `/quality/assets/:id/validate` | Valider qualité globale |

## Dépendance Asset Service

Le Quality Service appelle l'Asset Service pour :
- `GET /assets/{id}` : vérifier statut et type
- `POST /assets/{id}/status` : passer à SELLABLE

## Configuration

```env
DATABASE_URL=postgresql://user:password@localhost:5432/quality_db
ASSET_SERVICE_URL=http://localhost:3000
PORT=3002
```

## Tests

```bash
npm test
```

## Limites du Sprint 3

- Pas de grading esthétique
- Pas de photos
- Pas de pricing
- Pas de vente
- Événements en console.log
