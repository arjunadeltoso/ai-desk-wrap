const { app, BrowserWindow, dialog, ipcMain, Menu, clipboard, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const yargs = require("yargs");
const { spawn } = require("child_process");

const ProfileManager = require("./lib/ProfileManager");
const SetupManager = require("./lib/SetupManager");
const ProfileModal = require("./lib/ProfileModal");


class AIDeskWrap {
  constructor() {
    this.profileManager = new ProfileManager();
    this.setupManager = new SetupManager(this.profileManager);
    this.profileModal = new ProfileModal(this.profileManager);
    this.window = null;
    this.profileName = "default";

    // Resolve preload path once to avoid issues in AppImage
    this.preloadPath = path.join(__dirname, "preload.js");

    // Define all command-line options in one place
    this.cliOptions = [
      {
        flags: ['--profile=<name>', '-p <name>'],
        description: 'Profile name to use',
        example: '--profile=claude'
      },
      {
        flags: ['--<name>'],
        description: 'Direct profile flag (e.g., --claude)',
        example: '--claude'
      },
      {
        flags: ['--list-profiles', '-l'],
        description: 'List all available profiles and exit',
        example: '--list-profiles'
      },
      {
        flags: ['--help', '-h'],
        description: 'Show this help message',
        example: '--help'
      }
    ];

    this.parseArgs();
    this.createMenu();
  }

  generateHelpText() {
    const execName = path.basename(process.argv[0]);
    let helpText = `Usage: ${execName} [options]\n\nOptions:\n`;

    // Generate options list
    this.cliOptions.forEach(option => {
      const flags = option.flags.join(', ');
      helpText += `  ${flags.padEnd(35)} ${option.description}\n`;
    });

    // Generate examples
    helpText += `\nExamples:\n`;
    this.cliOptions.forEach(option => {
      if (option.example) {
        helpText += `  ${execName} ${option.example}\n`;
      }
    });

    return helpText;
  }

  parseArgs() {
    // Debug: Log all arguments for troubleshooting
    console.log('Raw arguments:', process.argv);

    // In AppImage, arguments might not be in the expected position
    // Find arguments after the executable path
    let args = [];
    
    // Look for arguments starting from index 1 (skip the executable path)
    for (let i = 1; i < process.argv.length; i++) {
      const arg = process.argv[i];
      // Skip the main script path (ai-desk-wrap or main.js)
      if (!arg.endsWith('ai-desk-wrap') && !arg.endsWith('main.js') && !arg.includes('.js')) {
        args.push(arg);
      }
    }
    
    console.log('Extracted arguments for parsing:', args);

    // Manual parsing since yargs might not work properly in AppImage
    let profileName = "default";
    let shouldListProfiles = false;
    let shouldShowHelp = false;

    for (const arg of args) {
      if (arg.startsWith('--profile=')) {
        profileName = arg.split('=')[1];
        console.log(`Profile set via --profile=: ${profileName}`);
      } else if (arg === '--list-profiles' || arg === '-l') {
        shouldListProfiles = true;
      } else if (arg === '--help' || arg === '-h') {
        shouldShowHelp = true;
      } else if (arg.startsWith('--') && !arg.includes('=')) {
        // Handle direct profile flags like --claude
        const flagName = arg.substring(2);
        if (flagName !== 'dev' && flagName !== 'list-profiles' && flagName !== 'help') {
          profileName = flagName;
          console.log(`Profile set via direct flag: ${profileName}`);
        }
      }
    }

    // Handle special flags
    if (shouldShowHelp) {
      console.log('\n' + this.generateHelpText());
      process.exit(0);
    }

    if (shouldListProfiles) {
      console.log('\nAvailable profiles:');
      const profiles = this.profileManager.listProfiles();
      if (profiles.length === 0) {
        console.log('  No profiles found. Run without arguments to create the default profile.');
      } else {
        profiles.forEach(profile => {
          console.log(`  ${profile.name}${profile.isDefault ? ' (default)' : ''} - ${profile.url}`);
        });
      }
      process.exit(0);
    }

    this.profileName = profileName;
    console.log(`Starting AIDeskWrap with profile: ${this.profileName}`);

    // CRITICAL: Set userData path immediately in constructor, before app.whenReady()
    // Electron caches userData on first access, so this must happen early
    const profilePath = this.profileManager.ensureProfileDirectory(
      this.profileName
    );
    app.setPath("userData", profilePath);
    console.log(`Set userData path to: ${profilePath}`);
  }

  async createWindow() {
    let finalConfig;

    try {
      // Profile directory and userData path already set in constructor

      const profileConfig = this.profileManager.getProfileConfig(
        this.profileName
      );

      if (!profileConfig) {
        const result = await this.setupManager.setupNewProfile(this.profileName);
        if (!result) {
          app.quit();
          return;
        }
      }

      finalConfig = this.profileManager.getProfileConfig(
        this.profileName
      );
      if (!finalConfig) {
        app.quit();
        return;
      }
    } catch (error) {
      console.error("Failed to create window:", error);
      app.quit();
      return;
    }

    this.window = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        partition: `persist:${this.profileName}`,
        preload: this.preloadPath,
      },
      titleBarStyle: "default",
      title: `AIDeskWrap - ${this.profileName}`,
    });

    this.window.loadURL(finalConfig.url);


    this.window.on("closed", () => {
      this.window = null;
    });

    this.window.webContents.on("new-window", (event, navigationUrl) => {
      event.preventDefault();
      require("electron").shell.openExternal(navigationUrl);
    });

    // Setup context menu for text selection and copy
    this.setupContextMenu(this.window);

    // Override keyboard shortcuts for font size control
    this.setupKeyboardShortcuts(this.window);
  }

  setupKeyboardShortcuts(window) {
    // Override Ctrl+Plus for zoom in
    window.webContents.on('before-input-event', (event, input) => {
      if (input.control || input.meta) {
        if (input.key === '=' || input.key === '+') {
          event.preventDefault();
          const currentZoom = window.webContents.getZoomLevel();
          window.webContents.setZoomLevel(currentZoom + 0.5);
          console.log(`Zoom level increased to: ${currentZoom + 0.5}`);
        } else if (input.key === '-') {
          event.preventDefault();
          const currentZoom = window.webContents.getZoomLevel();
          window.webContents.setZoomLevel(currentZoom - 0.5);
          console.log(`Zoom level decreased to: ${currentZoom - 0.5}`);
        } else if (input.key === '0') {
          event.preventDefault();
          window.webContents.setZoomLevel(0);
          console.log('Zoom level reset to default');
        } else if (input.key === 'c') {
          // Allow Ctrl+C for copy
          window.webContents.copy();
        } else if (input.key === 'a') {
          // Allow Ctrl+A for select all
          window.webContents.selectAll();
        }
      }
    });
  }

  setupContextMenu(window) {
    window.webContents.on('context-menu', (event, params) => {
      const { selectionText, isEditable } = params;
      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'Copy',
          enabled: selectionText.length > 0,
          click: () => {
            clipboard.writeText(selectionText);
          }
        },
        {
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          click: () => {
            window.webContents.selectAll();
          }
        },
        { type: 'separator' },
        {
          label: 'Back',
          enabled: window.webContents.canGoBack(),
          click: () => {
            window.webContents.goBack();
          }
        },
        {
          label: 'Forward',
          enabled: window.webContents.canGoForward(),
          click: () => {
            window.webContents.goForward();
          }
        },
        {
          label: 'Reload',
          click: () => {
            window.webContents.reload();
          }
        }
      ]);
      
      contextMenu.popup(window);
    });
  }

  launchNewInstance(profileName) {
    // Launch a completely new application instance with the specified profile
    const args = [`--profile=${profileName}`];

    // Get the executable path - handle both development and packaged app
    let execPath;
    if (app.isPackaged) {
      // In AppImage, process.execPath points to temporary mount path
      // Use APPIMAGE env var which points to the actual .AppImage file
      if (process.env.APPIMAGE) {
        execPath = process.env.APPIMAGE;
        console.log(`Using AppImage path: ${execPath}`);
      } else {
        // Other packaged formats (deb, rpm, etc.)
        execPath = process.execPath;
      }
    } else {
      // In development, use electron with the main script
      execPath = process.argv[0];
      args.unshift(process.argv[1]); // Add main.js path
    }

    console.log(`Launching new instance: ${execPath} ${args.join(' ')}`);

    // Spawn detached process so it continues running independently
    const child = spawn(execPath, args, {
      detached: true,
      stdio: 'ignore'
    });

    // Unreference so parent can exit independently
    child.unref();

    console.log(`New instance launched for profile: ${profileName}`);
  }

  async createNewWindow(profileName) {
    try {
      // Ensure profile exists, if not, show setup
      if (!this.profileManager.profileExists(profileName)) {
        const result = await this.setupManager.setupNewProfile(profileName);
        if (!result) {
          return; // User cancelled or setup failed
        }
      }

      const profileConfig = this.profileManager.getProfileConfig(profileName);
      if (!profileConfig) {
        console.error(`Failed to get config for profile: ${profileName}`);
        return;
      }

      // Create new window for the profile
      const newWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          partition: `persist:${profileName}`,
          preload: this.preloadPath,
        },
        titleBarStyle: "default",
        title: `AIDeskWrap - ${profileName}`,
      });

      newWindow.loadURL(profileConfig.url);


      newWindow.on("closed", () => {
        // Window cleanup is automatic
      });

      newWindow.webContents.on("new-window", (event, navigationUrl) => {
        event.preventDefault();
        require("electron").shell.openExternal(navigationUrl);
      });

      // Setup context menu for text selection and copy
      this.setupContextMenu(newWindow);

      // Add keyboard shortcuts to new window too
      this.setupKeyboardShortcuts(newWindow);

      console.log(`New window opened for profile: ${profileName}`);
    } catch (error) {
      console.error(`Failed to create new window for profile ${profileName}:`, error);
      dialog.showErrorBox("Failed to Open Window", `Could not open new window for profile "${profileName}": ${error.message}`);
    }
  }

  createMenu() {
    // Get all profiles for the submenu
    const profiles = this.profileManager.listProfiles();
    const profileSubmenu = profiles.map(profile => ({
      label: `${profile.name}${profile.isDefault ? ' (Default)' : ''}`,
      click: () => {
        this.launchNewInstance(profile.name);
      }
    }));

    const template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'New Window',
            accelerator: 'CmdOrCtrl+N',
            click: () => {
              this.createNewWindow(this.profileName);
            }
          },
          {
            label: 'New Window',
            submenu: profileSubmenu
          },
          { type: 'separator' },
          {
            label: 'Close Window',
            accelerator: 'CmdOrCtrl+W',
            click: () => {
              const focusedWindow = BrowserWindow.getFocusedWindow();
              if (focusedWindow) {
                focusedWindow.close();
              }
            }
          },
          {
            label: 'Quit',
            accelerator: 'CmdOrCtrl+Q',
            click: () => {
              app.quit();
            }
          }
        ]
      },
      {
        label: 'Profile',
        submenu: [
          {
            label: 'Manage Profiles...',
            click: async () => {
              await this.profileModal.showProfileManager();
            }
          }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          {
            label: 'Copy',
            accelerator: 'CmdOrCtrl+C',
            click: () => {
              const focusedWindow = BrowserWindow.getFocusedWindow();
              if (focusedWindow) {
                focusedWindow.webContents.copy();
              }
            }
          },
          {
            label: 'Select All',
            accelerator: 'CmdOrCtrl+A',
            click: () => {
              const focusedWindow = BrowserWindow.getFocusedWindow();
              if (focusedWindow) {
                focusedWindow.webContents.selectAll();
              }
            }
          }
        ]
      },
      {
        label: 'View',
        submenu: [
          {
            label: 'Zoom In',
            accelerator: 'CmdOrCtrl+Plus',
            click: () => {
              const focusedWindow = BrowserWindow.getFocusedWindow();
              if (focusedWindow) {
                const currentZoom = focusedWindow.webContents.getZoomLevel();
                focusedWindow.webContents.setZoomLevel(currentZoom + 0.5);
              }
            }
          },
          {
            label: 'Zoom Out',
            accelerator: 'CmdOrCtrl+-',
            click: () => {
              const focusedWindow = BrowserWindow.getFocusedWindow();
              if (focusedWindow) {
                const currentZoom = focusedWindow.webContents.getZoomLevel();
                focusedWindow.webContents.setZoomLevel(currentZoom - 0.5);
              }
            }
          },
          {
            label: 'Reset Zoom',
            accelerator: 'CmdOrCtrl+0',
            click: () => {
              const focusedWindow = BrowserWindow.getFocusedWindow();
              if (focusedWindow) {
                focusedWindow.webContents.setZoomLevel(0);
              }
            }
          },
          { type: 'separator' },
          {
            label: 'Copy URL to Clipboard',
            accelerator: 'CmdOrCtrl+Shift+C',
            click: () => {
              const focusedWindow = BrowserWindow.getFocusedWindow();
              if (focusedWindow) {
                const currentURL = focusedWindow.webContents.getURL();
                clipboard.writeText(currentURL);
              }
            }
          },
          { type: 'separator' },
          {
            label: 'Reload',
            accelerator: 'CmdOrCtrl+R',
            click: () => {
              const focusedWindow = BrowserWindow.getFocusedWindow();
              if (focusedWindow) {
                focusedWindow.webContents.reload();
              }
            }
          },
          {
            label: 'Force Reload',
            accelerator: 'CmdOrCtrl+Shift+R',
            click: () => {
              const focusedWindow = BrowserWindow.getFocusedWindow();
              if (focusedWindow) {
                focusedWindow.webContents.reloadIgnoringCache();
              }
            }
          },
          {
            label: 'Toggle Developer Tools',
            accelerator: 'F12',
            click: () => {
              const focusedWindow = BrowserWindow.getFocusedWindow();
              if (focusedWindow) {
                focusedWindow.webContents.toggleDevTools();
              }
            }
          }
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'Help',
            accelerator: 'F1',
            click: () => {
              dialog.showMessageBox({
                type: 'info',
                title: 'AIDeskWrap Help',
                message: 'Command-Line Options',
                detail: this.generateHelpText(),
                buttons: ['OK']
              });
            }
          },
          { type: 'separator' },
          {
            label: 'About AIDeskWrap',
            click: () => {
              dialog.showMessageBox({
                type: 'info',
                title: 'About AIDeskWrap',
                message: 'AIDeskWrap v1.0.2',
                detail: 'A browser wrapper for AI web tools with profile support.\n\nCreated by Arjuna Del Toso\nhttps://deltoso.net\n\nLicensed under CC BY-NC-SA 4.0'
              });
            }
          }
        ]
      }
    ];

    // macOS specific menu adjustments
    if (process.platform === 'darwin') {
      template.unshift({
        label: 'AIDeskWrap',
        submenu: [
          {
            label: 'About AIDeskWrap',
            click: () => {
              dialog.showMessageBox({
                type: 'info',
                title: 'About AIDeskWrap',
                message: 'AIDeskWrap v1.0.2',
                detail: 'A browser wrapper for AI web tools with profile support.\n\nCreated by Arjuna Del Toso\nhttps://deltoso.net\n\nLicensed under CC BY-NC-SA 4.0'
              });
            }
          },
          { type: 'separator' },
          {
            label: 'Quit AIDeskWrap',
            accelerator: 'Command+Q',
            click: () => {
              app.quit();
            }
          }
        ]
      });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }
}


const aideskwrap = new AIDeskWrap();

app.whenReady().then(() => {
  aideskwrap.createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      aideskwrap.createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
