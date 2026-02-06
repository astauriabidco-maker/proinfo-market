# Asset Dossier Service — Sprint 23

## Philosophie

Le Dossier Machine est un **snapshot unifié et immuable** de toute l'histoire d'un Asset.

### Garanties

- **1 Asset = 1 Dossier unique** — Consolidation de 6 services sources
- **Append-only** — Jamais de modification d'un snapshot existant
- **Audit-ready** — Export PDF + JSON lisible par auditeur non technique
- **Traçabilité** — Sources vérifiables, événements datés

### ❌ Ce que le service ne fait JAMAIS

1. Modifier un événement passé
2. Supprimer une information négative (RMA, défaut)
3. Recalculer ou réécrire l'historique
4. Générer un dossier partiel sans sources

## Architecture

```
asset-dossier-service/
├── prisma/schema.prisma      # AssetDossierSnapshot
├── src/
│   ├── domain/               # Types (dossier, event, export)
│   ├── integrations/         # 6 clients lecture seule
│   ├── services/             # Builder + Export
│   ├── routes/               # 4 endpoints REST
│   └── tests/                # 5 tests obligatoires
```

## Contenu du Dossier (7 sections)

| # | Section | Source |
|---|---------|--------|
| 1 | Identité Asset | asset-service |
| 2 | Configuration CTO | cto-service |
| 3 | Historique reconditionnement | wms-service |
| 4 | Qualité & incidents | quality-service |
| 5 | SAV & RMA | sav-service |
| 6 | Logistique | inventory-service |
| 7 | Statut final | asset-service |

## API Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/asset-dossiers/:assetId/build` | Construire snapshot |
| GET | `/asset-dossiers/:assetId` | Vue JSON |
| GET | `/asset-dossiers/:assetId/export?format=ZIP` | Export audit |
| GET | `/asset-dossiers/:assetId/history` | Historique snapshots |

## Démarrage

```bash
cd services/asset-dossier-service
npm install
npm run db:generate
npm run dev
```

Port: **3011**

## Tests

```bash
npm test -- --testPathPattern=assetDossier --verbose
```

5 tests obligatoires :
1. ✅ `should_build_complete_asset_dossier`
2. ✅ `should_include_cto_decision_versions`
3. ✅ `should_include_quality_and_rma_history`
4. ✅ `should_export_audit_ready_bundle`
5. ✅ `should_not_modify_historical_events`

## Limites v1

- Pièces jointes non implémentées
- Origine fournisseur (procurement) à enrichir
- Pas de compression des snapshots anciens
