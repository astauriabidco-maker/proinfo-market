# Integration Service — Sprint 25

## Philosophie : Lock-in Propre

Le service expose des **API stables, versionnées et documentées** permettant l'intégration ITSM/ERP sans créer de dépendances spécifiques par client.

### Principes

1. **Clients s'adaptent à l'API** — Pas de custom endpoint
2. **Isolation tenant stricte** — Une ApiKey = une entreprise
3. **Scopes explicites** — Lecture majoritaire, écriture minimale
4. **Webhooks signés** — HMAC SHA256 obligatoire

---

## API v1 — Périmètre

### Lecture (prioritaire)

| Endpoint | Scope | Description |
|----------|-------|-------------|
| `GET /api/v1/assets` | read:assets | Liste des assets |
| `GET /api/v1/assets/:id` | read:assets | Détail asset |
| `GET /api/v1/assets/:id/dossier` | read:assets | Dossier machine |
| `GET /api/v1/rse/reports` | read:rse | Rapport RSE |
| `GET /api/v1/sav/tickets` | read:sav | Tickets SAV |

### Écriture (minimale)

| Endpoint | Scope | Description |
|----------|-------|-------------|
| `POST /api/v1/sav/tickets` | write:sav | Créer ticket |

---

## Authentification

```
X-API-Key: pim_<32_hex_chars>
```

Scopes disponibles :
- `read:assets` — Assets et dossiers machine
- `read:rse` — Rapports RSE
- `read:sav` — Tickets SAV
- `write:sav` — Création tickets

---

## Webhooks

| Event | Payload |
|-------|---------|
| `ASSET_SHIPPED` | assetId, trackingNumber |
| `RMA_CREATED` | rmaId, assetId, ticketRef |
| `RMA_RESOLVED` | rmaId, resolution |
| `INVOICE_ISSUED` | invoiceId, amount |

Signature : `X-Webhook-Signature: sha256=<HMAC>`

---

## Démarrage

```bash
cd services/integration-service
npm install
npm run db:generate
npm run dev  # Port 3013
```

---

## Tests

```bash
npm test -- --testPathPattern=integration --verbose
```

5 tests obligatoires :
1. ✅ `should_enforce_api_scope_access`
2. ✅ `should_isolate_client_data`
3. ✅ `should_version_api_without_breaking_v1`
4. ✅ `should_dispatch_webhook_on_event`
5. ✅ `should_not_allow_unauthorized_writes`

---

## Limites V1

- Pas de SDK client
- Pas de GraphQL
- Pas de sync bidirectionnelle
- Rate limit : 1000 req/heure par défaut
