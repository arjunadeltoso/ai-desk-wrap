<p align="center">
  <img src="assets/AIDeskWrap-128x128.png" alt="AIDeskWrap Logo" width="128" height="128">
</p>

# AIDeskWrap

**AIDeskWrap** is a lightweight, Linux-first web wrapper that treats web applications as native desktop windows. Unlike heavyweight official apps, AIDeskWrap gives you:

- **True multi-instance support** - Run ChatGPT, Claude, and any web app simultaneously with completely isolated sessions
- **Profile-based workflow** - Keep work and personal AI conversations separate, or manage multiple client accounts
- **Window manager integration** - Each instance is a first-class window in your Linux workflow (i3, sway, KDE, GNOME, etc.)
- **Universal web wrapper** - Not just for AI - use it for Todoist, Gmail, or any web app you want as a desktop window
- **Privacy-focused** - Your data stays local in `~/.config`, with full control over cookies and storage per profile

Built for Linux users who prefer lightweight, composable tools over bloated Electron apps with features you don't need.

Since this is Electron-based, it can be built for macOS and Windows, but I don't own any to be able to test. Note that both platforms have native ChatGPT and Claude desktop applications.

## Features

- **Multiple Profiles**: Supports different profiles (i.e. `ai-desk-wrap --chatgpt`, `ai-desk-wrap --claude`, ...)
- **Isolated Storage**: Configuration stored under `~/.config/ai-desk-wrap/<profile_name>` (or similar on other platforms)
- **First Launch Setup**: Automatically prompts for URL configuration on first run
- **Authentication Support**: Stores cookies and session data in profile directories
- **Cross-Platform**: Works on Linux, macOS, and Windows

## Requirements

AIDeskWrap is proven to build on Ubuntu Linux 20.04 LTS with:

- **Docker**: v28.1.1
- **Docker Compose**: v2.35.1
- **Make**: v4.2.1 (GNU Make)

## Usage

```bash
# Run with default profile
ai-desk-wrap

# Run with specific profile
ai-desk-wrap --profile=claude
ai-desk-wrap --claude

# List available profiles
ai-desk-wrap --list-profiles

# Show help
ai-desk-wrap --help
```

## Building

The application uses Docker for cross-platform builds:

```bash
# Build Linux AppImage
make dist-linux

# Build for all platforms
make dist-all
```

The application is tested to compile and work on Ubuntu 20.04+.

## Author

Created by **Arjuna Del Toso**
Website: [https://deltoso.net](https://deltoso.net)

## License

This project is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License (CC BY-NC-SA 4.0).

See [LICENSE](LICENSE) file for details.
