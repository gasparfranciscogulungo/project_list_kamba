/**
 * List Kamba - Storage Management
 * Handles data persistence using IndexedDB and localStorage
 */

class StorageManager {
  constructor() {
    this.dbName = 'ListKambaDB';
    this.dbVersion = 1;
    this.db = null;
    this.stores = {
      tasks: 'tasks',
      settings: 'settings',
      analytics: 'analytics'
    };
    
    this.isOnline = navigator.onLine;
    this.syncQueue = [];
    
    // Initialize storage
    this.init();
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processSyncQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  async init() {
    try {
      await this.initIndexedDB();
      await this.migrateData();
      console.log('Storage initialized successfully');
    } catch (error) {
      console.error('Storage initialization failed:', error);
      // Fallback to localStorage only
      this.db = null;
    }
  }

  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create tasks store
        if (!db.objectStoreNames.contains(this.stores.tasks)) {
          const tasksStore = db.createObjectStore(this.stores.tasks, { keyPath: 'id' });
          tasksStore.createIndex('category', 'category', { unique: false });
          tasksStore.createIndex('priority', 'priority', { unique: false });
          tasksStore.createIndex('status', 'status', { unique: false });
          tasksStore.createIndex('dueDate', 'dueDate', { unique: false });
          tasksStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
        
        // Create settings store
        if (!db.objectStoreNames.contains(this.stores.settings)) {
          db.createObjectStore(this.stores.settings, { keyPath: 'key' });
        }
        
        // Create analytics store
        if (!db.objectStoreNames.contains(this.stores.analytics)) {
          const analyticsStore = db.createObjectStore(this.stores.analytics, { keyPath: 'id' });
          analyticsStore.createIndex('date', 'date', { unique: false });
          analyticsStore.createIndex('type', 'type', { unique: false });
        }
      };
    });
  }

  async migrateData() {
    // Migrate old localStorage data to IndexedDB if needed
    const oldTasks = Utils.Storage.get('tasks');
    if (oldTasks && Array.isArray(oldTasks)) {
      for (const task of oldTasks) {
        await this.saveTask(task);
      }
      Utils.Storage.remove('tasks');
      console.log('Migrated tasks from localStorage to IndexedDB');
    }
  }

  // Generic IndexedDB operations
  async getFromStore(storeName, key = null) {
    if (!this.db) {
      // Fallback to localStorage
      return Utils.Storage.get(storeName + (key ? '_' + key : ''));
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      const request = key ? store.get(key) : store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveToStore(storeName, data) {
    if (!this.db) {
      // Fallback to localStorage
      const key = storeName + (data.id ? '_' + data.id : '');
      return Utils.Storage.set(key, data);
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const request = store.put(data);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteFromStore(storeName, key) {
    if (!this.db) {
      // Fallback to localStorage
      return Utils.Storage.remove(storeName + '_' + key);
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const request = store.delete(key);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async queryStore(storeName, indexName, value) {
    if (!this.db) {
      // Fallback: get all and filter
      const allData = Utils.Storage.get(storeName) || [];
      return allData.filter(item => item[indexName] === value);
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      
      const request = index.getAll(value);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Task management
  async getTasks(filters = {}) {
    try {
      let tasks = await this.getFromStore(this.stores.tasks);
      
      if (!Array.isArray(tasks)) {
        tasks = tasks ? [tasks] : [];
      }

      // Apply filters
      if (filters.status) {
        tasks = tasks.filter(task => task.status === filters.status);
      }
      
      if (filters.category) {
        tasks = tasks.filter(task => task.category === filters.category);
      }
      
      if (filters.priority) {
        tasks = tasks.filter(task => task.priority === filters.priority);
      }
      
      if (filters.today) {
        const today = Utils.Date.now().toDateString();
        tasks = tasks.filter(task => {
          if (!task.dueDate) return false;
          return new Date(task.dueDate).toDateString() === today;
        });
      }
      
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        tasks = tasks.filter(task => 
          Utils.String.searchMatch(task.title, searchTerm) ||
          Utils.String.searchMatch(task.description, searchTerm)
        );
      }

      // Sort by priority and due date
      tasks.sort((a, b) => {
        const priorityOrder = { alta: 3, media: 2, baixa: 1 };
        const aPriority = priorityOrder[a.priority] || 1;
        const bPriority = priorityOrder[b.priority] || 1;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate) - new Date(b.dueDate);
        }
        
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      return tasks;
    } catch (error) {
      console.error('Error getting tasks:', error);
      return [];
    }
  }

  async getTask(id) {
    try {
      if (this.db) {
        return await this.getFromStore(this.stores.tasks, id);
      } else {
        const tasks = await this.getTasks();
        return tasks.find(task => task.id === id);
      }
    } catch (error) {
      console.error('Error getting task:', error);
      return null;
    }
  }

  async saveTask(task) {
    try {
      // Validate task data
      if (!task.title || !task.title.trim()) {
        throw new Error('Task title is required');
      }

      // Set defaults
      if (!task.id) {
        task.id = Utils.String.generateId();
      }
      
      if (!task.createdAt) {
        task.createdAt = Utils.Date.now().toISOString();
      }
      
      task.updatedAt = Utils.Date.now().toISOString();
      
      // Sanitize data
      task.title = Utils.String.sanitizeHtml(task.title);
      task.description = Utils.String.sanitizeHtml(task.description || '');
      
      // Validate priority
      if (!['alta', 'media', 'baixa'].includes(task.priority)) {
        task.priority = 'media';
      }
      
      // Validate category
      const validCategories = Utils.Angola.taskCategories.map(cat => cat.id);
      if (!validCategories.includes(task.category)) {
        task.category = 'outros';
      }
      
      // Validate status
      if (!['pending', 'completed', 'archived'].includes(task.status)) {
        task.status = 'pending';
      }

      await this.saveToStore(this.stores.tasks, task);
      
      // Track analytics
      await this.trackEvent('task_saved', {
        taskId: task.id,
        category: task.category,
        priority: task.priority
      });

      return task;
    } catch (error) {
      console.error('Error saving task:', error);
      throw error;
    }
  }

  async deleteTask(id) {
    try {
      await this.deleteFromStore(this.stores.tasks, id);
      
      // Track analytics
      await this.trackEvent('task_deleted', { taskId: id });
      
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      return false;
    }
  }

  async completeTask(id) {
    try {
      const task = await this.getTask(id);
      if (!task) return false;
      
      task.status = 'completed';
      task.completedAt = Utils.Date.now().toISOString();
      
      await this.saveTask(task);
      
      // Track analytics
      await this.trackEvent('task_completed', {
        taskId: id,
        category: task.category,
        priority: task.priority,
        daysToComplete: task.dueDate ? 
          Math.ceil((new Date(task.completedAt) - new Date(task.createdAt)) / (1000 * 60 * 60 * 24)) : 
          null
      });
      
      return true;
    } catch (error) {
      console.error('Error completing task:', error);
      return false;
    }
  }

  // Settings management
  async getSetting(key, defaultValue = null) {
    try {
      const setting = await this.getFromStore(this.stores.settings, key);
      return setting ? setting.value : defaultValue;
    } catch (error) {
      console.error('Error getting setting:', error);
      return defaultValue;
    }
  }

  async setSetting(key, value) {
    try {
      await this.saveToStore(this.stores.settings, { key, value });
      return true;
    } catch (error) {
      console.error('Error setting setting:', error);
      return false;
    }
  }

  // Analytics tracking
  async trackEvent(type, data = {}) {
    try {
      const event = {
        id: Utils.String.generateId(),
        type,
        data,
        date: Utils.Date.now().toISOString(),
        timestamp: Date.now()
      };
      
      await this.saveToStore(this.stores.analytics, event);
      
      return true;
    } catch (error) {
      console.error('Error tracking event:', error);
      return false;
    }
  }

  async getAnalytics(filters = {}) {
    try {
      let events = await this.getFromStore(this.stores.analytics);
      
      if (!Array.isArray(events)) {
        events = events ? [events] : [];
      }

      // Apply filters
      if (filters.type) {
        events = events.filter(event => event.type === filters.type);
      }
      
      if (filters.startDate) {
        events = events.filter(event => 
          new Date(event.date) >= new Date(filters.startDate)
        );
      }
      
      if (filters.endDate) {
        events = events.filter(event => 
          new Date(event.date) <= new Date(filters.endDate)
        );
      }

      return events;
    } catch (error) {
      console.error('Error getting analytics:', error);
      return [];
    }
  }

  // Data export/import
  async exportData() {
    try {
      const data = {
        tasks: await this.getTasks(),
        settings: await this.getAllSettings(),
        analytics: await this.getAnalytics(),
        exportDate: Utils.Date.now().toISOString(),
        version: this.dbVersion
      };
      
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  async importData(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      
      // Validate data structure
      if (!data.tasks || !Array.isArray(data.tasks)) {
        throw new Error('Invalid data format: tasks not found');
      }
      
      // Import tasks
      for (const task of data.tasks) {
        await this.saveTask(task);
      }
      
      // Import settings
      if (data.settings) {
        for (const [key, value] of Object.entries(data.settings)) {
          await this.setSetting(key, value);
        }
      }
      
      // Track import
      await this.trackEvent('data_imported', {
        tasksCount: data.tasks.length,
        importDate: data.exportDate
      });
      
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      throw error;
    }
  }

  async getAllSettings() {
    try {
      const settings = await this.getFromStore(this.stores.settings);
      const result = {};
      
      if (Array.isArray(settings)) {
        settings.forEach(setting => {
          result[setting.key] = setting.value;
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error getting all settings:', error);
      return {};
    }
  }

  // Cleanup and maintenance
  async cleanupOldData() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Clean old analytics (keep last 30 days)
      const oldEvents = await this.getAnalytics({
        endDate: thirtyDaysAgo.toISOString()
      });
      
      for (const event of oldEvents) {
        await this.deleteFromStore(this.stores.analytics, event.id);
      }
      
      console.log(`Cleaned up ${oldEvents.length} old analytics events`);
      
      return true;
    } catch (error) {
      console.error('Error cleaning up old data:', error);
      return false;
    }
  }

  // Sync queue for offline functionality
  addToSyncQueue(operation) {
    this.syncQueue.push({
      id: Utils.String.generateId(),
      operation,
      timestamp: Date.now()
    });
    
    // Persist sync queue
    Utils.Storage.set('syncQueue', this.syncQueue);
  }

  async processSyncQueue() {
    if (!this.isOnline || this.syncQueue.length === 0) return;
    
    const queue = [...this.syncQueue];
    this.syncQueue = [];
    
    for (const item of queue) {
      try {
        await item.operation();
        console.log('Synced operation:', item.id);
      } catch (error) {
        console.error('Failed to sync operation:', item.id, error);
        // Re-add to queue for retry
        this.syncQueue.push(item);
      }
    }
    
    // Update persisted queue
    Utils.Storage.set('syncQueue', this.syncQueue);
  }

  // Storage stats
  getStorageStats() {
    return {
      localStorageSize: Utils.Storage.getSize(),
      isIndexedDBAvailable: !!this.db,
      isOnline: this.isOnline,
      syncQueueLength: this.syncQueue.length
    };
  }
}

// Initialize storage manager
window.Storage = new StorageManager();

// Export for modules
window.StorageManager = StorageManager;