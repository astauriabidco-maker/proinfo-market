# CTO Engine — Sprint 22

## Philosophie

Le CTO Engine est le cœur de la validation des configurations informatiques. Il doit être :

- **Déterministe** : même entrée = même sortie, toujours
- **Versionné** : chaque règle est immuable, une modification crée une nouvelle version
- **Auditable** : chaque décision est tracée avec explications
- **Opposable** : reproductible dans le temps pour audit client/interne

## Garanties Contractuelles

### ❌ Ce que le CTO Engine ne fait JAMAIS

1. **Pas d'IA générative** — Toute logique est explicite
2. **Pas de probabilités** — Décisions binaires ACCEPT/REJECT
3. **Pas de modification rétroactive** — Append-only
4. **Pas de recalcul** — Une config validée reste figée

### ✅ Ce que le CTO Engine garantit

1. **Traçabilité complète** — Chaque décision référence sa version de règle
2. **Explications lisibles** — Machine ET humain
3. **Reproductibilité** — Config de 2026 explicable en 2030
4. **Simulation sûre** — What-if sans effet de bord

## Architecture

```
cto-service/
├── domain/
│   ├── ctoRule.types.ts         # Règles versionnées
│   ├── ctoDecision.types.ts     # Décisions auditables
│   └── ctoSimulation.types.ts   # Simulation éphémère
├── services/
│   ├── ctoRuleEngine.service.ts      # Moteur d'évaluation
│   ├── ctoDecisionAudit.service.ts   # Audit des décisions
│   └── ctoSimulation.service.ts      # What-if (read-only)
└── routes/
    ├── cto.rules.routes.ts      # CRUD règles versionnées
    ├── cto.decisions.routes.ts  # Audit API
    └── cto.simulation.routes.ts # POST /cto/simulate
```

## API Endpoints

### Règles

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/cto/rules` | Liste règles actives |
| POST | `/cto/rules` | Nouvelle version règle |
| GET | `/cto/rules/:id/versions` | Historique versions |

### Audit

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/cto/decisions/:configId` | Audit complet |

### Simulation

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/cto/simulate` | What-if (non persisté) |

## Modèle de Données

```prisma
model CtoRuleVersion {
  id        String   @id
  ruleId    String
  version   Int
  logic     Json     // Logique explicite
  // Append-only : jamais modifié
}

model CtoDecision {
  id              String
  configurationId String
  ruleVersionId   String  // Référence exacte
  result          ACCEPT | REJECT
  explanations    CtoDecisionExplanation[]
}
```

## Tests

5 tests obligatoires validés :

1. ✅ `should_version_rules_without_overwrite`
2. ✅ `should_audit_decisions_with_rule_versions`
3. ✅ `should_explain_rejected_configuration`
4. ✅ `should_not_recalculate_validated_configuration`
5. ✅ `should_simulate_what_if_without_side_effect`

## Exemple d'Utilisation

### Créer une règle

```bash
POST /cto/rules
{
  "ruleId": "CPU_MOTHERBOARD_COMPAT",
  "name": "CPU Motherboard Compatibility",
  "description": "Xeon Gold requires Z690 or newer",
  "logic": {
    "type": "COMPATIBILITY",
    "conditions": [
      { "field": "component.reference", "operator": "CONTAINS", "value": "Xeon-Gold" }
    ],
    "action": "BLOCK",
    "message": "CPU Xeon Gold incompatible avec carte mère {value}"
  }
}
```

### Simuler un changement

```bash
POST /cto/simulate
{
  "baseConfigurationId": "config-123",
  "components": [
    { "type": "RAM", "reference": "128GB-ECC", "quantity": 4 }
  ]
}
```

Réponse :
```json
{
  "success": true,
  "_notice": "⚠️ SIMULATION ONLY - Not persisted",
  "data": {
    "valid": true,
    "rulesPassed": ["CPU Compatibility", "RAM Requirements"],
    "rulesFailed": []
  }
}
```
