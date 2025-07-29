/**
 * List Kamba - Router and Navigation System
 * Handles internal navigation while maintaining correct base paths
 */

class Router {
  constructor() {
    this.urlFix = window.URLFix;
    this.currentPage = 'dashboard';
    this.init();
  }

  /**
   * Initialize the router
   */
  init() {
    // Set up navigation event listeners
    this.setupNavigationListeners();
    
    // Handle initial page load
    this.handleInitialLoad();
    
    // Handle browser back/forward buttons
    window.addEventListener('popstate', (event) => {
      this.handlePopState(event);
    });
  }

  /**
   * Set up event listeners for navigation links
   */
  setupNavigationListeners() {
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[data-page]');
      if (link) {
        event.preventDefault();
        const page = link.getAttribute('data-page');
        this.navigateTo(page);
      }
    });
  }

  /**
   * Handle initial page load and URL parsing
   */
  handleInitialLoad() {
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page') || 'dashboard';
    this.navigateTo(page, false); // Don't push to history on initial load
  }

  /**
   * Navigate to a specific page
   */
  navigateTo(page, pushState = true) {
    if (this.currentPage === page) return;

    this.currentPage = page;
    
    // Update URL if needed
    if (pushState) {
      const newUrl = this.buildPageURL(page);
      window.history.pushState({ page }, '', newUrl);
    }
    
    // Update page content
    this.updatePageContent(page);
    
    // Update navigation state
    this.updateNavigationState(page);
  }

  /**
   * Build correct URL for a page
   */
  buildPageURL(page) {
    const baseURL = this.urlFix.getBaseURL();
    if (page === 'dashboard') {
      return baseURL;
    }
    return `${baseURL}?page=${page}`;
  }

  /**
   * Update page content based on current page
   */
  updatePageContent(page) {
    // Hide all page sections
    const sections = document.querySelectorAll('[data-section]');
    sections.forEach(section => {
      section.style.display = 'none';
    });

    // Show current page section
    const currentSection = document.querySelector(`[data-section="${page}"]`);
    if (currentSection) {
      currentSection.style.display = 'block';
    }

    // Update page title
    this.updatePageTitle(page);
  }

  /**
   * Update navigation state (active links, etc.)
   */
  updateNavigationState(page) {
    // Remove active class from all nav links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => link.classList.remove('active'));

    // Add active class to current page link
    const currentLink = document.querySelector(`[data-page="${page}"]`);
    if (currentLink) {
      currentLink.classList.add('active');
    }
  }

  /**
   * Update page title
   */
  updatePageTitle(page) {
    const titles = {
      dashboard: 'Dashboard - List Kamba',
      tasks: 'Tarefas - List Kamba',
      calendar: 'Calendário - List Kamba',
      timer: 'Cronómetro - List Kamba',
      analytics: 'Analytics - List Kamba',
      settings: 'Configurações - List Kamba'
    };
    
    document.title = titles[page] || 'List Kamba';
  }

  /**
   * Handle browser back/forward navigation
   */
  handlePopState(event) {
    const page = event.state?.page || 'dashboard';
    this.navigateTo(page, false);
  }

  /**
   * Get current page
   */
  getCurrentPage() {
    return this.currentPage;
  }
}

// Initialize router when URLFix is ready
document.addEventListener('DOMContentLoaded', () => {
  // Wait for URLFix to be available
  if (window.URLFix) {
    window.Router = new Router();
  } else {
    // Wait for URLFix to initialize
    setTimeout(() => {
      window.Router = new Router();
    }, 100);
  }
});