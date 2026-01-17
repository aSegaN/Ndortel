#!/bin/bash
# ============================================
# NDORTEL - Script de Vérification de Santé
# Version: 1.0.0
# Description: Vérifie l'état de tous les services
# ============================================

set -e

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              NDORTEL - Vérification de Santé                 ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Compteurs
TOTAL=0
OK=0
FAILED=0

# ============================================
# FONCTIONS
# ============================================

check_service() {
    local name=$1
    local url=$2
    local timeout=${3:-5}
    
    TOTAL=$((TOTAL + 1))
    
    printf "   %-20s" "$name:"
    
    if curl -sf --connect-timeout $timeout "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
        OK=$((OK + 1))
        return 0
    else
        echo -e "${RED}❌ ÉCHEC${NC}"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

check_container() {
    local name=$1
    local container=$2
    
    TOTAL=$((TOTAL + 1))
    
    printf "   %-20s" "$name:"
    
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        echo -e "${GREEN}✅ En cours${NC}"
        OK=$((OK + 1))
        return 0
    else
        echo -e "${RED}❌ Arrêté${NC}"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

check_db_connection() {
    TOTAL=$((TOTAL + 1))
    
    printf "   %-20s" "PostgreSQL:"
    
    if docker exec ndortel-postgres-dev pg_isready -U ndortel -d ndortel > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Connecté${NC}"
        OK=$((OK + 1))
        return 0
    else
        echo -e "${RED}❌ Non connecté${NC}"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# ============================================
# VÉRIFICATIONS
# ============================================

echo -e "${YELLOW}📦 Conteneurs Docker:${NC}"
check_container "Backend" "ndortel-backend-dev"
check_container "Frontend" "ndortel-frontend-dev"
check_container "PostgreSQL" "ndortel-postgres-dev"
check_container "MinIO" "ndortel-minio-dev"

echo ""
echo -e "${YELLOW}🔗 Connectivité:${NC}"
check_db_connection

echo ""
echo -e "${YELLOW}🌐 Services HTTP:${NC}"
check_service "Backend API" "http://localhost:5005/health"
check_service "Frontend" "http://localhost:5173"
check_service "MinIO API" "http://localhost:9000/minio/health/live"
check_service "MinIO Console" "http://localhost:9001"

# Vérification optionnelle des outils
if docker ps --format '{{.Names}}' | grep -q "ndortel-adminer-dev"; then
    echo ""
    echo -e "${YELLOW}🛠️ Outils (optionnels):${NC}"
    check_service "Adminer" "http://localhost:8080"
fi

if docker ps --format '{{.Names}}' | grep -q "ndortel-mailhog-dev"; then
    check_service "MailHog" "http://localhost:8025"
fi

# ============================================
# RÉSUMÉ
# ============================================

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ Tous les services sont opérationnels ($OK/$TOTAL)${NC}"
    exit 0
else
    echo -e "${RED}⚠️  $FAILED service(s) en échec sur $TOTAL${NC}"
    echo ""
    echo -e "${YELLOW}Conseils de dépannage:${NC}"
    echo "   1. Vérifier les logs: make logs"
    echo "   2. Redémarrer les services: make restart"
    echo "   3. Réinitialiser si nécessaire: make reset"
    exit 1
fi
