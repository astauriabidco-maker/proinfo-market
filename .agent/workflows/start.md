---
description: Démarrage rapide de tous les services ProInfo-Market
---

# Démarrage des Services ProInfo-Market

// turbo-all

## 1. Vérifier et démarrer Docker
```bash
open -a Docker && sleep 5
```

## 2. Libérer les ports potentiellement occupés
```bash
lsof -ti :3000,:3001,:3002,:3003,:3004,:3005 | xargs kill -9 2>/dev/null || true
```

## 3. Démarrer l'infrastructure (PostgreSQL + Keycloak)
```bash
cd /Users/user/Documents/DEVELOPPEMENTS/Projets/ProInfo-Market.com && docker-compose up -d postgres keycloak
```

## 4. Attendre que PostgreSQL soit prêt
```bash
sleep 5
```

## 5. Démarrer les services (dans des terminaux séparés)
Exécuter chaque commande dans un terminal différent :

```bash
cd /Users/user/Documents/DEVELOPPEMENTS/Projets/ProInfo-Market.com/services/asset-service && npm run dev
```

```bash
cd /Users/user/Documents/DEVELOPPEMENTS/Projets/ProInfo-Market.com/services/procurement-service && npm run dev
```

```bash
cd /Users/user/Documents/DEVELOPPEMENTS/Projets/ProInfo-Market.com/services/quality-service && npm run dev
```

```bash
cd /Users/user/Documents/DEVELOPPEMENTS/Projets/ProInfo-Market.com/services/inventory-service && npm run dev
```

```bash
cd /Users/user/Documents/DEVELOPPEMENTS/Projets/ProInfo-Market.com/services/wms-service && npm run dev
```

```bash
cd /Users/user/Documents/DEVELOPPEMENTS/Projets/ProInfo-Market.com/services/cto-service && npm run dev
```

## 6. Vérifier que tous les services sont opérationnels
```bash
for port in 3000 3001 3002 3003 3004 3005; do curl -s -o /dev/null -w "Port $port: %{http_code}\n" http://localhost:$port/health; done
```

---

## Ports des Services

| Service | Port |
|---------|------|
| asset-service | 3000 |
| procurement-service | 3001 |
| quality-service | 3002 |
| inventory-service | 3003 |
| wms-service | 3004 |
| cto-service | 3005 |
| PostgreSQL | 5437 |
| Keycloak | 8080 |

## Credentials

- **PostgreSQL**: `proinfo:proinfo@localhost:5437`
- **Keycloak Admin**: `admin:admin` sur http://localhost:8080
