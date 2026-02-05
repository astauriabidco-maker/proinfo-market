# Reporting RSE Service v1

Service de reporting RSE et valorisation environnementale B2B.

## Philosophie

> **Le RSE informe, il ne décide pas.**

Les indicateurs RSE sont calculés une fois et figés. Ils n'impactent jamais les règles de vente.

## Architecture

```
reporting-service/
├── prisma/
│   └── schema.prisma          # RseSnapshot (figé)
└── src/
    ├── calculators/
    │   ├── co2.calculator.ts  # Facteurs CO2 hardcodés
    │   └── water.calculator.ts # Facteurs eau hardcodés
    ├── integrations/
    │   ├── asset.client.ts    # Lecture Asset
    │   ├── order.client.ts    # Lecture commandes
    │   └── quality.client.ts  # Lecture qualité
    └── services/
        └── reporting.service.ts
```

## Hypothèses RSE v1

### Facteurs environnementaux (hardcodés)

| Type | CO₂ évité (kg) | Eau économisée (L) | Énergie (kWh) |
|------|---------------:|-------------------:|--------------:|
| SERVER | 900 | 120 000 | 500 |
| WORKSTATION | 350 | 45 000 | 200 |
| LAPTOP | 200 | 30 000 | 120 |
| DEFAULT | 150 | 20 000 | 100 |

### Méthodologie

- **CO₂** : Différence entre fabrication neuf (~1000 kg) et reconditionnement (~100 kg)
- **Eau** : Empreinte eau totale chaîne de fabrication vs. reconditionnement
- **Énergie** : Consommation énergétique de production évitée

### Sources

- Études LCA (Life Cycle Assessment) du secteur IT
- Water Footprint Network
- Moyennes sectorielles consolidées

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/reporting/assets/{assetId}/calculate` | Calcule et fige le snapshot RSE |
| GET | `/reporting/assets/{assetId}` | Récupère les valeurs RSE |
| GET | `/reporting/customers/{customerRef}` | Rapport agrégé par client |
| GET | `/reporting/methodology` | Expose la méthodologie |

### Exemple de réponse `/reporting/assets/{assetId}`

```json
{
  "co2SavedKg": 900,
  "waterSavedL": 120000,
  "energySavedKwh": 500
}
```

### Exemple de réponse `/reporting/customers/{customerRef}`

```json
{
  "customerRef": "CLIENT-ACME",
  "assetCount": 5,
  "totalCo2SavedKg": 3500,
  "totalWaterSavedL": 400000,
  "totalEnergySavedKwh": 1800,
  "generatedAt": "2026-02-05T00:00:00Z"
}
```

## Usage B2B Recommandé

### Pour un client B2B

- **Justifier un achat reconditionné** : Intégrer les valeurs RSE dans les rapports RSE annuels
- **Communication interne** : Valoriser les choix durables auprès des équipes

### Pour un décideur

- **Comparaison neuf vs reconditionné** : Chiffrer l'impact environnemental
- **ROI environnemental** : Données factuelles pour arbitrage

### Pour un investisseur

- **Avantage structurel** : Modèle aligné sur les enjeux ESG
- **Différenciation** : Valeur ajoutée mesurable

## Démarrage

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev    # Port 3009
```

## Tests

```bash
npm test
```

## Configuration

```env
PORT=3009
DATABASE_URL=postgresql://user:password@localhost:5432/reporting
ASSET_SERVICE_URL=http://localhost:3000
ECOMMERCE_SERVICE_URL=http://localhost:3006
QUALITY_SERVICE_URL=http://localhost:3002
```

## Limites Méthodologiques v1

- **Valeurs moyennes** : Non spécifiques au modèle exact de l'équipement
- **Transport non inclus** : Logistique non comptabilisée
- **Consommables exclus** : Emballage, accessoires non comptés
- **Pas de certification** : Estimations internes, non certifiées par tiers
- **Snapshot unique** : Pas de recalcul rétroactif

## Disclaimer

> Ces valeurs sont des estimations basées sur des moyennes sectorielles.
> Elles ne constituent pas une certification officielle et sont fournies
> à titre indicatif pour valoriser l'impact environnemental du reconditionnement.
