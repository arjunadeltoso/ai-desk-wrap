const path = require("path");
const fs = require("fs");
const os = require("os");

class ProfileManager {
  constructor() {
    this.configDir = path.join(os.homedir(), ".config", "ai-desk-wrap");
    this.ensureConfigDir();
  }

  ensureConfigDir() {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true, mode: 0o755 });
    }
  }

  getProfilePath(profileName) {
    return path.join(this.configDir, profileName);
  }

  profileExists(profileName) {
    const configPath = path.join(
      this.getProfilePath(profileName),
      "config.json"
    );
    return fs.existsSync(configPath);
  }

  ensureProfileDirectory(profileName) {
    try {
      this.ensureConfigDir();
      const profilePath = this.getProfilePath(profileName);
      if (!fs.existsSync(profilePath)) {
        fs.mkdirSync(profilePath, { recursive: true, mode: 0o755 });
      }
      return profilePath;
    } catch (error) {
      console.error(
        `Failed to create profile directory for ${profileName}:`,
        error
      );
      throw error;
    }
  }

  createProfile(profileName, url) {
    if (!this.isValidProfileName(profileName)) {
      throw new Error("Invalid profile name. Only letters, numbers, and hyphens are allowed.");
    }

    if (this.profileExists(profileName)) {
      throw new Error(`Profile "${profileName}" already exists.`);
    }

    try {
      const profilePath = this.ensureProfileDirectory(profileName);

      const config = { url, created: new Date().toISOString() };
      const configPath = path.join(profilePath, "config.json");
      
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      
      console.log(`Profile ${profileName} created successfully at ${configPath}`);
      return config;
    } catch (error) {
      console.error(`Failed to create profile ${profileName}:`, error);
      throw error;
    }
  }

  updateProfile(profileName, updates) {
    if (!this.profileExists(profileName)) {
      throw new Error(`Profile "${profileName}" does not exist.`);
    }

    // Validate new name if provided
    if (updates.name && updates.name !== profileName) {
      if (!this.isValidProfileName(updates.name)) {
        throw new Error("Invalid profile name. Only letters, numbers, and hyphens are allowed.");
      }
      if (this.profileExists(updates.name)) {
        throw new Error(`Profile "${updates.name}" already exists.`);
      }
      if (profileName === "default") {
        throw new Error("Default profile cannot be renamed.");
      }
    }

    try {
      const config = this.getProfileConfig(profileName);
      
      // Update URL if provided
      if (updates.url) {
        config.url = updates.url;
      }
      
      config.modified = new Date().toISOString();

      // Handle profile rename
      if (updates.name && updates.name !== profileName) {
        // Create new profile directory
        const newProfilePath = this.ensureProfileDirectory(updates.name);
        const newConfigPath = path.join(newProfilePath, "config.json");
        
        // Write new config
        fs.writeFileSync(newConfigPath, JSON.stringify(config, null, 2));
        
        // Remove old profile directory
        const oldProfilePath = this.getProfilePath(profileName);
        fs.rmSync(oldProfilePath, { recursive: true, force: true });
        
        return { ...config, name: updates.name };
      } else {
        // Just update existing profile
        const configPath = path.join(this.getProfilePath(profileName), "config.json");
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        return config;
      }
    } catch (error) {
      console.error(`Failed to update profile ${profileName}:`, error);
      throw error;
    }
  }

  deleteProfile(profileName) {
    if (profileName === "default") {
      throw new Error("Default profile cannot be deleted.");
    }

    if (!this.profileExists(profileName)) {
      throw new Error(`Profile "${profileName}" does not exist.`);
    }

    try {
      const profilePath = this.getProfilePath(profileName);
      fs.rmSync(profilePath, { recursive: true, force: true });
      console.log(`Profile ${profileName} deleted successfully`);
    } catch (error) {
      console.error(`Failed to delete profile ${profileName}:`, error);
      throw error;
    }
  }

  listProfiles() {
    try {
      if (!fs.existsSync(this.configDir)) {
        return [];
      }

      const profiles = [];
      const entries = fs.readdirSync(this.configDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const profileName = entry.name;
          const configPath = path.join(this.configDir, profileName, "config.json");
          
          if (fs.existsSync(configPath)) {
            try {
              const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
              profiles.push({
                name: profileName,
                url: config.url,
                created: config.created,
                modified: config.modified,
                isDefault: profileName === "default"
              });
            } catch (error) {
              console.warn(`Failed to read config for profile ${profileName}:`, error);
            }
          }
        }
      }

      return profiles.sort((a, b) => {
        // Default profile first, then alphabetical
        if (a.isDefault) return -1;
        if (b.isDefault) return 1;
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      console.error("Failed to list profiles:", error);
      return [];
    }
  }

  getProfileConfig(profileName) {
    const configPath = path.join(
      this.getProfilePath(profileName),
      "config.json"
    );
    if (!fs.existsSync(configPath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  }

  isValidProfileName(name) {
    // Only allow letters, numbers, and hyphens
    return /^[a-zA-Z0-9-]+$/.test(name) && name.length > 0 && name.length <= 50;
  }

}

module.exports = ProfileManager;