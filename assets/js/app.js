/**
 * List Kamba - Main Application
 * Coordinates all app modules and handles navigation
 */

class ListKambaApp {
  constructor() {
    this.currentView = 'dashboard';
    this.isOnline = navigator.onLine;
    this.installPrompt = null;
    
    this.init();
  }

  async init() {
    console.log('🇦🇴 List Kamba - Inicializando aplicação...');
    
    try {
      // Initialize core systems
      await this.initializeApp();
      
      // Setup UI
      this.setupNavigation();
      this.setupTheme();
      this.setupInstallPrompt();
      this.setupKeyboardShortcuts();
      
      // Start services
      this.startOnlineStatusMonitor();
      this.loadInitialData();
      
      console.log('✅ List Kamba inicializado com sucesso!');
      
      // Show welcome message for first-time users
      this.showWelcomeIfFirstTime();
      
    } catch (error) {
      console.error('❌ Erro ao inicializar aplicação:', error);
      this.showErrorState();
    }
  }

  async initializeApp() {
    // Wait for all core modules to be ready
    const modules = ['Storage', 'Tasks', 'Notifications'];
    
    for (const module of modules) {
      if (!window[module]) {
        await this.waitForModule(module);
      }
    }
    
    // Track app initialization
    await Storage.trackEvent('app_initialized', {
      userAgent: navigator.userAgent,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  }

  waitForModule(moduleName, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkModule = () => {
        if (window[moduleName]) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Module ${moduleName} failed to load within ${timeout}ms`));
        } else {
          setTimeout(checkModule, 100);
        }
      };
      
      checkModule();
    });
  }

  setupNavigation() {
    // Handle navigation clicks
    Utils.DOM.$$('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        if (page) {
          this.navigateTo(page);
        }
      });
    });

    // Handle mobile menu toggle
    const mobileToggle = Utils.DOM.$('#mobileNavToggle');
    const navMenu = Utils.DOM.$('#navMenu');
    
    if (mobileToggle && navMenu) {
      mobileToggle.addEventListener('click', () => {
        navMenu.classList.toggle('open');
        mobileToggle.classList.toggle('active');
      });
      
      // Close mobile menu when clicking outside
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.app-header')) {
          navMenu.classList.remove('open');
          mobileToggle.classList.remove('active');
        }
      });
    }

    // Handle custom navigation events
    window.addEventListener('navigateTo', (e) => {
      this.navigateTo(e.detail.page);
    });

    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
      const page = e.state?.page || 'dashboard';
      this.navigateTo(page, false); // Don't push to history
    });

    // Set initial state
    this.updateHistory();
  }

  navigateTo(page, pushState = true) {
    // Validate page
    const validPages = ['dashboard', 'tasks', 'calendar', 'timer', 'analytics', 'settings'];
    if (!validPages.includes(page)) {
      console.warn(`Invalid page: ${page}`);
      return;
    }

    // Hide current view
    const currentView = Utils.DOM.$(`#${this.currentView}`);
    if (currentView) {
      currentView.classList.remove('active');
    }

    // Show new view
    const newView = Utils.DOM.$(`#${page}`);
    if (newView) {
      newView.classList.add('active');
    }

    // Update navigation
    Utils.DOM.$$('.nav-link').forEach(link => {
      link.classList.remove('active');
    });
    
    const activeLink = Utils.DOM.$(`[data-page="${page}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
    }

    // Update current view
    this.currentView = page;

    // Update browser history
    if (pushState) {
      this.updateHistory();
    }

    // Close mobile menu
    const navMenu = Utils.DOM.$('#navMenu');
    const mobileToggle = Utils.DOM.$('#mobileNavToggle');
    if (navMenu) navMenu.classList.remove('open');
    if (mobileToggle) mobileToggle.classList.remove('active');

    // Track page view
    Storage.trackEvent('page_viewed', { page });

    // Page-specific actions
    this.onPageChange(page);
  }

  onPageChange(page) {
    switch (page) {
      case 'tasks':
        // Refresh tasks when navigating to tasks page
        if (window.Tasks) {
          Tasks.loadTasks();
        }
        break;
        
      case 'dashboard':
        // Update dashboard stats
        if (window.Tasks) {
          Tasks.updateDashboardStats();
        }
        break;
        
      case 'settings':
        this.loadSettingsPage();
        break;
    }
  }

  updateHistory() {
    const title = this.getPageTitle(this.currentView);
    const url = this.currentView === 'dashboard' ? '/' : `/${this.currentView}`;
    
    history.pushState(
      { page: this.currentView }, 
      title, 
      url
    );
    
    document.title = title;
  }

  getPageTitle(page) {
    const titles = {
      dashboard: 'List Kamba - Dashboard',
      tasks: 'List Kamba - Tarefas', 
      calendar: 'List Kamba - Calendário',
      timer: 'List Kamba - Cronómetro',
      analytics: 'List Kamba - Estatísticas',
      settings: 'List Kamba - Configurações'
    };
    
    return titles[page] || 'List Kamba';
  }

  async loadSettingsPage() {
    try {
      // Load current settings
      const themeSelector = Utils.DOM.$('#themeSelector');
      const notificationsToggle = Utils.DOM.$('#enableNotifications');
      
      if (themeSelector) {
        const currentTheme = await Storage.getSetting('theme', 'light');
        themeSelector.value = currentTheme;
        
        themeSelector.addEventListener('change', (e) => {
          this.setTheme(e.target.value);
        });
      }
      
      if (notificationsToggle) {
        const notificationsEnabled = await Storage.getSetting('notifications.enabled', true);
        notificationsToggle.checked = notificationsEnabled;
        
        notificationsToggle.addEventListener('change', (e) => {
          this.toggleNotifications(e.target.checked);
        });
      }
      
    } catch (error) {
      console.error('Error loading settings page:', error);
    }
  }

  setupTheme() {
    // Load saved theme
    Storage.getSetting('theme', 'light').then(theme => {
      this.setTheme(theme);
    });

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addListener((e) => {
      Storage.getSetting('theme').then(savedTheme => {
        if (savedTheme === 'auto') {
          this.applyTheme(e.matches ? 'dark' : 'light');
        }
      });
    });
  }

  async setTheme(theme) {
    await Storage.setSetting('theme', theme);
    
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.applyTheme(prefersDark ? 'dark' : 'light');
    } else {
      this.applyTheme(theme);
    }
    
    // Track theme change
    await Storage.trackEvent('theme_changed', { theme });
  }

  applyTheme(theme) {
    document.body.dataset.theme = theme;
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = Utils.DOM.$('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.content = theme === 'dark' ? '#0F2027' : '#2F5F8F';
    }
    
    // Add transition class for smooth theme switching
    document.body.classList.add('theme-switching');
    setTimeout(() => {
      document.body.classList.remove('theme-switching');
    }, 300);
  }

  async toggleNotifications(enabled) {
    if (enabled) {
      const granted = await Notifications.requestPermission();
      if (!granted) {
        // Revert toggle if permission denied
        const toggle = Utils.DOM.$('#enableNotifications');
        if (toggle) toggle.checked = false;
        return;
      }
    }
    
    Notifications.updateSettings({ enabled });
    showToast(
      enabled ? 'Notificações ativadas' : 'Notificações desativadas', 
      'success'
    );
  }

  setupInstallPrompt() {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installPrompt = e;
      this.showInstallButton();
    });

    // Listen for app installation
    window.addEventListener('appinstalled', () => {
      this.hideInstallButton();
      showToast('List Kamba instalado com sucesso! 🎉', 'success');
      Storage.trackEvent('app_installed');
    });
  }

  showInstallButton() {
    // Create install button if it doesn't exist
    let installBtn = Utils.DOM.$('#installBtn');
    
    if (!installBtn) {
      installBtn = Utils.DOM.createElement('button', {
        id: 'installBtn',
        className: 'btn btn-primary install-btn',
        innerHTML: '📱 Instalar App'
      });
      
      const header = Utils.DOM.$('.header-content');
      if (header) {
        header.appendChild(installBtn);
      }
    }
    
    installBtn.addEventListener('click', () => {
      this.promptInstall();
    });
    
    installBtn.style.display = 'inline-flex';
  }

  hideInstallButton() {
    const installBtn = Utils.DOM.$('#installBtn');
    if (installBtn) {
      installBtn.style.display = 'none';
    }
  }

  async promptInstall() {
    if (!this.installPrompt) return;
    
    try {
      const result = await this.installPrompt.prompt();
      console.log('Install prompt result:', result.outcome);
      
      this.installPrompt = null;
      this.hideInstallButton();
      
    } catch (error) {
      console.error('Error showing install prompt:', error);
    }
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Skip if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      
      // Navigation shortcuts
      if (isCtrlOrCmd) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            this.navigateTo('dashboard');
            break;
          case '2':
            e.preventDefault();
            this.navigateTo('tasks');
            break;
          case '3':
            e.preventDefault();
            this.navigateTo('calendar');
            break;
          case '4':
            e.preventDefault();
            this.navigateTo('timer');
            break;
          case '5':
            e.preventDefault();
            this.navigateTo('analytics');
            break;
          case ',':
            e.preventDefault();
            this.navigateTo('settings');
            break;
        }
      }

      // Other shortcuts
      switch (e.key) {
        case '?':
          e.preventDefault();
          this.showKeyboardShortcuts();
          break;
      }
    });
  }

  showKeyboardShortcuts() {
    const shortcuts = [
      { key: 'Ctrl/Cmd + N', action: 'Nova tarefa' },
      { key: 'Ctrl/Cmd + 1', action: 'Dashboard' },
      { key: 'Ctrl/Cmd + 2', action: 'Tarefas' },
      { key: 'Ctrl/Cmd + 3', action: 'Calendário' },
      { key: 'Ctrl/Cmd + 4', action: 'Cronómetro' },
      { key: 'Ctrl/Cmd + 5', action: 'Estatísticas' },
      { key: 'Ctrl/Cmd + ,', action: 'Configurações' },
      { key: 'Escape', action: 'Fechar modal' },
      { key: '?', action: 'Mostrar atalhos' }
    ];

    const content = shortcuts.map(shortcut => 
      `<div class="shortcut-item">
        <span class="shortcut-key">${shortcut.key}</span>
        <span class="shortcut-action">${shortcut.action}</span>
      </div>`
    ).join('');

    this.showModal('Atalhos de Teclado', `
      <div class="shortcuts-list">
        ${content}
      </div>
    `);
  }

  showModal(title, content) {
    // Create modal if it doesn't exist
    let modal = Utils.DOM.$('#globalModal');
    
    if (!modal) {
      modal = Utils.DOM.createElement('div', {
        id: 'globalModal',
        className: 'modal'
      });
      
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h2 class="modal-title"></h2>
            <button class="modal-close" onclick="this.closest('.modal').classList.remove('show')">&times;</button>
          </div>
          <div class="modal-body"></div>
        </div>
      `;
      
      document.body.appendChild(modal);
    }
    
    // Update content
    Utils.DOM.$('#globalModal .modal-title').textContent = title;
    Utils.DOM.$('#globalModal .modal-body').innerHTML = content;
    
    // Show modal
    modal.classList.add('show');
  }

  startOnlineStatusMonitor() {
    const updateOnlineStatus = () => {
      const wasOnline = this.isOnline;
      this.isOnline = navigator.onLine;
      
      if (!wasOnline && this.isOnline) {
        showToast('Conexão restaurada! 🌐', 'success');
        this.onBackOnline();
      } else if (wasOnline && !this.isOnline) {
        showToast('Você está offline. O app continuará funcionando! 📱', 'warning');
        this.onGoOffline();
      }
      
      this.updateOnlineIndicator();
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Initial status
    updateOnlineStatus();
  }

  updateOnlineIndicator() {
    // Add online/offline indicator to header
    let indicator = Utils.DOM.$('#onlineIndicator');
    
    if (!indicator) {
      indicator = Utils.DOM.createElement('div', {
        id: 'onlineIndicator',
        className: 'online-indicator'
      });
      
      const header = Utils.DOM.$('.header-content');
      if (header) {
        header.appendChild(indicator);
      }
    }
    
    indicator.className = `online-indicator ${this.isOnline ? 'online' : 'offline'}`;
    indicator.innerHTML = this.isOnline ? 
      '<span class="indicator-dot"></span> Online' : 
      '<span class="indicator-dot"></span> Offline';
  }

  onBackOnline() {
    // Sync any pending data
    if (window.Storage) {
      Storage.processSyncQueue();
    }
    
    // Process queued notifications
    if (window.Notifications) {
      Notifications.processNotificationQueue();
    }
  }

  onGoOffline() {
    // Nothing special needed - app works offline
    Storage.trackEvent('went_offline');
  }

  async loadInitialData() {
    try {
      // Load and display initial tasks
      if (window.Tasks) {
        await Tasks.loadTasks();
      }
      
      // Update any time-sensitive data
      this.updateTimeElements();
      
      // Start periodic updates
      setInterval(() => {
        this.updateTimeElements();
      }, 60000); // Update every minute
      
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  }

  updateTimeElements() {
    // Update any relative time displays
    Utils.DOM.$$('.relative-time').forEach(element => {
      const date = element.dataset.date;
      if (date) {
        element.textContent = Utils.Date.getRelativeTime(new Date(date));
      }
    });
  }

  async showWelcomeIfFirstTime() {
    const hasShownWelcome = await Storage.getSetting('hasShownWelcome', false);
    
    if (!hasShownWelcome) {
      setTimeout(() => {
        this.showWelcomeModal();
        Storage.setSetting('hasShownWelcome', true);
      }, 1000);
    }
  }

  showWelcomeModal() {
    this.showModal('Bem-vindo ao List Kamba! 🇦🇴', `
      <div class="welcome-content">
        <div class="welcome-header">
          <div class="logo-icon">LK</div>
          <h3>Organize suas tarefas com estilo angolano!</h3>
        </div>
        <div class="welcome-features">
          <div class="feature">
            <span class="feature-icon">📱</span>
            <div class="feature-text">
              <strong>Funciona offline</strong><br>
              Use mesmo sem internet
            </div>
          </div>
          <div class="feature">
            <span class="feature-icon">🇦🇴</span>
            <div class="feature-text">
              <strong>Feito para Angola</strong><br>
              Feriados e datas locais incluídos
            </div>
          </div>
          <div class="feature">
            <span class="feature-icon">🎯</span>
            <div class="feature-text">
              <strong>Pomodoro integrado</strong><br>
              Aumente sua produtividade
            </div>
          </div>
          <div class="feature">
            <span class="feature-icon">📊</span>
            <div class="feature-text">
              <strong>Estatísticas detalhadas</strong><br>
              Acompanhe seu progresso
            </div>
          </div>
        </div>
        <div class="welcome-actions">
          <button class="btn btn-primary" onclick="Tasks.showTaskModal(); document.querySelector('#globalModal').classList.remove('show')">
            Criar Primeira Tarefa
          </button>
          <button class="btn btn-secondary" onclick="document.querySelector('#globalModal').classList.remove('show')">
            Explorar App
          </button>
        </div>
      </div>
    `);
  }

  showErrorState() {
    const container = Utils.DOM.$('.main-content .container');
    if (container) {
      container.innerHTML = `
        <div class="error-state">
          <div class="error-icon">⚠️</div>
          <h2>Erro ao Carregar Aplicação</h2>
          <p>Ocorreu um erro ao inicializar o List Kamba. Tente recarregar a página.</p>
          <button class="btn btn-primary" onclick="window.location.reload()">
            Recarregar Página
          </button>
        </div>
      `;
    }
  }

  // App lifecycle
  onBeforeUnload() {
    // Save any pending data
    if (window.Storage) {
      // Storage auto-saves, but we can trigger a final sync
    }
  }

  // Performance monitoring
  measurePerformance() {
    if ('performance' in window && 'timing' in performance) {
      const timing = performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      
      Storage.trackEvent('performance_measurement', {
        loadTime,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0
      });
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.App = new ListKambaApp();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
  if (window.App) {
    App.onBeforeUnload();
  }
});

// Measure performance after load
window.addEventListener('load', () => {
  setTimeout(() => {
    if (window.App) {
      App.measurePerformance();
    }
  }, 0);
});

// Global error handling
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  
  if (window.Storage) {
    Storage.trackEvent('javascript_error', {
      message: event.message,
      filename: event.filename,
      line: event.lineno,
      column: event.colno
    });
  }
});

// Global unhandled promise rejection handling
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  
  if (window.Storage) {
    Storage.trackEvent('promise_rejection', {
      reason: event.reason?.toString() || 'Unknown'
    });
  }
});

// Make app available globally
window.ListKambaApp = ListKambaApp;