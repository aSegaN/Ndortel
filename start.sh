#!/bin/bash
# ============================================
# NDORTEL - Script de Démarrage Rapide
# Version: 1.0.0
# Description: Script d'initialisation pour le développement
# ============================================
# Usage:
#   ./start.sh          - Démarrage standard
#   ./start.sh --full   - Avec outils (Adminer, MailHog)
#   ./start.sh --reset  - Réinitialisation complète
# ============================================

set -e

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Variables
COMPOSE_FILE="docker-compose.dev.yml"

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║             NDORTEL - Environnement de Développement         ║${NC}"
echo -e "${BLUE}║                  Système d'État Civil Sénégal                 ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================
# VÉRIFICATIONS PRÉALABLES
# ============================================
check_requirements() {
    echo -e "${YELLOW}📋 Vérification des prérequis...${NC}"
    
    # Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker n'est pas installé${NC}"
        echo "   Installer: https://docs.docker.com/get-docker/"
        exit 1
    fi
    echo -e "   ${GREEN}✓${NC} Docker installé: $(docker --version | cut -d' ' -f3)"
    
    # Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo -e "${RED}❌ Docker Compose n'est pas installé${NC}"
        exit 1
    fi
    echo -e "   ${GREEN}✓${NC} Docker Compose installé"
    
    # Vérifier que Docker est en cours d'exécution
    if ! docker info &> /dev/null; then
        echo -e "${RED}❌ Docker n'est pas en cours d'exécution${NC}"
        echo "   Veuillez démarrer Docker Desktop ou le daemon Docker"
        exit 1
    fi
    echo -e "   ${GREEN}✓${NC} Docker daemon actif"
    
    echo ""
}

# ============================================
# CONFIGURATION ENVIRONNEMENT
# ============================================
setup_env() {
    echo -e "${YELLOW}⚙️  Configuration de l'environnement...${NC}"
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.docker.example" ]; then
            cp .env.docker.example .env
            echo -e "   ${GREEN}✓${NC} Fichier .env créé depuis .env.docker.example"
            echo -e "   ${YELLOW}ℹ️  Modifiez .env selon vos besoins${NC}"
        else
            echo -e "   ${YELLOW}⚠️  Pas de fichier .env trouvé, utilisation des valeurs par défaut${NC}"
        fi
    else
        echo -e "   ${GREEN}✓${NC} Fichier .env existant"
    fi
    
    echo ""
}

# ============================================
# CRÉATION DES RÉPERTOIRES
# ============================================
create_directories() {
    echo -e "${YELLOW}📁 Création des répertoires...${NC}"
    
    mkdir -p backend/src backend/logs
    mkdir -p frontend/src frontend/public
    mkdir -p database/init
    mkdir -p backups
    
    echo -e "   ${GREEN}✓${NC} Répertoires créés"
    echo ""
}

# ============================================
# VÉRIFICATION DU CODE SOURCE
# ============================================
check_source() {
    echo -e "${YELLOW}📂 Vérification du code source...${NC}"
    
    if [ ! -f "backend/package.json" ]; then
        echo -e "   ${RED}❌ backend/package.json manquant${NC}"
        echo -e "   ${YELLOW}ℹ️  Copiez le code source du backend dans ./backend/${NC}"
        exit 1
    fi
    echo -e "   ${GREEN}✓${NC} Backend trouvé"
    
    if [ ! -f "frontend/package.json" ]; then
        echo -e "   ${RED}❌ frontend/package.json manquant${NC}"
        echo -e "   ${YELLOW}ℹ️  Copiez le code source du frontend dans ./frontend/${NC}"
        exit 1
    fi
    echo -e "   ${GREEN}✓${NC} Frontend trouvé"
    
    echo ""
}

# ============================================
# DÉMARRAGE DES SERVICES
# ============================================
start_services() {
    local profile=""
    
    if [ "$1" = "--full" ]; then
        profile="--profile tools"
        echo -e "${GREEN}🚀 Démarrage avec tous les outils...${NC}"
    else
        echo -e "${GREEN}🚀 Démarrage des services...${NC}"
    fi
    
    echo ""
    
    # Build et démarrage
    docker-compose -f $COMPOSE_FILE $profile up -d --build
    
    echo ""
}

# ============================================
# ATTENTE DES SERVICES
# ============================================
wait_for_services() {
    echo -e "${YELLOW}⏳ Attente du démarrage des services...${NC}"
    
    # Attente PostgreSQL
    echo -n "   PostgreSQL: "
    for i in {1..30}; do
        if docker-compose -f $COMPOSE_FILE exec -T postgres pg_isready -U ndortel &> /dev/null; then
            echo -e "${GREEN}✓${NC}"
            break
        fi
        echo -n "."
        sleep 2
    done
    
    # Attente MinIO
    echo -n "   MinIO: "
    for i in {1..30}; do
        if curl -s http://localhost:9000/minio/health/live &> /dev/null; then
            echo -e "${GREEN}✓${NC}"
            break
        fi
        echo -n "."
        sleep 2
    done
    
    # Attente Backend
    echo -n "   Backend API: "
    for i in {1..60}; do
        if curl -s http://localhost:5005/health &> /dev/null; then
            echo -e "${GREEN}✓${NC}"
            break
        fi
        echo -n "."
        sleep 2
    done
    
    # Attente Frontend
    echo -n "   Frontend: "
    for i in {1..60}; do
        if curl -s http://localhost:5173 &> /dev/null; then
            echo -e "${GREEN}✓${NC}"
            break
        fi
        echo -n "."
        sleep 2
    done
    
    echo ""
}

# ============================================
# AFFICHAGE DES INFORMATIONS
# ============================================
show_info() {
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    ✅ NDORTEL PRÊT !                         ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}🌐 URLs d'accès:${NC}"
    echo -e "   Frontend:       ${GREEN}http://localhost:5173${NC}"
    echo -e "   Backend API:    ${GREEN}http://localhost:5005${NC}"
    echo -e "   Health Check:   ${GREEN}http://localhost:5005/health${NC}"
    echo -e "   MinIO Console:  ${GREEN}http://localhost:9001${NC}"
    
    if [ "$1" = "--full" ]; then
        echo -e "   Adminer (DB):   ${GREEN}http://localhost:8080${NC}"
        echo -e "   MailHog:        ${GREEN}http://localhost:8025${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}🔑 Identifiants par défaut:${NC}"
    echo -e "   Application:"
    echo -e "      Email:       ${YELLOW}admin@ndortel.sn${NC}"
    echo -e "      Mot de passe: ${YELLOW}Admin@2025!${NC}"
    echo ""
    echo -e "   MinIO:"
    echo -e "      Utilisateur: ${YELLOW}ndortel-admin${NC}"
    echo -e "      Mot de passe: ${YELLOW}SecureMinioPass2025!${NC}"
    echo ""
    echo -e "   PostgreSQL:"
    echo -e "      Base:        ${YELLOW}ndortel${NC}"
    echo -e "      Utilisateur: ${YELLOW}ndortel${NC}"
    echo -e "      Mot de passe: ${YELLOW}ndortel_dev_2025${NC}"
    echo ""
    echo -e "${BLUE}📋 Commandes utiles:${NC}"
    echo -e "   make logs          - Voir les logs"
    echo -e "   make status        - État des services"
    echo -e "   make down          - Arrêter les services"
    echo -e "   make help          - Aide complète"
    echo ""
}

# ============================================
# RÉINITIALISATION
# ============================================
reset_environment() {
    echo -e "${RED}⚠️  ATTENTION: Réinitialisation complète${NC}"
    echo -e "${RED}   Toutes les données seront supprimées!${NC}"
    echo ""
    read -p "Continuer? [y/N] " confirm
    
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "Annulé."
        exit 0
    fi
    
    echo ""
    echo -e "${YELLOW}🔄 Réinitialisation en cours...${NC}"
    
    docker-compose -f $COMPOSE_FILE down -v --remove-orphans 2>/dev/null || true
    docker volume rm -f ndortel-postgres-data-dev ndortel-minio-data-dev ndortel-backend-logs-dev 2>/dev/null || true
    rm -f .env
    
    echo -e "${GREEN}✅ Environnement réinitialisé${NC}"
    echo ""
}

# ============================================
# MAIN
# ============================================
main() {
    case "$1" in
        --reset)
            reset_environment
            ;;
        --full)
            check_requirements
            setup_env
            create_directories
            check_source
            start_services --full
            wait_for_services
            show_info --full
            ;;
        *)
            check_requirements
            setup_env
            create_directories
            check_source
            start_services
            wait_for_services
            show_info
            ;;
    esac
}

main "$@"
