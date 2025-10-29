const { BrowserWindow, ipcMain } = require("electron");

class ProfileModal {
  constructor(profileManager) {
    this.profileManager = profileManager;
  }

  async showProfileManager() {
    return new Promise((resolve) => {
      const window = new BrowserWindow({
        width: 800,
        height: 600,
        modal: true,
        resizable: true,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
        },
        title: "Profile Management",
      });

      const profiles = this.profileManager.listProfiles();

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Profile Management</title>
          <style>
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              padding: 20px; 
              margin: 0; 
              background: #f5f5f5;
            }
            .container { 
              max-width: 100%; 
              background: white; 
              border-radius: 8px;
              padding: 20px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 { margin-top: 0; color: #333; }
            .profile-list { margin-bottom: 20px; }
            .profile-item { 
              border: 1px solid #ddd; 
              border-radius: 6px;
              padding: 15px; 
              margin-bottom: 10px;
              background: #fafafa;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .profile-item.default { border-color: #007acc; background: #f0f8ff; }
            .profile-info h3 { margin: 0 0 5px 0; color: #333; }
            .profile-info p { margin: 0; color: #666; font-size: 14px; }
            .profile-actions { display: flex; gap: 8px; }
            .profile-actions button { 
              padding: 6px 12px; 
              border: 1px solid #ddd;
              border-radius: 4px;
              background: white;
              cursor: pointer;
              font-size: 12px;
            }
            .profile-actions button:hover { background: #f0f0f0; }
            .profile-actions button.edit { border-color: #007acc; color: #007acc; }
            .profile-actions button.delete { border-color: #dc3545; color: #dc3545; }
            .profile-actions button:disabled { 
              opacity: 0.5; 
              cursor: not-allowed; 
              background: #f9f9f9;
            }
            .add-profile { 
              background: #007acc; 
              color: white; 
              padding: 10px 20px;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              margin-bottom: 20px;
            }
            .add-profile:hover { background: #0066aa; }
            .form-section { 
              display: none; 
              border: 1px solid #ddd;
              border-radius: 6px;
              padding: 20px;
              margin-bottom: 20px;
              background: #f9f9f9;
            }
            .form-section.active { display: block; }
            .form-section h3 { margin-top: 0; }
            .form-group { margin-bottom: 15px; }
            .form-group label { 
              display: block; 
              margin-bottom: 5px; 
              font-weight: 500;
              color: #333;
            }
            .form-group input { 
              width: 100%; 
              padding: 8px; 
              border: 1px solid #ddd;
              border-radius: 4px;
              font-size: 14px;
              box-sizing: border-box;
            }
            .form-actions { 
              display: flex; 
              gap: 10px; 
              justify-content: flex-end;
            }
            .form-actions button { 
              padding: 8px 16px; 
              border: 1px solid #ddd;
              border-radius: 4px;
              cursor: pointer;
            }
            .form-actions .save { background: #007acc; color: white; border-color: #007acc; }
            .form-actions .cancel { background: #6c757d; color: white; border-color: #6c757d; }
            .close-button { 
              position: absolute;
              top: 20px;
              right: 20px;
              background: none;
              border: none;
              font-size: 20px;
              cursor: pointer;
              color: #666;
            }
            .error { color: #dc3545; font-size: 12px; margin-top: 5px; }
            .empty-state { 
              text-align: center; 
              color: #666; 
              padding: 40px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <button class="close-button" onclick="closeModal()">&times;</button>
            <h1>Profile Management</h1>
            
            <button class="add-profile" onclick="showAddForm()">+ Add New Profile</button>
            
            <div id="add-form" class="form-section">
              <h3>Add New Profile</h3>
              <div class="form-group">
                <label for="new-name">Profile Name:</label>
                <input type="text" id="new-name" placeholder="Enter profile name (letters, numbers, hyphens only)">
                <div id="name-error" class="error"></div>
              </div>
              <div class="form-group">
                <label for="new-url">URL:</label>
                <input type="text" id="new-url" placeholder="https://" value="https://">
                <div id="url-error" class="error"></div>
              </div>
              <div class="form-actions">
                <button class="cancel" onclick="hideForm()">Cancel</button>
                <button class="save" onclick="saveNewProfile()">Create Profile</button>
              </div>
            </div>
            
            <div id="edit-form" class="form-section">
              <h3>Edit Profile</h3>
              <div class="form-group">
                <label for="edit-name">Profile Name:</label>
                <input type="text" id="edit-name">
                <div id="edit-name-error" class="error"></div>
              </div>
              <div class="form-group">
                <label for="edit-url">URL:</label>
                <input type="text" id="edit-url">
                <div id="edit-url-error" class="error"></div>
              </div>
              <div class="form-actions">
                <button class="cancel" onclick="hideForm()">Cancel</button>
                <button class="save" onclick="saveEditProfile()">Save Changes</button>
              </div>
            </div>
            
            <div class="profile-list">
              ${this.generateProfilesHTML(profiles)}
            </div>
          </div>
          
          <script>
            const { ipcRenderer } = require('electron');
            let currentEditProfile = null;
            
            function closeModal() {
              ipcRenderer.send('profile-modal-closed');
            }
            
            function showAddForm() {
              hideForm();
              document.getElementById('add-form').classList.add('active');
              document.getElementById('new-name').focus();
            }
            
            function showEditForm(profileName, profileUrl) {
              hideForm();
              currentEditProfile = profileName;
              document.getElementById('edit-name').value = profileName;
              document.getElementById('edit-url').value = profileUrl;
              document.getElementById('edit-name').disabled = profileName === 'default';
              document.getElementById('edit-form').classList.add('active');
              document.getElementById('edit-url').focus();
            }
            
            function hideForm() {
              document.getElementById('add-form').classList.remove('active');
              document.getElementById('edit-form').classList.remove('active');
              clearErrors();
              currentEditProfile = null;
            }
            
            function clearErrors() {
              document.querySelectorAll('.error').forEach(el => el.textContent = '');
            }
            
            function validateProfileName(name) {
              if (!name) return 'Profile name is required';
              if (!/^[a-zA-Z0-9-]+$/.test(name)) return 'Only letters, numbers, and hyphens allowed';
              if (name.length > 50) return 'Profile name too long (max 50 characters)';
              return null;
            }
            
            function validateUrl(url) {
              if (!url) return 'URL is required';
              if (!url.startsWith('http://') && !url.startsWith('https://')) {
                return 'URL must start with http:// or https://';
              }
              return null;
            }
            
            function saveNewProfile() {
              clearErrors();
              const name = document.getElementById('new-name').value.trim();
              const url = document.getElementById('new-url').value.trim();
              
              const nameError = validateProfileName(name);
              const urlError = validateUrl(url);
              
              if (nameError) {
                document.getElementById('name-error').textContent = nameError;
                return;
              }
              
              if (urlError) {
                document.getElementById('url-error').textContent = urlError;
                return;
              }
              
              ipcRenderer.send('create-profile', { name, url });
            }
            
            function saveEditProfile() {
              clearErrors();
              const name = document.getElementById('edit-name').value.trim();
              const url = document.getElementById('edit-url').value.trim();
              
              const nameError = currentEditProfile !== 'default' ? validateProfileName(name) : null;
              const urlError = validateUrl(url);
              
              if (nameError) {
                document.getElementById('edit-name-error').textContent = nameError;
                return;
              }
              
              if (urlError) {
                document.getElementById('edit-url-error').textContent = urlError;
                return;
              }
              
              const updates = { url };
              if (currentEditProfile !== 'default' && name !== currentEditProfile) {
                updates.name = name;
              }
              
              ipcRenderer.send('update-profile', { profileName: currentEditProfile, updates });
            }
            
            function deleteProfile(profileName) {
              if (confirm('Are you sure you want to delete this profile? This action cannot be undone.')) {
                ipcRenderer.send('delete-profile', { profileName });
              }
            }
            
            // Listen for responses
            ipcRenderer.on('profile-operation-result', (event, result) => {
              if (result.success) {
                // Refresh the page
                location.reload();
              } else {
                alert('Error: ' + result.error);
              }
            });
          </script>
        </body>
        </html>
      `;

      window.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));

      // Handle IPC messages
      const handleProfileOperation = (event, data) => {
        try {
          let result;
          switch (event) {
            case 'create-profile':
              this.profileManager.createProfile(data.name, data.url);
              result = { success: true };
              break;
            case 'update-profile':
              this.profileManager.updateProfile(data.profileName, data.updates);
              result = { success: true };
              break;
            case 'delete-profile':
              this.profileManager.deleteProfile(data.profileName);
              result = { success: true };
              break;
          }
          window.webContents.send('profile-operation-result', result);
        } catch (error) {
          window.webContents.send('profile-operation-result', { 
            success: false, 
            error: error.message 
          });
        }
      };

      ipcMain.on('create-profile', (event, data) => handleProfileOperation('create-profile', data));
      ipcMain.on('update-profile', (event, data) => handleProfileOperation('update-profile', data));
      ipcMain.on('delete-profile', (event, data) => handleProfileOperation('delete-profile', data));

      ipcMain.once('profile-modal-closed', () => {
        // Clean up IPC listeners
        ipcMain.removeAllListeners('create-profile');
        ipcMain.removeAllListeners('update-profile');
        ipcMain.removeAllListeners('delete-profile');
        window.close();
        resolve();
      });

      window.on('closed', () => {
        // Clean up IPC listeners
        ipcMain.removeAllListeners('create-profile');
        ipcMain.removeAllListeners('update-profile');
        ipcMain.removeAllListeners('delete-profile');
        resolve();
      });
    });
  }

  generateProfilesHTML(profiles) {
    if (profiles.length === 0) {
      return '<div class="empty-state">No profiles found. Create your first profile above!</div>';
    }

    return profiles.map(profile => `
      <div class="profile-item ${profile.isDefault ? 'default' : ''}">
        <div class="profile-info">
          <h3>${profile.name} ${profile.isDefault ? '(Default)' : ''}</h3>
          <p><strong>URL:</strong> ${profile.url}</p>
          <p><strong>Created:</strong> ${new Date(profile.created).toLocaleDateString()}</p>
          ${profile.modified ? `<p><strong>Modified:</strong> ${new Date(profile.modified).toLocaleDateString()}</p>` : ''}
        </div>
        <div class="profile-actions">
          <button class="edit" onclick="showEditForm('${profile.name}', '${profile.url}')">
            Edit
          </button>
          <button class="delete" ${profile.isDefault ? 'disabled' : ''} 
                  onclick="deleteProfile('${profile.name}')"
                  ${profile.isDefault ? 'title="Default profile cannot be deleted"' : ''}>
            Delete
          </button>
        </div>
      </div>
    `).join('');
  }
}

module.exports = ProfileModal;