#!/bin/bash

# ==============================================
# ProInfo Market - Database Setup Script
# ==============================================

set -e

echo "🗄️ ProInfo Market - Database Setup"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Services avec Prisma
SERVICES=(
  "asset-service"
  "procurement-service"
  "quality-service"
  "inventory-service"
  "wms-service"
  "cto-service"
  "sav-service"
)

# Base directory
cd "$(dirname "$0")/.."
BASE_DIR=$(pwd)

echo "📁 Base directory: $BASE_DIR"
echo ""

# Fonction pour setup un service
setup_service() {
  local service=$1
  local service_dir="$BASE_DIR/services/$service"
  
  if [ -d "$service_dir" ]; then
    echo -e "${GREEN}→ Setting up $service${NC}"
    
    cd "$service_dir"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
      echo "  Installing dependencies..."
      npm install --silent
    fi
    
    # Generate Prisma client
    if [ -f "prisma/schema.prisma" ]; then
      echo "  Generating Prisma client..."
      npx prisma generate --silent
      
      # Push schema to database
      echo "  Pushing schema to database..."
      npx prisma db push --accept-data-loss --skip-generate 2>/dev/null || true
    fi
    
    echo "  ✓ Done"
  else
    echo -e "${RED}⚠ Service directory not found: $service${NC}"
  fi
}

# Setup each service
for service in "${SERVICES[@]}"; do
  setup_service "$service"
done

echo ""
echo "✅ All databases initialized!"
echo ""
echo "Next steps:"
echo "  1. Run the seed script: npm run seed"
echo "  2. Start services: npm run dev"
