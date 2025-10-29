.PHONY: build dist-linux dist-mac dist-windows dist-all clean clean-cache help start dev

# Default target
help:
	@echo "AIDeskWrap - Makefile Commands"
	@echo "=============================="
	@echo "Docker-based builds (recommended):"
	@echo "  dist-linux     Build Linux AppImage using Docker"
	@echo "  dist-mac       Build macOS apps using Docker"
	@echo "  dist-windows   Build Windows installer using Docker"
	@echo "  dist-all       Build all platforms using Docker"
	@echo ""
	@echo "Docker management:"
	@echo "  build          Build the Docker container"
	@echo "  clean          Clean up containers and images"
	@echo "  clean-cache    Clean up Docker cache volumes"
	@echo ""
	@echo "Local development:"
	@echo "  start          Run with default profile"
	@echo "  dev            Run in development mode"

# Local development commands
start:
	npm start

dev:
	npm run dev

# Build Docker container with all platform dependencies
build:
	docker compose build ai-desk-wrap-build

# Platform-specific Docker builds
dist-linux: build
	docker compose run --rm build-linux

dist-windows: build
	docker compose run --rm build-windows

dist-mac: build
	docker compose run --rm build-mac

dist-all: build
	docker compose run --rm build-all

# Clean up containers, images, and networks
clean:
	docker compose down --rmi local --remove-orphans

# Clean up cache volumes (forces fresh downloads)
clean-cache:
	docker compose down --volumes --remove-orphans
	docker volume rm ai-desk-wrap_electron-cache ai-desk-wrap_electron-builder-cache 2>/dev/null || true