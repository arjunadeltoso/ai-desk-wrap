# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AIDeskWrap is an Electron-based browser wrapper application specifically designed for AI web tools. It provides isolated profiles for different AI services (ChatGPT, Claude, Anthropic, etc.) with separate data storage and authentication. The application supports multiple concurrent instances and provides a clean, native desktop experience for web-based AI tools.

## Development Commands

### Local Development
- `npm start` - Run with default profile
- `npm run dev` - Run in development mode with --dev flag
- `npm run dist-appimage` - Build AppImage (universal Linux)

### Docker-based Build
- `make build` - Build Docker container for distribution
- `make dist` - Build AppImage distribution package using Docker
- `make clean` - Clean Docker containers and images

## Architecture

### Core Components

**ProfileManager** (`src/main.js:8-101`)
- Manages user profiles stored in `~/.config/ai-desk-wrap/`
- **Profile Directory Structure:** Each profile contains `cache/`, `storage/` directories and `config.json`
- **Permission Handling:** Includes logic to handle root ownership issues from Docker/AppImage environments
- **Profile Creation:** `ensureProfileDirectory()` creates directories with proper permissions (0o755)
- **Configuration Loading:** `getProfileConfig()` reads profile settings from `config.json`

**AIDeskWrap Main Class** (`src/main.js:105-245`)
- **Window Management:** Creates and manages Electron BrowserWindow instances
- **Profile Resolution:** Parses command-line arguments for profile selection (`--profile=name` or `--name`)
- **First Launch Experience:** Detects missing profiles and launches setup wizard
- **userData Path Management:** Sets Electron userData to profile directory for proper isolation

**Enhanced Setup System** (`src/main.js:194-245`)
- **Smart Profile Detection:** Different behavior for default vs named profiles
- **User-Friendly Dialogs:** Welcoming setup for first launch, error dialogs for missing named profiles
- **URL Validation:** Automatically adds https:// prefix if missing
- **Modal Dialog Implementation:** Custom `dialog.showInputBox` with improved CSS layout

### Profile System Improvements

**Profile Isolation:**
- Each profile has completely separate data storage
- Uses Electron's partition system (`persist:${profileName}`)
- Cookies, cache, and local storage are profile-specific
- Configuration stored in individual `config.json` files

**First Launch Experience:**
- Default profile shows "Configure AIDeskWrap" welcome dialog
- Named profiles show "Profile not found" error message
- Improved modal sizing and layout for better UX
- Direct setup without confirmation step for default profile

**Permission Management:**
- Handles Docker container root ownership issues
- Automatically fixes ownership using `chown` when running as root
- Proper file mode setting (0o755) for all created directories
- Error handling and logging for permission issues

### Multi-Instance Support

The application is designed to support multiple concurrent instances:
- No single-instance locking mechanism
- Each instance can use the same or different profiles
- Profile data is safely shared between instances using the same profile
- Window titles include profile name for easy identification

### Build System

**Docker Integration:**
- Simplified to build-only (no runtime mounts)
- Removes permission conflicts from config directory mounting
- Clean separation between development and distribution builds

**AppImage Configuration:**
- Configured with proper icon assets in `assets/` directory
- electron-builder setup for Linux AppImage generation
- Icon integration for system file managers

## File Structure

- `src/main.js` - Main Electron process with ProfileManager and AIDeskWrap classes
- `src/preload.js` - Preload script for renderer process communication  
- `assets/` - Application icons in various sizes (16x16 to 512x512)
- `Makefile` - Docker-based build commands (simplified from previous version)
- `docker-compose.yml` - Container configuration for building AppImage
- `package.json` - npm configuration with electron-builder and icon setup

## Recent Improvements

1. **Profile Management Fixes:**
   - Fixed userData path timing to prevent root-owned directories
   - Added permission handling for Docker/AppImage environments
   - Improved error handling and logging

2. **User Experience Enhancements:**
   - Streamlined first launch with friendly welcome dialog
   - Fixed modal layout issues (buttons above fold)
   - Better error messages for missing profiles

3. **Build System Simplification:**
   - Removed runtime Docker configurations
   - Focused Docker setup on AppImage building only
   - Added proper icon configuration for Linux

4. **Multi-Instance Capability:**
   - Removed any single-instance restrictions
   - Supports concurrent usage with same/different profiles
   - Proper window identification with profile names
