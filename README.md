<p align="center">
  <img src="assets/AIDeskWrap-128x128.png" alt="AIDeskWrap Logo" width="128" height="128">
</p>

# AIDeskWrap

`AIDeskWrap` is a simple web browser wrapper (Electron-based) for any AI web tools. The advantage is that you can start it independently from your web browser, start multiple separate instances and it works cross platform on Linux, Mac and Windows.

## Features

- **Multiple Profiles**: Supports different profiles (i.e. `ai-desk-wrap --chatgpt`, `ai-desk-wrap --claude`, ...)
- **Isolated Storage**: Configuration stored under `~/.config/ai-desk-wrap/<profile_name>` (or similar on other platforms)
- **First Launch Setup**: Automatically prompts for URL configuration on first run
- **Authentication Support**: Stores cookies and session data in profile directories
- **Cross-Platform**: Works on Linux, macOS, and Windows

## Requirements

AIDeskWrap proven to build on my Ubuntu Linux 20.04LTS with:

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
