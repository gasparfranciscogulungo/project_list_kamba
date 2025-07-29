/**
 * List Kamba - URL Fix and Base Path Detection
 * Handles GitHub Pages compatibility and URL validation
 */

class URLFix {
  constructor() {
    this.basePath = this.detectBasePath();
    this.isGitHubPages = this.detectGitHubPages();
    this.init();
  }

  /**
   * Detect if we're running on GitHub Pages
   */
  detectGitHubPages() {
    return window.location.hostname.includes('github.io');
  }

  /**
   * Detect the base path for the application
   */
  detectBasePath() {
    const path = window.location.pathname;
    
    // If we're on GitHub Pages, extract the repo name
    if (this.detectGitHubPages()) {
      const pathParts = path.split('/').filter(part => part);
      if (pathParts.length > 0) {
        return `/${pathParts[0]}/`;
      }
    }
    
    // For local development or root deployments
    return '/';
  }

  /**
   * Get the correct base URL for the application
   */
  getBaseURL() {
    return `${window.location.protocol}//${window.location.host}${this.basePath}`;
  }

  /**
   * Convert a relative path to absolute path with base
   */
  resolvePath(path) {
    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    
    // For GitHub Pages, ensure we include the repo path
    if (this.isGitHubPages && this.basePath !== '/') {
      return this.basePath + cleanPath;
    }
    
    return '/' + cleanPath;
  }

  /**
   * Validate current URL and redirect if necessary
   */
  validateAndRedirect() {
    const currentPath = window.location.pathname;
    const expectedBasePath = this.basePath;

    // Check if we're at the root but should be at the base path
    if (this.isGitHubPages && currentPath === '/' && expectedBasePath !== '/') {
      console.log('🔄 Redirecting to correct GitHub Pages URL...');
      window.location.href = this.getBaseURL();
      return false;
    }

    // Check if we're missing the base path
    if (this.isGitHubPages && !currentPath.startsWith(expectedBasePath)) {
      console.log('🔄 Fixing URL path...');
      const newPath = expectedBasePath + currentPath.substring(1);
      window.location.href = window.location.protocol + '//' + window.location.host + newPath;
      return false;
    }

    return true;
  }

  /**
   * Initialize URL fixes
   */
  init() {
    // Validate and redirect if necessary
    if (!this.validateAndRedirect()) {
      return; // Will redirect, so don't continue
    }

    // Log current configuration
    console.log('🔧 URL Fix initialized:', {
      isGitHubPages: this.isGitHubPages,
      basePath: this.basePath,
      baseURL: this.getBaseURL()
    });

    // Update document base if needed
    this.updateDocumentBase();
  }

  /**
   * Update document base element for relative URLs
   */
  updateDocumentBase() {
    let baseElement = document.querySelector('base');
    
    if (!baseElement) {
      baseElement = document.createElement('base');
      document.head.insertBefore(baseElement, document.head.firstChild);
    }
    
    baseElement.href = this.getBaseURL();
  }
}

// Global instance
window.URLFix = new URLFix();