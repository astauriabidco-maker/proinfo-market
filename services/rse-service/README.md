# RSE Service — Sprint 24

## Philosophie

Le service RSE fournit des **métriques environnementales factuelles, documentées et opposables**.

### Garanties

- **Chaque métrique = une méthodologie versionnée** — Traçabilité complète
- **Pas de recalcul rétroactif** — Valeurs figées après création
- **Sources publiques uniquement** — ADEME, EPEAT, études vérifiables
- **Export audit-ready** — PDF/CSV/JSON pour directions achats/RSE

### ❌ Ce que le service ne fait JAMAIS

1. Afficher un indicateur sans source
2. Recalculer silencieusement une métrique existante
3. Utiliser un score propriétaire ou opaque
4. Arrondir pour embellir les résultats
5. Mélanger marketing et conformité

---

## Métriques V1

| Métrique | Unité | Source |
|----------|-------|--------|
| CO₂ évité | kg | ADEME Base Carbone 2024 |
| Eau économisée | L | EPEAT, études fabricants |
| Matières évitées | kg | Poids × facteur catégorie |

---

## API Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/rse/methodologies` | Créer version méthodologie |
| GET | `/rse/methodologies` | Lister versions |
| GET | `/rse/methodologies/active` | Méthodologie active |
| POST | `/rse/assets/:assetId/calculate` | Calculer métriques |
| GET | `/rse/assets/:assetId/metrics` | Lire métriques |
| GET | `/rse/reports?customerRef=X` | Rapport client |
| GET | `/rse/reports/export?format=PDF` | Export audit |

---

## Démarrage

```bash
cd services/rse-service
npm install
npm run db:generate
npm run dev  # Port 3012
```

---

## Tests

```bash
npm test -- --testPathPattern=rseCalculation --verbose
```

5 tests obligatoires :
1. ✅ `should_calculate_rse_metrics_per_asset`
2. ✅ `should_link_metrics_to_methodology_version`
3. ✅ `should_aggregate_metrics_per_customer`
4. ✅ `should_export_compliance_report`
5. ✅ `should_not_recalculate_existing_metrics`

---

## Hypothèses de Calcul

### CO₂ évité (kg)

Facteurs par catégorie (source ADEME 2024) :

| Catégorie | kg CO₂/unité |
|-----------|--------------|
| Laptop | 156 |
| Server | 1200 |
| Workstation | 250 |
| Desktop | 180 |

### Eau économisée (L)

Eau nécessaire à la production neuve évitée :

| Catégorie | Litres |
|-----------|--------|
| Laptop | 190 000 |
| Server | 500 000 |
| Workstation | 280 000 |
| Desktop | 200 000 |

### Matières évitées (kg)

`Poids × Facteur récupération` (85-90% selon catégorie)

---

## Limites V1

- Pas de Scope 3 complexe
- Pas de compensation carbone
- Pas de traçabilité fournisseur
- Facteurs fixes (pas de variation géographique)
