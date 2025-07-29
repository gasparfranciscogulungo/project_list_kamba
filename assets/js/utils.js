/**
 * List Kamba - Utility Functions
 * Utility functions and helpers for the application
 */

// Date and time utilities for Angola (UTC+1)
const DateUtils = {
  // Get current date in Angola timezone
  now() {
    const now = new Date();
    // Adjust for Angola timezone (UTC+1)
    return new Date(now.getTime() + (60 * 60 * 1000));
  },

  // Format date in DD/MM/YYYY format (Angola standard)
  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  },

  // Format time in 24h format
  formatTime(date) {
    if (!date) return '';
    const d = new Date(date);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  },

  // Format date and time together
  formatDateTime(date) {
    if (!date) return '';
    return `${this.formatDate(date)} às ${this.formatTime(date)}`;
  },

  // Check if date is today
  isToday(date) {
    if (!date) return false;
    const today = this.now();
    const checkDate = new Date(date);
    return today.toDateString() === checkDate.toDateString();
  },

  // Check if date is tomorrow
  isTomorrow(date) {
    if (!date) return false;
    const tomorrow = new Date(this.now());
    tomorrow.setDate(tomorrow.getDate() + 1);
    const checkDate = new Date(date);
    return tomorrow.toDateString() === checkDate.toDateString();
  },

  // Check if date is this week
  isThisWeek(date) {
    if (!date) return false;
    const now = this.now();
    const checkDate = new Date(date);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return checkDate >= weekStart && checkDate <= weekEnd;
  },

  // Get relative time string (e.g., "há 2 horas", "em 3 dias")
  getRelativeTime(date) {
    if (!date) return '';
    const now = this.now();
    const checkDate = new Date(date);
    const diffMs = checkDate.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (this.isToday(date)) {
      if (Math.abs(diffHours) < 1) {
        if (diffMinutes > 0) return `em ${diffMinutes} minutos`;
        if (diffMinutes < 0) return `há ${Math.abs(diffMinutes)} minutos`;
        return 'agora';
      }
      if (diffHours > 0) return `em ${diffHours} horas`;
      return `há ${Math.abs(diffHours)} horas`;
    }

    if (this.isTomorrow(date)) return 'amanhã';
    
    if (diffDays === -1) return 'ontem';
    
    if (diffDays > 0 && diffDays <= 7) return `em ${diffDays} dias`;
    if (diffDays < 0 && diffDays >= -7) return `há ${Math.abs(diffDays)} dias`;
    
    return this.formatDate(date);
  },

  // Parse date string in DD/MM/YYYY format
  parseDate(dateString) {
    if (!dateString) return null;
    const parts = dateString.split('/');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
};

// String utilities
const StringUtils = {
  // Capitalize first letter
  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  // Generate unique ID
  generateId() {
    return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  },

  // Sanitize HTML to prevent XSS
  sanitizeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  // Truncate text with ellipsis
  truncate(str, length = 100) {
    if (!str || str.length <= length) return str;
    return str.substr(0, length) + '...';
  },

  // Remove accents for search
  removeAccents(str) {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  },

  // Search text match
  searchMatch(text, search) {
    if (!text || !search) return false;
    const normalizedText = this.removeAccents(text.toLowerCase());
    const normalizedSearch = this.removeAccents(search.toLowerCase());
    return normalizedText.includes(normalizedSearch);
  }
};

// DOM utilities
const DOMUtils = {
  // Query selector with error handling
  $(selector, context = document) {
    try {
      return context.querySelector(selector);
    } catch (e) {
      console.error('Invalid selector:', selector, e);
      return null;
    }
  },

  // Query selector all with error handling
  $$(selector, context = document) {
    try {
      return Array.from(context.querySelectorAll(selector));
    } catch (e) {
      console.error('Invalid selector:', selector, e);
      return [];
    }
  },

  // Add event listener with cleanup tracking
  on(element, event, handler, options = {}) {
    if (!element || !event || !handler) return null;
    
    element.addEventListener(event, handler, options);
    
    // Return cleanup function
    return () => element.removeEventListener(event, handler, options);
  },

  // Create element with attributes and children
  createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);
    
    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'innerHTML') {
        element.innerHTML = value;
      } else if (key === 'textContent') {
        element.textContent = value;
      } else {
        element.setAttribute(key, value);
      }
    });
    
    // Append children
    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        element.appendChild(child);
      }
    });
    
    return element;
  },

  // Show element with animation
  show(element, animation = 'fadeIn') {
    if (!element) return;
    element.style.display = '';
    element.classList.add(animation);
    element.classList.remove('hidden');
  },

  // Hide element with animation
  hide(element, animation = 'fadeOut') {
    if (!element) return;
    element.classList.add('hidden');
    setTimeout(() => {
      element.style.display = 'none';
      element.classList.remove(animation);
    }, 300);
  },

  // Toggle element visibility
  toggle(element) {
    if (!element) return;
    if (element.style.display === 'none' || element.classList.contains('hidden')) {
      this.show(element);
    } else {
      this.hide(element);
    }
  }
};

// Local storage utilities
const StorageUtils = {
  // Get item from localStorage with JSON parsing
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error('Error reading from localStorage:', e);
      return defaultValue;
    }
  },

  // Set item in localStorage with JSON stringifying
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Error writing to localStorage:', e);
      return false;
    }
  },

  // Remove item from localStorage
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error('Error removing from localStorage:', e);
      return false;
    }
  },

  // Clear all localStorage
  clear() {
    try {
      localStorage.clear();
      return true;
    } catch (e) {
      console.error('Error clearing localStorage:', e);
      return false;
    }
  },

  // Get storage size in bytes
  getSize() {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return total;
  }
};

// Validation utilities
const ValidationUtils = {
  // Validate email
  isEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },

  // Validate required field
  isRequired(value) {
    return value !== null && value !== undefined && value.toString().trim() !== '';
  },

  // Validate minimum length
  minLength(value, min) {
    return value && value.toString().length >= min;
  },

  // Validate maximum length
  maxLength(value, max) {
    return !value || value.toString().length <= max;
  },

  // Validate date
  isValidDate(date) {
    return date instanceof Date && !isNaN(date);
  },

  // Validate future date
  isFutureDate(date) {
    if (!this.isValidDate(date)) return false;
    return date > DateUtils.now();
  }
};

// Performance utilities
const PerformanceUtils = {
  // Debounce function
  debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func(...args);
    };
  },

  // Throttle function
  throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function(...args) {
      if (!lastRan) {
        func(...args);
        lastRan = Date.now();
      } else {
        clearTimeout(lastFunc);
        lastFunc = setTimeout(() => {
          if ((Date.now() - lastRan) >= limit) {
            func(...args);
            lastRan = Date.now();
          }
        }, limit - (Date.now() - lastRan));
      }
    };
  },

  // Measure execution time
  measure(name, func) {
    const start = performance.now();
    const result = func();
    const end = performance.now();
    console.log(`${name} took ${end - start} milliseconds`);
    return result;
  }
};

// Angola-specific utilities
const AngolaUtils = {
  // Angola holidays 2024-2025
  holidays: {
    '2024': [
      { date: '2024-01-01', name: 'Ano Novo' },
      { date: '2024-02-04', name: 'Dia do Início da Luta Armada' },
      { date: '2024-03-08', name: 'Dia Internacional da Mulher' },
      { date: '2024-03-29', name: 'Sexta-feira Santa' },
      { date: '2024-04-04', name: 'Dia da Paz' },
      { date: '2024-05-01', name: 'Dia do Trabalhador' },
      { date: '2024-09-17', name: 'Dia dos Heróis Nacionais' },
      { date: '2024-11-02', name: 'Dia dos Finados' },
      { date: '2024-11-11', name: 'Dia da Independência' },
      { date: '2024-12-25', name: 'Natal' }
    ],
    '2025': [
      { date: '2025-01-01', name: 'Ano Novo' },
      { date: '2025-02-04', name: 'Dia do Início da Luta Armada' },
      { date: '2025-03-08', name: 'Dia Internacional da Mulher' },
      { date: '2025-04-18', name: 'Sexta-feira Santa' },
      { date: '2025-04-04', name: 'Dia da Paz' },
      { date: '2025-05-01', name: 'Dia do Trabalhador' },
      { date: '2025-09-17', name: 'Dia dos Heróis Nacionais' },
      { date: '2025-11-02', name: 'Dia dos Finados' },
      { date: '2025-11-11', name: 'Dia da Independência' },
      { date: '2025-12-25', name: 'Natal' }
    ]
  },

  // Check if date is Angola holiday
  isHoliday(date) {
    const year = new Date(date).getFullYear().toString();
    const dateStr = DateUtils.formatDate(date).split('/').reverse().join('-');
    const yearHolidays = this.holidays[year] || [];
    return yearHolidays.find(holiday => holiday.date === dateStr);
  },

  // Get holiday name for date
  getHolidayName(date) {
    const holiday = this.isHoliday(date);
    return holiday ? holiday.name : null;
  },

  // Format currency in Kwanza
  formatCurrency(amount) {
    if (typeof amount !== 'number') return 'AOA 0,00';
    return `AOA ${amount.toLocaleString('pt-AO', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  },

  // Common Angolan task categories
  taskCategories: [
    { id: 'pessoal', name: 'Pessoal', icon: '👤', color: '#4A90E2' },
    { id: 'trabalho', name: 'Trabalho', icon: '💼', color: '#2F5F8F' },
    { id: 'familia', name: 'Família', icon: '👨‍👩‍👧‍👦', color: '#27AE60' },
    { id: 'saude', name: 'Saúde', icon: '🏥', color: '#E74C3C' },
    { id: 'financas', name: 'Finanças', icon: '💰', color: '#F39C12' },
    { id: 'educacao', name: 'Educação', icon: '📚', color: '#9B59B6' },
    { id: 'lazer', name: 'Lazer', icon: '🎯', color: '#1ABC9C' },
    { id: 'outros', name: 'Outros', icon: '📝', color: '#95A5A6' }
  ],

  // Get category by id
  getCategory(id) {
    return this.taskCategories.find(cat => cat.id === id) || this.taskCategories[7];
  }
};

// Error handling utilities
const ErrorUtils = {
  // Log error with context
  log(error, context = '') {
    console.error(`[List Kamba Error] ${context}:`, error);
    
    // In production, you might want to send errors to a service
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      // Send to error tracking service
    }
  },

  // Handle promise rejections
  handlePromiseRejection(promise, context = '') {
    promise.catch(error => this.log(error, context));
    return promise;
  },

  // Safe function execution
  safe(func, defaultValue = null, context = '') {
    try {
      return func();
    } catch (error) {
      this.log(error, context);
      return defaultValue;
    }
  }
};

// Export utilities for use in other modules
window.Utils = {
  Date: DateUtils,
  String: StringUtils,
  DOM: DOMUtils,
  Storage: StorageUtils,
  Validation: ValidationUtils,
  Performance: PerformanceUtils,
  Angola: AngolaUtils,
  Error: ErrorUtils
};

// Legacy support
window.DateUtils = DateUtils;
window.StringUtils = StringUtils;
window.DOMUtils = DOMUtils;