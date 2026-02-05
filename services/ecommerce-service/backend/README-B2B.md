# Comptes Clients B2B — Sprint 12

## Vue d'ensemble

Ce module implémente la gestion des comptes clients B2B pour ProInfo Market :
- Identification d'entreprises clientes
- Gestion multi-utilisateurs par entreprise
- Isolation stricte des données

## Modèle de données

### Company (Entreprise)
| Champ | Type | Description |
|-------|------|-------------|
| id | UUID | Identifiant unique |
| name | String | Raison sociale |
| customerRef | String (unique) | Clé de liaison ERP |
| createdAt | DateTime | Date création |

### User (Utilisateur B2B)
| Champ | Type | Description |
|-------|------|-------------|
| id | UUID | Identifiant unique |
| email | String (unique) | Email professionnel |
| keycloakId | String | ID SSO Keycloak |
| role | UserRole | Rôle dans l'entreprise |
| companyId | UUID | Entreprise associée |

## Rôles utilisateurs

| Rôle | Permissions |
|------|-------------|
| **ADMIN_CLIENT** | Gestion utilisateurs de l'entreprise |
| **ACHETEUR** | Création devis + commandes |
| **LECTURE** | Consultation uniquement |

## API Endpoints

### Entreprises
```
POST   /companies              # Créer entreprise (admin interne)
GET    /companies              # Lister entreprises (admin interne)
GET    /companies/:id          # Détail entreprise
```

### Utilisateurs
```
POST   /companies/:id/users    # Ajouter utilisateur (ADMIN_CLIENT)
GET    /companies/:id/users    # Lister utilisateurs
DELETE /companies/:id/users/:userId  # Supprimer (ADMIN_CLIENT)
```

### Profil
```
GET    /me                     # Profil utilisateur courant
```

## Authentification

### Production (Keycloak OIDC)
```bash
KEYCLOAK_URL=https://auth.proinfo.com
KEYCLOAK_REALM=proinfo-market
KEYCLOAK_CLIENT_ID=ecommerce-backend
```

### Développement (JWT simple)
```bash
JWT_SECRET=dev-secret-sprint-12
```

## Limites v1

❌ Pas de création de comptes en self-service  
❌ Une seule entreprise par utilisateur  
❌ Pas de multi-entités juridiques  
❌ Pas de facturation (Sprint ultérieur)  

## Tests

```bash
npm test -- --testPathPattern=company.service.test
```

Tests implémentés :
1. `should_create_company_with_unique_customer_ref`
2. `should_add_user_to_company`
3. `should_not_allow_user_from_other_company_access`
4. `should_restrict_actions_based_on_role`
