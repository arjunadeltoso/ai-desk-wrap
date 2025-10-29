FROM node:18-bullseye

# Enable multiarch and install system dependencies for all platforms
RUN dpkg --add-architecture i386 && \
    apt-get update && apt-get install -y \
    # Linux Electron dependencies
    libnss3-dev \
    libatk-bridge2.0-dev \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libgtk-3-0 \
    libxss1 \
    libasound2 \
    xvfb \
    # Wine for Windows builds (both 32-bit and 64-bit)
    wine \
    wine32 \
    # Additional tools
    curl \
    wget \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Configure Wine (create wine prefix in a cached layer)
RUN wine --version && \
    export WINEPREFIX=/root/.wine && \
    wineboot --init && \
    echo "Wine configured"

WORKDIR /app

# Copy package files first for optimal caching
COPY package*.json ./

# Install npm dependencies (cached layer)
RUN npm install

# Pre-install electron-builder app dependencies (cached layer)
RUN npx electron-builder install-app-deps

# Pre-download Electron binaries for all platforms (cached layer)
# This downloads Linux, Windows, and macOS Electron binaries
RUN echo '{"devDependencies":{"electron":"22.3.25"}}' > temp-package.json && \
    npm install --save-dev electron@22.3.25 && \
    rm temp-package.json

# Copy assets for pre-warming builds (cached unless assets change)
COPY assets/ ./assets/

# Pre-warm electron-builder by downloading platform-specific tools
# This caches AppImage, NSIS, and other build tools
RUN mkdir -p src && \
    echo 'const { app } = require("electron"); app.quit();' > src/main.js && \
    echo '{}' > src/preload.js && \
    # Pre-download Linux tools
    (npx electron-builder --linux AppImage --publish=never || true) && \
    # Pre-download Windows tools
    (npx electron-builder --win --publish=never || true) && \
    # Pre-download macOS tools (will download binaries but may fail without macOS)
    (npx electron-builder --mac --publish=never || true) && \
    # Clean up dummy files
    rm -rf dist src/main.js src/preload.js

# Copy source code (this layer changes most frequently)
COPY . .

# Set environment variables
ENV DISPLAY=:99
ENV ELECTRON_CACHE=/root/.cache/electron
ENV ELECTRON_BUILDER_CACHE=/root/.cache/electron-builder

# Default command (can be overridden)
CMD ["npm", "run", "dist-all"]