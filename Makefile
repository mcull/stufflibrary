.PHONY: help dev build start clean install lint format typecheck test test-unit test-e2e db-push db-studio seed

# Default target
help:
	@echo "StuffLibrary Development Commands"
	@echo ""
	@echo "Setup:"
	@echo "  install       Install dependencies"
	@echo "  clean         Clean build artifacts"
	@echo ""
	@echo "Development:"
	@echo "  dev           Start development server with Turbopack"
	@echo "  build         Build for production"
	@echo "  start         Start production server"
	@echo ""
	@echo "Code Quality:"
	@echo "  lint          Lint code with Next.js ESLint"
	@echo "  format        Format code with Prettier"
	@echo "  typecheck     Type check with TypeScript"
	@echo ""
	@echo "Testing:"
	@echo "  test          Run all tests"
	@echo "  test-unit     Run unit tests"
	@echo "  test-e2e      Run E2E tests (when available)"
	@echo ""
	@echo "Database:"
	@echo "  db-push       Push schema to database"
	@echo "  db-studio     Open Prisma Studio"
	@echo "  seed          Seed database (when available)"

# Setup
install:
	npm install

clean:
	rm -rf .next
	rm -rf node_modules/.cache

# Development
dev:
	npm run dev

build:
	npm run build

start:
	npm run start

# Code Quality
lint:
	npm run lint

format:
	npm run format

typecheck:
	npm run typecheck

# Testing
test:
	npm test

test-unit:
	npm run test:unit

test-e2e:
	npm run test:e2e

# Database
db-push:
	npm run db:push

db-studio:
	npm run db:studio

seed:
	npm run seed

# Quick development setup
setup: install db-push
	@echo "✅ Setup complete! Run 'make dev' to start development."

# Pre-commit checks
check: typecheck lint format
	@echo "✅ All checks passed!"