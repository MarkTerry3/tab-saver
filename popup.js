// Tab Saver Extension - Main Logic
// Use browser API (Firefox) with chrome fallback (Chrome/Edge)
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

class TabSaver {
  constructor() {
    this.currentFolderId = null;
    this.folders = [];
    this.draggedItem = null;
    this.draggedIndex = null;
    
    // DOM Elements
    this.folderNameInput = document.getElementById('folderName');
    this.saveBtn = document.getElementById('saveBtn');
    this.tabCountEl = document.getElementById('tabCount');
    this.foldersListEl = document.getElementById('foldersList');
    this.detailView = document.getElementById('detailView');
    this.mainContainer = document.querySelector('.container:not(.detail-view)');
    this.detailTitle = document.getElementById('detailTitle');
    this.tabsListEl = document.getElementById('tabsList');
    this.backBtn = document.getElementById('backBtn');
    this.openAllBtn = document.getElementById('openAllBtn');
    this.deleteFolderBtn = document.getElementById('deleteFolder');
    this.renameBtn = document.getElementById('renameBtn');
    this.themeToggle = document.getElementById('themeToggle');
    
    this.init();
  }
  
  async init() {
    await this.loadFolders();
    await this.loadTheme();
    await this.updateTabCount();
    this.bindEvents();
    this.renderFolders();
  }
  
  bindEvents() {
    // Save button
    this.saveBtn.addEventListener('click', () => this.saveTabs());
    
    // Enter key in input
    this.folderNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.saveTabs();
    });
    
    // Back button
    this.backBtn.addEventListener('click', () => this.showMainView());
    
    // Open all tabs
    this.openAllBtn.addEventListener('click', () => this.openAllTabs());
    
    // Delete folder
    this.deleteFolderBtn.addEventListener('click', () => this.deleteCurrentFolder());
    
    // Rename folder
    this.renameBtn.addEventListener('click', () => this.startRename());
    this.detailTitle.addEventListener('blur', () => this.finishRename());
    this.detailTitle.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.detailTitle.blur();
      }
    });
    
    // Theme toggle
    this.themeToggle.addEventListener('click', () => this.toggleTheme());
  }
  
  // Theme functions
  async loadTheme() {
    const result = await browserAPI.storage.local.get('darkMode');
    if (result.darkMode) {
      document.body.classList.add('dark-mode');
      this.themeToggle.classList.add('active');
    }
  }
  
  async toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    this.themeToggle.classList.toggle('active', isDark);
    await browserAPI.storage.local.set({ darkMode: isDark });
  }
  
  // Rename functions
  startRename() {
    this.detailTitle.readOnly = false;
    this.detailTitle.classList.add('editing');
    this.detailTitle.focus();
    this.detailTitle.select();
  }
  
  async finishRename() {
    this.detailTitle.readOnly = true;
    this.detailTitle.classList.remove('editing');
    
    const newName = this.detailTitle.value.trim();
    if (!newName) {
      const folder = this.folders.find(f => f.id === this.currentFolderId);
      if (folder) this.detailTitle.value = folder.name;
      return;
    }
    
    const folderIndex = this.folders.findIndex(f => f.id === this.currentFolderId);
    if (folderIndex === -1) return;
    
    if (this.folders[folderIndex].name !== newName) {
      this.folders[folderIndex].name = newName;
      await this.saveFolders();
      this.showToast('Session renamed');
    }
  }
  
  async loadFolders() {
    const result = await browserAPI.storage.local.get('folders');
    this.folders = result.folders || [];
  }
  
  async saveFolders() {
    await browserAPI.storage.local.set({ folders: this.folders });
  }
  
  async updateTabCount() {
    const tabs = await browserAPI.tabs.query({ currentWindow: true });
    const count = tabs.length;
    this.tabCountEl.textContent = `${count} tab${count !== 1 ? 's' : ''} open`;
  }
  
  async saveTabs() {
    const name = this.folderNameInput.value.trim();
    
    if (!name) {
      this.showToast('Please enter a session name', 'error');
      this.folderNameInput.focus();
      return;
    }
    
    const tabs = await browserAPI.tabs.query({ currentWindow: true });
    
    if (tabs.length === 0) {
      this.showToast('No tabs to save', 'error');
      return;
    }
    
    const folder = {
      id: Date.now().toString(),
      name: name,
      createdAt: new Date().toISOString(),
      tabs: tabs.map(tab => ({
        id: tab.id,
        title: tab.title || 'Untitled',
        url: tab.url,
        favIconUrl: tab.favIconUrl || null
      }))
    };
    
    this.folders.unshift(folder);
    await this.saveFolders();
    
    this.folderNameInput.value = '';
    this.renderFolders();
    this.showToast(`Saved ${tabs.length} tabs to "${name}"`);
  }
  
  renderFolders() {
    if (this.folders.length === 0) {
      this.foldersListEl.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4">
            <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z"/>
          </svg>
          <p>No saved sessions yet</p>
        </div>
      `;
      return;
    }
    
    this.foldersListEl.innerHTML = this.folders.map((folder, index) => `
      <div class="folder-item" data-id="${folder.id}" data-index="${index}" draggable="true">
        <div class="folder-drag-handle">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="2"/><circle cx="15" cy="6" r="2"/>
            <circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/>
            <circle cx="9" cy="18" r="2"/><circle cx="15" cy="18" r="2"/>
          </svg>
        </div>
        <div class="folder-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z"/>
          </svg>
        </div>
        <div class="folder-info">
          <div class="folder-name">${this.escapeHtml(folder.name)}</div>
          <div class="folder-meta">${folder.tabs.length} tab${folder.tabs.length !== 1 ? 's' : ''} · ${this.formatDate(folder.createdAt)}</div>
        </div>
        <div class="folder-arrow">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18L15 12L9 6"/>
          </svg>
        </div>
      </div>
    `).join('');
    
    // Bind click and drag events to folders
    this.foldersListEl.querySelectorAll('.folder-item').forEach(item => {
      // Click to open
      item.addEventListener('click', (e) => {
        if (e.target.closest('.folder-drag-handle')) return;
        const folderId = item.dataset.id;
        this.showFolderDetail(folderId);
      });
      
      // Drag events
      item.addEventListener('dragstart', (e) => this.handleDragStart(e, item));
      item.addEventListener('dragend', (e) => this.handleDragEnd(e, item));
      item.addEventListener('dragover', (e) => this.handleDragOver(e, item));
      item.addEventListener('dragleave', (e) => this.handleDragLeave(e, item));
      item.addEventListener('drop', (e) => this.handleDrop(e, item));
    });
  }
  
  // Drag and drop handlers
  handleDragStart(e, item) {
    this.draggedItem = item;
    this.draggedIndex = parseInt(item.dataset.index);
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  }
  
  handleDragEnd(e, item) {
    item.classList.remove('dragging');
    this.foldersListEl.querySelectorAll('.folder-item').forEach(i => {
      i.classList.remove('drag-over');
    });
    this.draggedItem = null;
    this.draggedIndex = null;
  }
  
  handleDragOver(e, item) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (item !== this.draggedItem) {
      item.classList.add('drag-over');
    }
  }
  
  handleDragLeave(e, item) {
    item.classList.remove('drag-over');
  }
  
  async handleDrop(e, item) {
    e.preventDefault();
    item.classList.remove('drag-over');
    
    const targetIndex = parseInt(item.dataset.index);
    if (this.draggedIndex === null || this.draggedIndex === targetIndex) return;
    
    // Reorder folders
    const [movedFolder] = this.folders.splice(this.draggedIndex, 1);
    this.folders.splice(targetIndex, 0, movedFolder);
    
    await this.saveFolders();
    this.renderFolders();
    this.showToast('Session reordered');
  }
  
  showFolderDetail(folderId) {
    const folder = this.folders.find(f => f.id === folderId);
    if (!folder) return;
    
    this.currentFolderId = folderId;
    this.detailTitle.value = folder.name;
    
    this.renderTabs(folder.tabs);
    
    this.mainContainer.style.display = 'none';
    this.detailView.style.display = 'flex';
  }
  
  showMainView() {
    this.currentFolderId = null;
    this.detailView.style.display = 'none';
    this.mainContainer.style.display = 'flex';
    this.renderFolders();
  }
  
  renderTabs(tabs) {
    if (tabs.length === 0) {
      this.tabsListEl.innerHTML = `
        <div class="empty-state">
          <p>No tabs in this session</p>
        </div>
      `;
      return;
    }
    
    this.tabsListEl.innerHTML = tabs.map((tab, index) => `
      <div class="tab-item" data-index="${index}">
        ${tab.favIconUrl 
          ? `<img class="tab-favicon" src="${this.escapeHtml(tab.favIconUrl)}" alt="" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
             <div class="tab-favicon-placeholder" style="display: none;">
               <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                 <circle cx="12" cy="12" r="10"/>
               </svg>
             </div>`
          : `<div class="tab-favicon-placeholder">
               <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                 <circle cx="12" cy="12" r="10"/>
               </svg>
             </div>`
        }
        <div class="tab-info">
          <div class="tab-title">${this.escapeHtml(tab.title)}</div>
          <div class="tab-url">${this.escapeHtml(this.formatUrl(tab.url))}</div>
        </div>
        <button class="tab-remove" data-index="${index}" title="Remove tab">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6L18 18"/>
          </svg>
        </button>
      </div>
    `).join('');
    
    // Bind remove events
    this.tabsListEl.querySelectorAll('.tab-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        this.confirmRemoveTab(index);
      });
    });
    
    // Bind click to open tab
    this.tabsListEl.querySelectorAll('.tab-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.tab-remove')) return;
        const index = parseInt(item.dataset.index);
        const folder = this.folders.find(f => f.id === this.currentFolderId);
        if (folder && folder.tabs[index]) {
          browserAPI.tabs.create({ url: folder.tabs[index].url });
        }
      });
    });
  }
  
  confirmRemoveTab(index) {
    const folder = this.folders.find(f => f.id === this.currentFolderId);
    if (!folder) return;
    
    const tab = folder.tabs[index];
    const tabName = tab.title.length > 30 ? tab.title.substring(0, 30) + '...' : tab.title;
    
    if (confirm(`Remove "${tabName}" from this session?`)) {
      this.removeTab(index);
    }
  }
  
  async removeTab(index) {
    const folderIndex = this.folders.findIndex(f => f.id === this.currentFolderId);
    if (folderIndex === -1) return;
    
    const folder = this.folders[folderIndex];
    const removedTab = folder.tabs[index];
    folder.tabs.splice(index, 1);
    
    // If no tabs left, optionally remove the folder
    if (folder.tabs.length === 0) {
      this.folders.splice(folderIndex, 1);
      await this.saveFolders();
      this.showMainView();
      this.showToast('Session deleted (no tabs remaining)');
      return;
    }
    
    await this.saveFolders();
    this.renderTabs(folder.tabs);
    this.showToast(`Removed tab`);
  }
  
  async openAllTabs() {
    const folder = this.folders.find(f => f.id === this.currentFolderId);
    if (!folder || folder.tabs.length === 0) return;
    
    // Filter out URLs that browsers won't let extensions open
    const urls = folder.tabs
      .map(tab => tab.url)
      .filter(url => {
        if (!url) return false;
        // Skip restricted URLs
        const restricted = ['about:', 'chrome:', 'edge:', 'file:', 'moz-extension:', 'chrome-extension:'];
        return !restricted.some(prefix => url.startsWith(prefix));
      });
    
    if (urls.length === 0) {
      this.showToast('No valid URLs to open', 'error');
      return;
    }
    
    // Send to background script which persists after popup closes
    browserAPI.runtime.sendMessage({
      action: 'openAllTabs',
      urls: urls
    });
  }
  
  async deleteCurrentFolder() {
    const folderIndex = this.folders.findIndex(f => f.id === this.currentFolderId);
    if (folderIndex === -1) return;
    
    const folder = this.folders[folderIndex];
    
    if (!confirm(`Delete "${folder.name}" with ${folder.tabs.length} tabs?`)) {
      return;
    }
    
    this.folders.splice(folderIndex, 1);
    await this.saveFolders();
    this.showMainView();
    this.showToast(`Deleted "${folder.name}"`);
  }
  
  showToast(message, type = 'success') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });
    
    // Remove after delay
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }
  
  formatDate(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }
  
  formatUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname + (urlObj.pathname !== '/' ? urlObj.pathname : '');
    } catch {
      return url;
    }
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new TabSaver();
});
