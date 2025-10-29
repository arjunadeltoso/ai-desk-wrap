const { dialog, BrowserWindow, ipcMain } = require("electron");

class SetupManager {
  constructor(profileManager) {
    this.profileManager = profileManager;
  }

  async setupNewProfile(profileName) {
    const isDefaultProfile = profileName === "default";

    // Only show error message for non-default profiles
    if (!isDefaultProfile) {
      const result = await dialog.showMessageBox({
        type: "question",
        buttons: ["OK", "Cancel"],
        defaultId: 0,
        title: "New Profile Setup",
        message: `Profile "${profileName}" not found`,
        detail: "Please enter the URL for this profile",
      });

      if (result.response === 1) {
        return null; // User cancelled
      }
    }

    // Show setup dialog directly for default profile or after confirmation for others
    const title = isDefaultProfile ? "Configure AIDeskWrap" : "Profile URL";
    const message = isDefaultProfile
      ? "Welcome to AIDeskWrap! Enter your AI tool URL to get started:"
      : `Enter URL for profile "${profileName}":`;

    const urlResult = await this.showInputBox({
      title,
      message,
      defaultValue: "https://",
    });

    if (urlResult.canceled || !urlResult.value) {
      return null; // User cancelled
    }

    let url = urlResult.value;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    try {
      return this.profileManager.createProfile(profileName, url);
    } catch (error) {
      await dialog.showErrorBox("Profile Creation Failed", error.message);
      return null;
    }
  }

  async showInputBox(options) {
    return new Promise((resolve) => {
      const window = new BrowserWindow({
        width: 450,
        height: 260,
        modal: true,
        resizable: false,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
        },
      });

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${options.title || "Input"}</title>
          <style>
            body { font-family: system-ui; padding: 20px; margin: 0; box-sizing: border-box; }
            .container { display: flex; flex-direction: column; height: calc(100vh - 40px); }
            .message { margin-bottom: 15px; }
            .input-group { margin-bottom: 20px; }
            .input-group input { width: 100%; padding: 8px; font-size: 14px; box-sizing: border-box; }
            .buttons { display: flex; gap: 10px; justify-content: flex-end; margin-top: auto; }
            .buttons button { padding: 8px 16px; }
            .buttons .ok { background: #007acc; color: white; border: none; }
            .buttons .cancel { background: #ccc; border: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="message">${options.message || ""}</div>
            <div class="input-group">
              <input type="text" id="input" value="${
                options.defaultValue || ""
              }" autofocus>
            </div>
            <div class="buttons">
              <button class="cancel" onclick="cancel()">Cancel</button>
              <button class="ok" onclick="ok()">OK</button>
            </div>
          </div>
          <script>
            const { ipcRenderer } = require('electron');

            document.getElementById('input').addEventListener('keypress', (e) => {
              if (e.key === 'Enter') ok();
              if (e.key === 'Escape') cancel();
            });

            function ok() {
              const value = document.getElementById('input').value;
              ipcRenderer.send('input-result', { canceled: false, value });
            }

            function cancel() {
              ipcRenderer.send('input-result', { canceled: true, value: null });
            }
          </script>
        </body>
        </html>
      `;

      window.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));

      ipcMain.once("input-result", (event, result) => {
        window.close();
        resolve(result);
      });

      window.on("closed", () => {
        resolve({ canceled: true, value: null });
      });
    });
  }
}

module.exports = SetupManager;