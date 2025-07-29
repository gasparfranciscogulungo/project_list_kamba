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
    return window.location.hostname.includes('github.io') || 
           window.location.hostname.includes('localhost'); // Include localhost for testing
  }

  /**
   * Detect the base path for the application
   */
  detectBasePath() {
    const path = window.location.pathname;
    const hostname = window.location.hostname;
    
    // If we're on GitHub Pages or simulating it
    if (hostname.includes('github.io') || 
        (hostname.includes('localhost') && path.includes('/project_list_kamba/'))) {
      const pathParts = path.split('/').filter(part => part);
      if (pathParts.length > 0) {
        // For GitHub Pages: /project_list_kamba/
        // For localhost test: /project_list_kamba/
        const repoName = pathParts.find(part => part === 'project_list_kamba');
        if (repoName) {
          return `/${repoName}/`;
        }
        // Fallback: use first path segment
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
    const currentURL = window.location.href;

    // Prevent infinite redirect loops
    if (this._redirecting) {
      return true;
    }

    // If we're at the GitHub Pages root but should be at the project path
    if (this.isGitHubPages && currentPath === '/' && expectedBasePath !== '/') {
      console.log('🔄 Redirecting to correct GitHub Pages URL...');
      this._redirecting = true;
      window.location.replace(this.getBaseURL());
      return false;
    }

    // If we're missing the base path in the URL (but not if we're already at the root after redirect)
    if (this.isGitHubPages && expectedBasePath !== '/' && !currentPath.startsWith(expectedBasePath) && currentPath !== '/') {
      console.log('🔄 Fixing URL path...');
      this._redirecting = true;
      const newPath = expectedBasePath + currentPath.substring(1);
      window.location.replace(window.location.protocol + '//' + window.location.host + newPath + window.location.search + window.location.hash);
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
    
    // Set up canonical URL
    this.setupCanonicalURL();
    
    // Add periodic URL validation
    this.setupPeriodicValidation();
  }

  /**
   * Set up canonical URL meta tag
   */
  setupCanonicalURL() {
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    
    canonicalLink.href = this.getBaseURL();
  }

  /**
   * Set up periodic URL validation to catch redirects
   */
  setupPeriodicValidation() {
    // Disabled for now to prevent redirect loops
    // TODO: Re-enable with better logic to detect actual external redirects
    // Check URL every 5 seconds to catch any unexpected redirects
    // setInterval(() => {
    //   this.validateAndRedirect();
    // }, 5000);
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