# 🐳 NDORTEL - Configuration Docker pour le Développement

<p align="center">
  <img src="https://img.shields.io/badge/Docker-24.0+-blue?style=for-the-badge&logo=docker" alt="Docker">
  <img src="https://img.shields.io/badge/PostgreSQL-15-336791?style=for-the-badge&logo=postgresql" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/MinIO-S3-red?style=for-the-badge&logo=minio" alt="MinIO">
</p>

---

## 📋 Table des Matières

- [Prérequis](#-prérequis)
- [Démarrage Rapide](#-démarrage-rapide)
- [Architecture](#-architecture)
- [Services Disponibles](#-services-disponibles)
- [Configuration](#-configuration)
- [Commandes Utiles](#-commandes-utiles)
- [Développement](#-développement)
- [Dépannage](#-dépannage)

---

## 🔧 Prérequis

Avant de commencer, assurez-vous d'avoir installé:

| Outil | Version Minimum | Vérification |
|-------|-----------------|--------------|
| Docker | 24.0+ | `docker --version` |
| Docker Compose | 2.20+ | `docker compose version` |
| Make (optionnel) | 4.0+ | `make --version` |

### Installation Docker

**macOS:**
```bash
brew install --cask docker
```

**Ubuntu/Debian:**
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

**Windows:**
Télécharger [Docker Desktop](https://www.docker.com/products/docker-desktop/)

---

## 🚀 Démarrage Rapide

### Option 1: Script Automatique (Recommandé)

```bash
# Rendre le script exécutable
chmod +x start.sh

# Démarrer l'environnement
./start.sh

# Avec tous les outils (Adminer, MailHog)
./start.sh --full
```

### Option 2: Make

```bash
# Démarrer
make up

# Avec outils
make up-tools

# Voir l'aide
make help
```

### Option 3: Docker Compose Direct

```bash
# Copier la configuration
cp .env.docker.example .env

# Construire et démarrer
docker-compose -f docker-compose.dev.yml up -d --build

# Avec outils additionnels
docker-compose -f docker-compose.dev.yml --profile tools up -d
```

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Réseau Docker: ndortel-network              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Frontend   │    │   Backend    │    │  PostgreSQL  │      │
│  │   (React)    │◄──►│  (Express)   │◄──►│     (15)     │      │
│  │   :5173      │    │   :5005      │    │    :5432     │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                              │                                   │
│                              ▼                                   │
│                      ┌──────────────┐                           │
│                      │    MinIO     │                           │
│                      │  (S3 Store)  │                           │
│                      │  :9000/:9001 │                           │
│                      └──────────────┘                           │
│                                                                  │
│  ┌──────────────────────── Optionnel ─────────────────────────┐│
│  │  ┌──────────┐    ┌──────────┐                              ││
│  │  │ Adminer  │    │ MailHog  │                              ││
│  │  │  :8080   │    │  :8025   │                              ││
│  │  └──────────┘    └──────────┘                              ││
│  └────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Services Disponibles

### Services Principaux

| Service | Port | URL | Description |
|---------|------|-----|-------------|
| **Frontend** | 5173 | http://localhost:5173 | Application React/Vite |
| **Backend** | 5005 | http://localhost:5005 | API Express.js |
| **PostgreSQL** | 5432 | - | Base de données |
| **MinIO** | 9000/9001 | http://localhost:9001 | Stockage S3 |

### Services Optionnels (profile: tools)

| Service | Port | URL | Description |
|---------|------|-----|-------------|
| **Adminer** | 8080 | http://localhost:8080 | Interface DB |
| **MailHog** | 8025 | http://localhost:8025 | Capture emails |

---

## ⚙️ Configuration

### Variables d'Environnement

Copiez `.env.docker.example` en `.env` et personnalisez:

```bash
cp .env.docker.example .env
```

#### Variables Principales

```env
# Base de données
DB_NAME=ndortel
DB_USER=ndortel
DB_PASSWORD=ndortel_dev_2025

# Sécurité JWT (CHANGER EN PRODUCTION!)
JWT_SECRET=dev-secret-ndortel-change-in-production-minimum-64-chars-required

# MinIO
MINIO_ACCESS_KEY=ndortel-admin
MINIO_SECRET_KEY=SecureMinioPass2025!

# Google Gemini AI (optionnel)
GEMINI_API_KEY=votre_cle_api
```

### Identifiants par Défaut

| Service | Identifiant | Mot de passe |
|---------|-------------|--------------|
| Application | admin@ndortel.sn | Admin@2025! |
| PostgreSQL | ndortel | ndortel_dev_2025 |
| MinIO | ndortel-admin | SecureMinioPass2025! |

---

## 📋 Commandes Utiles

### Avec Make

```bash
# Services
make up              # Démarrer
make up-tools        # Démarrer avec outils
make down            # Arrêter
make restart         # Redémarrer
make status          # État des services

# Logs
make logs            # Tous les logs
make logs-backend    # Logs backend
make logs-frontend   # Logs frontend
make logs-db         # Logs PostgreSQL

# Base de données
make db-shell        # Console psql
make db-backup       # Sauvegarder
make db-reset        # Réinitialiser

# Shells
make backend-shell   # Shell backend
make frontend-shell  # Shell frontend

# Tests
make test            # Tests backend
make test-e2e        # Tests Cypress

# Maintenance
make clean           # Nettoyer
make reset           # Réinitialisation complète
make health          # Vérifier la santé
```

### Avec Docker Compose

```bash
# Démarrer
docker-compose -f docker-compose.dev.yml up -d

# Arrêter
docker-compose -f docker-compose.dev.yml down

# Logs
docker-compose -f docker-compose.dev.yml logs -f backend

# Shell
docker-compose -f docker-compose.dev.yml exec backend sh

# Rebuild
docker-compose -f docker-compose.dev.yml up -d --build
```

---

## 💻 Développement

### Structure des Dossiers

```
ndortel-docker/
├── backend/                  # Code source backend
│   ├── src/                  # Sources TypeScript
│   └── package.json
├── frontend/                 # Code source frontend
│   ├── src/                  # Sources React
│   └── package.json
├── database/
│   └── init/                 # Scripts SQL d'init
│       └── 001_initial_schema.sql
├── backups/                  # Sauvegardes DB
├── docker-compose.dev.yml    # Orchestration
├── Dockerfile.backend.dev    # Image backend
├── Dockerfile.frontend.dev   # Image frontend
├── .env.docker.example       # Template env
├── .dockerignore            
├── Makefile                  # Commandes
├── start.sh                  # Script démarrage
└── README.md
```

### Hot Reload

Le hot-reload est activé automatiquement:

- **Frontend**: Vite HMR sur les modifications dans `frontend/src/`
- **Backend**: Nodemon sur les modifications dans `backend/src/`

Les volumes Docker montent le code source, permettant les modifications en temps réel.

### Debug Node.js

Le port de debug `9229` est exposé. Configurez votre IDE:

**VS Code** (`.vscode/launch.json`):
```json
{
  "type": "node",
  "request": "attach",
  "name": "Docker: Attach to Node",
  "port": 9229,
  "address": "localhost",
  "localRoot": "${workspaceFolder}/backend",
  "remoteRoot": "/app",
  "restart": true
}
```

### Tests

```bash
# Tests unitaires backend
make test

# Tests E2E Cypress
make test-e2e

# Avec couverture
docker-compose -f docker-compose.dev.yml exec backend npm run test:coverage
```

---

## 🔍 Dépannage

### Problèmes Courants

#### Le backend ne démarre pas

```bash
# Vérifier les logs
make logs-backend

# Causes possibles:
# - PostgreSQL pas prêt → Attendre 30s
# - Port 5005 déjà utilisé → Changer BACKEND_PORT dans .env
# - Erreur de syntaxe → Vérifier les modifications récentes
```

#### PostgreSQL ne se connecte pas

```bash
# Vérifier que le conteneur est actif
docker-compose -f docker-compose.dev.yml ps postgres

# Tester la connexion
docker-compose -f docker-compose.dev.yml exec postgres pg_isready

# Réinitialiser si corrompu
make db-reset
```

#### Hot reload ne fonctionne pas

```bash
# macOS/Windows: Vérifier les ressources Docker Desktop
# Allouer au moins 4GB de RAM

# Linux: Vérifier inotify
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

#### Permission denied sur les volumes

```bash
# Linux: Ajuster les permissions
sudo chown -R $USER:$USER ./backend ./frontend

# Ou utiliser les user namespaces Docker
```

#### Ports déjà utilisés

```bash
# Identifier le processus
lsof -i :5173
lsof -i :5005

# Changer les ports dans .env
FRONTEND_PORT=3001
BACKEND_PORT=5006
```

### Réinitialisation Complète

Si tout échoue:

```bash
# Option 1: Via Make
make reset

# Option 2: Manuellement
docker-compose -f docker-compose.dev.yml down -v --remove-orphans
docker volume prune -f
rm -f .env
./start.sh
```

### Logs Détaillés

```bash
# Tous les logs avec timestamps
docker-compose -f docker-compose.dev.yml logs -f --timestamps

# Logs d'un service spécifique
docker-compose -f docker-compose.dev.yml logs -f backend 2>&1 | tee backend.log
```

---

## 📞 Support

- **Documentation**: [README principal du projet]
- **Issues**: Ouvrir une issue sur le dépôt
- **Email**: tech@ndortel.sn

---

<p align="center">
  <strong>NDORTEL</strong> - Système de Gestion Numérique de l'État Civil<br>
  République du Sénégal 🇸🇳
</p>
