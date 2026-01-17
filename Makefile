# ============================================
# NDORTEL - Makefile Docker Development
# Version: 1.0.0
# Description: Commandes simplifiées pour Docker
# ============================================
# Usage:
#   make help          - Afficher l'aide
#   make up            - Démarrer tous les services
#   make down          - Arrêter tous les services
#   make logs          - Voir les logs
# ============================================

.PHONY: help up down restart logs build clean reset db-shell backend-shell frontend-shell test lint

# Variables
COMPOSE_FILE = docker-compose.dev.yml
COMPOSE = docker-compose -f $(COMPOSE_FILE)
PROJECT_NAME = ndortel

# Couleurs pour l'affichage
GREEN  = \033[0;32m
YELLOW = \033[0;33m
BLUE   = \033[0;34m
RED    = \033[0;31m
NC     = \033[0m # No Color

# ============================================
# AIDE
# ============================================
help:
	@echo ""
	@echo "$(BLUE)╔══════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(BLUE)║        NDORTEL - Commandes Docker Development                ║$(NC)"
	@echo "$(BLUE)╚══════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(GREEN)Services:$(NC)"
	@echo "  make up              Démarrer tous les services"
	@echo "  make up-tools        Démarrer avec outils (Adminer, MailHog)"
	@echo "  make down            Arrêter tous les services"
	@echo "  make restart         Redémarrer tous les services"
	@echo "  make status          Voir l'état des services"
	@echo ""
	@echo "$(GREEN)Logs:$(NC)"
	@echo "  make logs            Voir tous les logs (follow)"
	@echo "  make logs-backend    Logs du backend uniquement"
	@echo "  make logs-frontend   Logs du frontend uniquement"
	@echo "  make logs-db         Logs de PostgreSQL"
	@echo ""
	@echo "$(GREEN)Build:$(NC)"
	@echo "  make build           Construire les images"
	@echo "  make rebuild         Reconstruire sans cache"
	@echo ""
	@echo "$(GREEN)Base de données:$(NC)"
	@echo "  make db-shell        Ouvrir psql dans le conteneur"
	@echo "  make db-reset        Réinitialiser la base de données"
	@echo "  make db-backup       Sauvegarder la base de données"
	@echo "  make db-restore      Restaurer la base de données"
	@echo ""
	@echo "$(GREEN)Shells:$(NC)"
	@echo "  make backend-shell   Shell dans le conteneur backend"
	@echo "  make frontend-shell  Shell dans le conteneur frontend"
	@echo ""
	@echo "$(GREEN)Tests & Qualité:$(NC)"
	@echo "  make test            Lancer les tests backend"
	@echo "  make test-e2e        Lancer les tests Cypress"
	@echo "  make lint            Vérifier le code"
	@echo ""
	@echo "$(GREEN)Maintenance:$(NC)"
	@echo "  make clean           Nettoyer les conteneurs arrêtés"
	@echo "  make reset           Réinitialisation complète (⚠️  supprime données)"
	@echo "  make prune           Nettoyer tout Docker (images, volumes orphelins)"
	@echo ""
	@echo "$(YELLOW)URLs:$(NC)"
	@echo "  Frontend:      http://localhost:5173"
	@echo "  Backend API:   http://localhost:5005"
	@echo "  Health check:  http://localhost:5005/health"
	@echo "  MinIO Console: http://localhost:9001"
	@echo "  Adminer:       http://localhost:8080 (si --profile tools)"
	@echo ""

# ============================================
# SERVICES
# ============================================
up:
	@echo "$(GREEN)🚀 Démarrage des services NDORTEL...$(NC)"
	$(COMPOSE) up -d
	@echo "$(GREEN)✅ Services démarrés!$(NC)"
	@make status

up-tools:
	@echo "$(GREEN)🚀 Démarrage des services avec outils...$(NC)"
	$(COMPOSE) --profile tools up -d
	@echo "$(GREEN)✅ Services + outils démarrés!$(NC)"
	@make status

down:
	@echo "$(YELLOW)⏹️  Arrêt des services...$(NC)"
	$(COMPOSE) down
	@echo "$(GREEN)✅ Services arrêtés$(NC)"

restart:
	@echo "$(YELLOW)🔄 Redémarrage des services...$(NC)"
	$(COMPOSE) restart
	@echo "$(GREEN)✅ Services redémarrés$(NC)"

status:
	@echo ""
	@echo "$(BLUE)📊 État des services:$(NC)"
	@$(COMPOSE) ps
	@echo ""

# ============================================
# LOGS
# ============================================
logs:
	$(COMPOSE) logs -f

logs-backend:
	$(COMPOSE) logs -f backend

logs-frontend:
	$(COMPOSE) logs -f frontend

logs-db:
	$(COMPOSE) logs -f postgres

# ============================================
# BUILD
# ============================================
build:
	@echo "$(GREEN)🔨 Construction des images...$(NC)"
	$(COMPOSE) build
	@echo "$(GREEN)✅ Images construites$(NC)"

rebuild:
	@echo "$(GREEN)🔨 Reconstruction des images (sans cache)...$(NC)"
	$(COMPOSE) build --no-cache
	@echo "$(GREEN)✅ Images reconstruites$(NC)"

# ============================================
# BASE DE DONNÉES
# ============================================
db-shell:
	@echo "$(GREEN)🐘 Connexion à PostgreSQL...$(NC)"
	$(COMPOSE) exec postgres psql -U ndortel -d ndortel

db-reset:
	@echo "$(RED)⚠️  Réinitialisation de la base de données...$(NC)"
	@read -p "Êtes-vous sûr? [y/N] " confirm && [ "$$confirm" = "y" ]
	$(COMPOSE) down -v
	$(COMPOSE) up -d postgres
	@echo "$(GREEN)✅ Base de données réinitialisée$(NC)"

db-backup:
	@echo "$(GREEN)💾 Sauvegarde de la base de données...$(NC)"
	@mkdir -p ./backups
	$(COMPOSE) exec -T postgres pg_dump -U ndortel ndortel > ./backups/ndortel_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)✅ Sauvegarde créée dans ./backups/$(NC)"

db-restore:
	@echo "$(YELLOW)📥 Restauration de la base de données...$(NC)"
	@if [ -z "$(FILE)" ]; then echo "$(RED)Erreur: Spécifiez FILE=chemin/vers/backup.sql$(NC)"; exit 1; fi
	$(COMPOSE) exec -T postgres psql -U ndortel -d ndortel < $(FILE)
	@echo "$(GREEN)✅ Base de données restaurée$(NC)"

# ============================================
# SHELLS
# ============================================
backend-shell:
	$(COMPOSE) exec backend sh

frontend-shell:
	$(COMPOSE) exec frontend sh

# ============================================
# TESTS
# ============================================
test:
	@echo "$(GREEN)🧪 Lancement des tests backend...$(NC)"
	$(COMPOSE) exec backend npm test

test-e2e:
	@echo "$(GREEN)🧪 Lancement des tests E2E Cypress...$(NC)"
	$(COMPOSE) exec frontend npm run cypress:run

lint:
	@echo "$(GREEN)🔍 Vérification du code...$(NC)"
	$(COMPOSE) exec backend npm run lint 2>/dev/null || echo "Pas de script lint configuré"
	$(COMPOSE) exec frontend npm run lint 2>/dev/null || echo "Pas de script lint configuré"

# ============================================
# MAINTENANCE
# ============================================
clean:
	@echo "$(YELLOW)🧹 Nettoyage des conteneurs arrêtés...$(NC)"
	docker container prune -f
	@echo "$(GREEN)✅ Nettoyage terminé$(NC)"

reset:
	@echo "$(RED)⚠️  ATTENTION: Ceci supprimera TOUTES les données!$(NC)"
	@read -p "Êtes-vous vraiment sûr? [y/N] " confirm && [ "$$confirm" = "y" ]
	$(COMPOSE) down -v --remove-orphans
	docker volume rm -f ndortel-postgres-data-dev ndortel-minio-data-dev ndortel-backend-logs-dev 2>/dev/null || true
	@echo "$(GREEN)✅ Réinitialisation complète effectuée$(NC)"

prune:
	@echo "$(RED)⚠️  Nettoyage complet de Docker...$(NC)"
	@read -p "Êtes-vous sûr? [y/N] " confirm && [ "$$confirm" = "y" ]
	docker system prune -af --volumes
	@echo "$(GREEN)✅ Docker nettoyé$(NC)"

# ============================================
# MONITORING RAPIDE
# ============================================
health:
	@echo "$(BLUE)🏥 Vérification de santé des services:$(NC)"
	@echo ""
	@curl -s http://localhost:5005/health | jq . 2>/dev/null || echo "Backend: $(RED)❌ Non disponible$(NC)"
	@echo ""
	@curl -s http://localhost:5173 > /dev/null 2>&1 && echo "Frontend: $(GREEN)✅ OK$(NC)" || echo "Frontend: $(RED)❌ Non disponible$(NC)"
	@curl -s http://localhost:9000/minio/health/live > /dev/null 2>&1 && echo "MinIO: $(GREEN)✅ OK$(NC)" || echo "MinIO: $(RED)❌ Non disponible$(NC)"
	@$(COMPOSE) exec -T postgres pg_isready -U ndortel > /dev/null 2>&1 && echo "PostgreSQL: $(GREEN)✅ OK$(NC)" || echo "PostgreSQL: $(RED)❌ Non disponible$(NC)"
	@echo ""
