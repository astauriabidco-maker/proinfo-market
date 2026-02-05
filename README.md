# ProInfo Market — IT Refurbishing Platform

## 🎯 Aperçu

Plateforme ERP + WMS + CTO pour le reconditionnement informatique B2B.

### Services

| Service | Port | Description |
|---------|------|-------------|
| asset-service | 3000 | Gestion des actifs |
| procurement-service | 3001 | Approvisionnement |
| quality-service | 3002 | Contrôle qualité |
| inventory-service | 3003 | Gestion des stocks |
| wms-service | 3004 | Warehouse Management |
| cto-service | 3005 | Configure-to-Order |
| ecommerce-backend | 3006 | API E-commerce B2B |
| ecommerce-frontend | 3007 | Interface client |
| sav-service | 3008 | SAV & RMA |

---

## 🚀 Démarrage Rapide

### Prérequis

- Node.js 20+
- PostgreSQL 15+
- Docker (optionnel)

### Installation

```bash
# Cloner et installer
cd ProInfo-Market.com

# Setup des bases de données
chmod +x scripts/setup-databases.sh
./scripts/setup-databases.sh

# Copier les .env
for service in services/*/; do
  cp "$service/.env.example" "$service/.env" 2>/dev/null || true
done

# Installer les dépendances partagées
cd shared && npm install && npm run build && cd ..

# Installer E2E tests
cd e2e-tests && npm install && cd ..
```

### Démarrer les services

```bash
# Terminal 1: Asset Service
cd services/asset-service && npm run dev

# Terminal 2: Quality Service
cd services/quality-service && npm run dev

# ... répéter pour chaque service
```

### Lancer les tests E2E

```bash
cd e2e-tests

# Tous les tests
npm test

# Un scénario spécifique
npm run test:sales   # Vente complète
npm run test:quality # Blocage qualité
npm run test:rma     # Cycle RMA
```

---

## 🔐 Sécurité

### Authentification

- **OIDC** via Keycloak
- **JWT** avec vérification JWKS
- **4 rôles** : ADMIN, OPS, SAV, B2B_CLIENT

### Configuration Keycloak

```env
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=proinfo
KEYCLOAK_CLIENT_ID=<service-name>
```

---

## 📊 Flux Critiques

### 1. Vente Complète

```
Procurement → Intake → Qualité OK → Stock → CTO → Commande → Picking → Expédition
```

### 2. Blocage Qualité

```
Intake → Qualité FAIL → ❌ Vente interdite
```

### 3. Cycle RMA

```
Vente → SAV → RMA → Repair → Qualité → Revente
              └→ Scrap → Fin de vie
```

---

## 📁 Structure

```
ProInfo-Market.com/
├── services/
│   ├── asset-service/
│   ├── procurement-service/
│   ├── quality-service/
│   ├── inventory-service/
│   ├── wms-service/
│   ├── cto-service/
│   ├── ecommerce-service/
│   │   ├── backend/
│   │   └── frontend/
│   └── sav-service/
├── shared/               # Modules partagés
│   └── src/
│       ├── auth/         # Keycloak middleware
│       ├── logging/      # Logger structuré
│       ├── validation/   # Schemas Zod
│       └── http/         # Client HTTP robuste
├── e2e-tests/            # Tests E2E
└── scripts/              # Scripts utilitaires
```

---

## 🧪 Tests

### Tests Unitaires (par service)

```bash
cd services/<service-name>
npm test
```

### Tests E2E

```bash
cd e2e-tests
npm test
```

---

## 📝 Limites MVP

- Pas d'authentification client avancée
- Pas de paiement réel
- Pas de gestion SLA
- Événements en console.log
- Pas de reporting BI

---

## 🛠️ Développement

### Logs structurés

Chaque service utilise le logger partagé :

```typescript
import { createLogger } from '@proinfo/shared';
const logger = createLogger('asset-service');

logger.assetStatusChange(assetId, 'INTAKE', 'SELLABLE', userId);
```

### Validation

```typescript
import { CreateAssetSchema, validateBody } from '@proinfo/shared';

router.post('/assets', validateBody(CreateAssetSchema), controller.create);
```

---

## 📞 Support

Pour toute question technique, référez-vous aux README individuels de chaque service.
