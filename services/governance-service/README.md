# Governance Service — Sprint 27

## Modèle de Gouvernance

Pouvoir distribué, traçabilité complète, pas de super-admin.

### Principes

1. **Permissions explicites** — Pas d'implicite
2. **Délégation temporaire** — Révocable, traçable, avec expiration
3. **Journal décisions** — Append-only, jamais modifié
4. **Pas de bypass** — UnauthorizedOverrideError

---

## API Endpoints

### Rôles

| Endpoint | Description |
|----------|-------------|
| `GET /governance/roles` | Liste des rôles |
| `POST /governance/roles` | Créer rôle |

### Délégations

| Endpoint | Description |
|----------|-------------|
| `POST /governance/delegations` | Créer délégation |
| `POST /governance/delegations/:id/revoke` | Révoquer |
| `POST /governance/delegations/expire` | Cron expiration |

### Décisions (Audit)

| Endpoint | Description |
|----------|-------------|
| `GET /governance/decisions?period=LAST_30_DAYS` | Audit |
| `GET /governance/decisions/stats` | Statistiques |

---

## Démarrage

```bash
cd services/governance-service
npm install
npm run db:generate
npm run dev  # Port 3015
```

---

## Tests

```bash
npm test -- --testPathPattern=governance --verbose
```

---

## Limites V1

- Pas de workflow BPM
- Pas de hiérarchie rigide
- Notifications manuelles
