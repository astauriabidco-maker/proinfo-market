# SAV & RMA Service v1

Service de gestion du SAV et des RMA (Return Merchandise Authorization).

## Philosophie

> **Le SAV est opposable juridiquement.**

L'historique SAV est **append-only**. Aucune suppression, aucune modification rétroactive.

## Architecture

```
sav-service/
├── prisma/
│   └── schema.prisma          # 3 tables : SavTicket, Rma, RmaDiagnosis
└── src/
    ├── domain/
    │   ├── ticket.types.ts
    │   ├── rma.types.ts
    │   └── diagnosis.types.ts
    ├── repositories/
    │   ├── ticket.repository.ts
    │   ├── rma.repository.ts
    │   └── diagnosis.repository.ts
    ├── services/
    │   └── sav.service.ts
    ├── integrations/
    │   ├── asset.client.ts
    │   ├── inventory.client.ts
    │   └── quality.client.ts
    └── events/
        └── sav.events.ts
```

## Cycle SAV Complet

```mermaid
stateDiagram-v2
    [*] --> TicketOPEN: Client signale problème
    TicketOPEN --> RmaCREATED: Création RMA
    RmaCREATED --> RmaRECEIVED: Réception retour
    RmaRECEIVED --> RmaDIAGNOSED: Diagnostic
    RmaDIAGNOSED --> RmaRESOLVED: Résolution

    RmaRESOLVED --> REPAIR: Réparation
    RmaRESOLVED --> SCRAP: Mise au rebut

    REPAIR --> QualityPending: Cycle qualité
    SCRAP --> Scrapped: Fin de vie
```

## Dépendances Inter-Services

| Service | Action | Quand |
|---------|--------|-------|
| Asset Service | `GET /assets/{id}` | Création ticket (vérifier SOLD) |
| Asset Service | `PATCH /assets/{id}/status` | RMA (→RMA), Résolution (→QUALITY_PENDING ou SCRAPPED) |
| Inventory Service | `POST /assets/{id}/move` | Réception RMA (RETURN) |
| Quality Service | `POST /quality/checks` | Résolution REPAIR |

## Types de Résolution

| Type | Action Asset | Action Quality |
|------|--------------|----------------|
| `REPAIR` | → QUALITY_PENDING | Nouveau cycle qualité |
| `REPLACE` | (hors scope MVP) | - |
| `REFUND` | (hors scope MVP) | - |
| `SCRAP` | → SCRAPPED | - |

## API Endpoints

### Tickets

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/sav/tickets` | Crée un ticket SAV |
| GET | `/sav/tickets/:id` | Récupère un ticket |

### RMA

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/sav/tickets/:ticketId/rma` | Crée un RMA |
| GET | `/sav/rma/:rmaId` | Récupère un RMA |
| POST | `/sav/rma/:rmaId/receive` | Réception RMA |
| POST | `/sav/rma/:rmaId/diagnose` | Diagnostic RMA |
| POST | `/sav/rma/:rmaId/resolve` | Résolution RMA |
| GET | `/sav/rma/:rmaId/diagnosis` | Historique diagnostics |

## Démarrage

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev    # Port 3008
```

## Tests

```bash
npm test
```

## Configuration

```env
PORT=3008
DATABASE_URL=postgresql://user:password@localhost:5432/sav
ASSET_SERVICE_URL=http://localhost:3000
INVENTORY_SERVICE_URL=http://localhost:3003
QUALITY_SERVICE_URL=http://localhost:3002
```

## Événements

| Événement | Déclencheur |
|-----------|-------------|
| `SavTicketCreated` | Création ticket |
| `RmaCreated` | Création RMA |
| `RmaReceived` | Réception RMA |
| `RmaDiagnosed` | Diagnostic RMA |
| `RmaResolved` | Résolution RMA |

## Limites v1

- Pas de portail client avancé
- Pas de SLA contractuel
- Pas de remboursement réel
- Pas de remplacement automatique
- Événements en console.log
