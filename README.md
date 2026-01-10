# 🇸🇳 NDORTEL — Système de Gestion Numérique de l'État Civil

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.0.0-emerald?style=for-the-badge" alt="Version">
  <img src="https://img.shields.io/badge/Sénégal-État%20Civil-green?style=for-the-badge" alt="Sénégal">
  <img src="https://img.shields.io/badge/Sécurité-85%25-blue?style=for-the-badge" alt="Sécurité">
  <img src="https://img.shields.io/badge/Conformité-CDP%202008--12-orange?style=for-the-badge" alt="Conformité CDP">
</p>

---

## 📖 À propos

**NDORTEL** (« Le Commencement » en Wolof) est une plateforme souveraine de gestion numérique de l'état civil pour la République du Sénégal. Elle permet l'enregistrement, la validation et la délivrance des actes de naissance avec signature électronique qualifiée.

### 🎯 Objectifs

- **Identité juridique universelle** — Garantir à chaque enfant sénégalais un acte de naissance
- **Souveraineté numérique** — Hébergement local et conformité aux lois sénégalaises
- **Intégrité cryptographique** — Signature PKI et audit trail inviolable
- **Détection de fraude** — IA Gindi (Google Gemini) pour l'analyse documentaire

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        NDORTEL Platform                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Frontend   │  │   Backend    │  │   Storage    │          │
│  │  React/Vite  │◄─┤  Express.js  │◄─┤   MinIO S3   │          │
│  │  TypeScript  │  │  TypeScript  │  │  AES-256-GCM │          │
│  │  TailwindCSS │  │     Zod      │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                 │                 │                   │
│         └────────────────┼─────────────────┘                   │
│                          ▼                                      │
│              ┌──────────────────────┐                          │
│              │     PostgreSQL       │                          │
│              │   Base de données    │                          │
│              └──────────────────────┘                          │
├─────────────────────────────────────────────────────────────────┤
│  Services externes:                                             │
│  • Google Gemini (IA détection fraude)                         │
│  • SENUM SA PKI (Signature qualifiée - à intégrer)             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛡️ Sécurité

Le système a fait l'objet d'un **audit de sécurité complet** (Décembre 2024) avec remédiation des vulnérabilités identifiées.

| Mesure | Implémentation |
|--------|----------------|
| **Authentification** | JWT HS512 + bcrypt (12 rounds) |
| **Chiffrement au repos** | AES-256-GCM (images biométriques) |
| **Chiffrement en transit** | TLS 1.3 |
| **Validation des entrées** | Zod sur toutes les routes API |
| **Protection DoS** | Rate limiting (100 req/15min) |
| **Journalisation** | Winston avec audit trail |
| **Tests automatisés** | Jest (50+ tests unitaires) |

### Score de sécurité

```
Initial:  45/100 ████░░░░░░ CRITIQUE
Actuel:   85/100 ████████░░ BON
Cible:    93/100 █████████░ PRODUCTION
```

---

## ⚖️ Conformité Réglementaire

### Loi n° 2008-12 (Protection des Données Personnelles)

- ✅ Registre des traitements (Art. 49)
- ✅ Droits des personnes concernées (Art. 62, 68, 69)
- ✅ API de gestion des consentements
- ✅ Journalisation des accès aux données
- ✅ Politique de confidentialité

### Code de la Famille (Décret 65-422)

- ✅ Numérotation conforme des actes
- ✅ Mentions obligatoires
- ✅ Workflow de validation hiérarchique

---

## 🚀 Installation

### Prérequis

- Node.js 20+
- PostgreSQL 15+
- Docker & Docker Compose (pour MinIO)

### 1. Cloner le dépôt

```bash
git clone https://github.com/votre-org/ndortel.git
cd ndortel
```

### 2. Configuration de l'environnement

```bash
# Backend
cp server/.env.example server/.env
# Éditer server/.env avec vos valeurs

# Variables requises:
# - JWT_SECRET (min 32 caractères en production)
# - DB_PASSWORD
# - GEMINI_API_KEY
# - MINIO_ACCESS_KEY / MINIO_SECRET_KEY
```

### 3. Base de données

```bash
# Créer la base
createdb ndortel

# Appliquer les migrations
psql -U postgres -d ndortel -f server/migrations/001_initial_schema.sql
psql -U postgres -d ndortel -f server/migrations/002_cdp_compliance_tables.sql
```

### 4. Stockage MinIO

```bash
docker-compose up -d minio
```

### 5. Démarrer les services

```bash
# Backend (port 5005)
cd server
npm install
npm run dev

# Frontend (port 3000)
cd ../client
npm install
npm run dev
```

### 6. Accéder à l'application

- **Frontend** : http://localhost:3000
- **API** : http://localhost:5005
- **Health check** : http://localhost:5005/health
- **MinIO Console** : http://localhost:9001

---

## 👥 Rôles Utilisateurs

| Rôle | Permissions |
|------|-------------|
| **AGENT_SAISIE** | Créer des actes, soumettre pour validation |
| **VALIDATEUR** | Valider/rejeter, signer électroniquement |
| **RESPONSABLE** | Superviser un centre, rapports |
| **ADMINISTRATEUR** | Gestion complète, utilisateurs, centres |

---

## 📁 Structure du Projet

```
ndortel/
├── client/                    # Frontend React
│   ├── src/
│   │   ├── components/        # Composants réutilisables
│   │   ├── context/           # AppContext (état global)
│   │   ├── services/          # API client
│   │   ├── views/             # Pages principales
│   │   └── types.ts           # Types TypeScript
│   └── vite.config.ts
│
├── server/                    # Backend Express
│   ├── src/
│   │   ├── config/            # Logger, sécurité
│   │   ├── middleware/        # Auth, validation, logging
│   │   ├── routes/            # Endpoints API
│   │   ├── services/          # Logique métier, CDP
│   │   └── index.ts           # Point d'entrée
│   ├── migrations/            # Scripts SQL
│   └── __tests__/             # Tests Jest
│
├── docker-compose.yml         # MinIO, Redis (optionnel)
└── docs/                      # Documentation
    ├── COMP-002-CDP/          # Conformité CDP
    └── AUDIT-SECURITE.docx    # Rapport d'audit
```

---

## 🔌 API Endpoints

### Authentification

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/login` | Connexion |
| GET | `/api/auth/me` | Utilisateur courant |

### Certificats

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/certificates` | Liste des actes |
| POST | `/api/certificates` | Créer un acte |
| PUT | `/api/certificates/:id` | Modifier un acte |
| PATCH | `/api/certificates/:id/status` | Changer le statut |

### Administration

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/users` | Liste des utilisateurs |
| POST | `/api/users` | Créer un utilisateur |
| GET | `/api/centers` | Liste des centres |
| POST | `/api/centers` | Créer un centre |

### Conformité CDP

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/cdp/requests` | Soumettre une demande de droits |
| GET | `/api/cdp/requests/:id` | Consulter le statut |
| POST | `/api/cdp/consents` | Enregistrer un consentement |
| GET | `/api/admin/cdp/statistics` | Rapport CDP (admin) |

---

## 🧪 Tests

```bash
# Tests unitaires backend
cd server
npm test

# Tests avec couverture
npm run test:coverage

# Tests E2E (Cypress)
cd client
npm run cypress:open
```

---

## 📊 Logs

Les logs sont stockés dans `server/logs/` avec rotation automatique :

| Fichier | Contenu | Rétention |
|---------|---------|-----------|
| `app-YYYY-MM-DD.log` | Logs applicatifs | 14 jours |
| `http-YYYY-MM-DD.log` | Requêtes HTTP | 7 jours |
| `audit-YYYY-MM-DD.log` | Actions sensibles | 90 jours |
| `error-YYYY-MM-DD.log` | Erreurs | 30 jours |

---

## 🗺️ Roadmap

### Phase 1 — MVP ✅
- [x] Gestion des actes de naissance
- [x] Authentification sécurisée
- [x] Signature électronique (simulation)
- [x] Détection de fraude IA

### Phase 2 — Sécurité ✅
- [x] Audit de sécurité complet
- [x] Chiffrement des images
- [x] Validation des entrées (Zod)
- [x] Logging structuré (Winston)

### Phase 3 — Conformité ✅
- [x] Conformité CDP (Loi 2008-12)
- [x] API droits des personnes
- [x] Documentation juridique

### Phase 4 — Production 🔜
- [ ] Intégration PKI SENUM SA
- [ ] Déploiement souverain (SENUM)
- [ ] Audit de pénétration externe
- [ ] Formation des agents

---

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/ma-fonctionnalite`)
3. Commit (`git commit -m 'feat: ajout fonctionnalité X'`)
4. Push (`git push origin feature/ma-fonctionnalite`)
5. Ouvrir une Pull Request

### Convention de commits

```
feat:     Nouvelle fonctionnalité
fix:      Correction de bug
security: Correction de sécurité
docs:     Documentation
refactor: Refactorisation
test:     Ajout de tests
```

---

## 📜 Licence

Ce projet est sous licence propriétaire. Tous droits réservés.

Développé pour la République du Sénégal 🇸🇳

---

## 📞 Contact

- **Équipe technique** : tech@ndortel.sn
- **Support** : 800 00 221 (numéro vert)
- **DPO** : dpo@ndortel.sn

---

<p align="center">
  <strong>NDORTEL</strong> — L'acte qui fonde la citoyenneté, la technologie qui la protège.
</p>