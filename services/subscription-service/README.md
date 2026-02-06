# Subscription Service — Sprint 26

## Modèle Économique : Récurrence Propre

Gestion des **contrats pluriannuels** et **renouvellement de parc** sans lock-in artificiel.

### Principes

1. **ARR déclaré** — Valeur explicite, pas de recalcul auto
2. **Pas de tacite reconduction** — Renouvellement = proposition
3. **Reprise traçable** — Chaque étape loggée
4. **Sortie propre** — Client libre de partir

---

## API Endpoints

### Contrats

| Endpoint | Description |
|----------|-------------|
| `POST /contracts` | Créer contrat |
| `GET /contracts/:id` | Détail (interne) |
| `GET /contracts/:id/client-view` | Vue client (pas d'ARR) |

### Renouvellements

| Endpoint | Description |
|----------|-------------|
| `GET /renewals` | À venir (90j) |
| `POST /renewals/:id/execute` | Exécuter (EXPLICITE) |
| `GET /renewals/:id/takebacks` | Reprises associées |

---

## Cycle Long

```
Contrat (24-36 mois)
    ↓
RenewalPlan (J-90, J-60, J-30)
    ↓
Exécution EXPLICITE
    ↓
TakebackOrders (collecte → wipe → WMS)
    ↓
Asset recyclé/revendu
```

---

## Démarrage

```bash
cd services/subscription-service
npm install
npm run db:generate
npm run dev  # Port 3014
```

---

## Tests

```bash
npm test -- --testPathPattern=subscription --verbose
```

5 tests obligatoires :
1. ✅ `should_create_contract_with_arr`
2. ✅ `should_plan_renewal_on_contract_creation`
3. ✅ `should_not_auto_renew_contract`
4. ✅ `should_execute_takeback_on_renewal`
5. ✅ `should_expose_contract_visibility_to_client`

---

## Limites V1

- Pas de leasing financier
- Pas de pricing dynamique
- Pas de renouvellement tacite
- Notifications internes uniquement (pas de spam client)
