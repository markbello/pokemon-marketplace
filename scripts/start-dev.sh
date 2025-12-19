#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Kado.io Development Environment${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
  echo ""
  echo -e "${YELLOW}🛑 Shutting down development environment...${NC}"
  
  # Kill background processes
  if [ ! -z "$STRIPE_PID" ]; then
    echo "  Stopping Stripe CLI..."
    kill $STRIPE_PID 2>/dev/null
  fi
  
  if [ ! -z "$NEXT_PID" ]; then
    echo "  Stopping Next.js dev server..."
    kill $NEXT_PID 2>/dev/null
  fi
  
  echo -e "${GREEN}✅ Cleanup complete${NC}"
  exit 0
}

# Set up trap to catch EXIT signal
trap cleanup EXIT INT TERM

# 1. Check if Docker is installed
if ! command -v docker &> /dev/null; then
  echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
  exit 1
fi

# 2. Check if docker compose is available
if ! docker compose version &> /dev/null; then
  echo -e "${RED}❌ Docker Compose is not available. Please install Docker Compose.${NC}"
  exit 1
fi

# 3. Check if .env.local exists
if [ ! -f .env.local ]; then
  echo -e "${RED}❌ .env.local file not found. Please create it from .env.example${NC}"
  exit 1
fi

# 4. Check if Docker daemon is running
if ! docker info &> /dev/null; then
  echo -e "${RED}❌ Docker daemon is not running. Please start Docker.${NC}"
  exit 1
fi

# 5. Start database container if not running
echo -e "${YELLOW}📦 Checking database container...${NC}"
if ! docker compose ps db | grep -q "Up"; then
  echo "  Starting database container..."
  docker compose up -d db
  echo "  Waiting for database to be ready..."
  sleep 3
else
  echo -e "  ${GREEN}✓${NC} Database container is already running"
fi

# 6. Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
  echo -e "${YELLOW}⚠️  Stripe CLI is not installed${NC}"
  echo "  You can install it from: https://stripe.com/docs/stripe-cli"
  echo "  Continuing without Stripe webhook listener..."
  STRIPE_AVAILABLE=false
else
  STRIPE_AVAILABLE=true
fi

# 7. Start Stripe webhook listener in background if available
if [ "$STRIPE_AVAILABLE" = true ]; then
  echo -e "${YELLOW}💳 Starting Stripe webhook listener...${NC}"
  
  # Source .env.local to get STRIPE_SECRET_KEY
  source .env.local
  
  if [ -z "$STRIPE_SECRET_KEY" ]; then
    echo -e "${RED}❌ STRIPE_SECRET_KEY not found in .env.local${NC}"
    echo "  Continuing without Stripe webhook listener..."
  else
    # Start Stripe CLI in background and capture output
    stripe listen --forward-to localhost:3000/api/webhooks/stripe --api-key "$STRIPE_SECRET_KEY" &> /tmp/stripe-cli-output.log &
    STRIPE_PID=$!
    
    # Give it a moment to start
    sleep 2
    
    # Check if process is still running
    if ps -p $STRIPE_PID > /dev/null; then
      echo -e "  ${GREEN}✓${NC} Stripe webhook listener started (PID: $STRIPE_PID)"
    else
      echo -e "${YELLOW}⚠️  Stripe webhook listener failed to start${NC}"
      STRIPE_PID=""
    fi
  fi
fi

# 8. Start Next.js dev server
echo -e "${YELLOW}⚡ Starting Next.js dev server...${NC}"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Development environment is ready!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Start Next.js in foreground (this will show the output)
npm run dev
