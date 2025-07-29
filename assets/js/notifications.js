/**
 * List Kamba - Notifications System
 * Handles browser notifications, reminders, and alerts
 */

class NotificationManager {
  constructor() {
    this.permission = 'default';
    this.notificationQueue = [];
    this.activeNotifications = new Map();
    this.settings = {
      enabled: true,
      sound: true,
      taskReminders: true,
      pomodoroAlerts: true,
      dailySummary: true,
      reminderTime: 30, // minutes before due date
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      }
    };

    this.init();
  }

  async init() {
    // Load notification settings
    await this.loadSettings();
    
    // Request permission if not already granted
    await this.requestPermission();
    
    // Start notification services
    this.startReminderService();
    this.startDailySummaryService();
    
    // Bind events
    this.bindEvents();
    
    console.log('Notification system initialized');
  }

  async loadSettings() {
    try {
      const savedSettings = await Storage.getSetting('notifications', {});
      this.settings = { ...this.settings, ...savedSettings };
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  }

  async saveSettings() {
    try {
      await Storage.setSetting('notifications', this.settings);
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  }

  bindEvents() {
    // Listen for settings changes
    document.addEventListener('settingsChanged', (event) => {
      if (event.detail.key === 'notifications') {
        this.settings = { ...this.settings, ...event.detail.value };
      }
    });

    // Listen for page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.onPageHidden();
      } else {
        this.onPageVisible();
      }
    });

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.processNotificationQueue();
    });
  }

  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return false;
    }

    try {
      this.permission = await Notification.requestPermission();
      
      if (this.permission === 'granted') {
        this.showToast('Notificações ativadas com sucesso! 🔔', 'success');
        await Storage.trackEvent('notifications_enabled');
      } else if (this.permission === 'denied') {
        this.showToast('Notificações foram negadas. Você pode ativar nas configurações do navegador.', 'warning');
      }

      return this.permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  canSendNotification() {
    if (!this.settings.enabled) return false;
    if (this.permission !== 'granted') return false;
    if (this.isQuietTime()) return false;
    return true;
  }

  isQuietTime() {
    if (!this.settings.quietHours.enabled) return false;

    const now = Utils.Date.now();
    const currentTime = Utils.Date.formatTime(now);
    const startTime = this.settings.quietHours.start;
    const endTime = this.settings.quietHours.end;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  async sendNotification(options) {
    if (!this.canSendNotification()) {
      this.queueNotification(options);
      return null;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/icon-72x72.png',
        tag: options.tag || 'list-kamba',
        requireInteraction: options.requireInteraction || false,
        silent: !this.settings.sound,
        data: options.data || {}
      });

      // Store reference
      if (options.tag) {
        this.activeNotifications.set(options.tag, notification);
      }

      // Handle click events
      notification.onclick = () => {
        window.focus();
        
        if (options.onClick) {
          options.onClick();
        }
        
        // Navigate to relevant page
        if (options.data?.page) {
          this.navigateToPage(options.data.page);
        }
        
        notification.close();
      };

      // Auto close after timeout
      if (options.timeout) {
        setTimeout(() => {
          notification.close();
        }, options.timeout);
      }

      // Track analytics
      await Storage.trackEvent('notification_sent', {
        type: options.type || 'generic',
        title: options.title
      });

      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
      this.showToast(options.title, 'info');
      return null;
    }
  }

  queueNotification(options) {
    this.notificationQueue.push({
      ...options,
      queuedAt: Date.now()
    });

    // Persist queue
    Utils.Storage.set('notificationQueue', this.notificationQueue);
  }

  async processNotificationQueue() {
    if (this.notificationQueue.length === 0) return;

    const queue = [...this.notificationQueue];
    this.notificationQueue = [];

    for (const notification of queue) {
      // Skip very old queued notifications (older than 1 hour)
      if (Date.now() - notification.queuedAt > 60 * 60 * 1000) {
        continue;
      }

      await this.sendNotification(notification);
      
      // Small delay between notifications
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Clear persisted queue
    Utils.Storage.remove('notificationQueue');
  }

  // Task-related notifications
  async notifyTaskDue(task) {
    const category = Utils.Angola.getCategory(task.category);
    
    await this.sendNotification({
      title: '⏰ Tarefa Vencendo',
      body: `"${task.title}" vence em breve`,
      icon: '/assets/icons/task-reminder.png',
      tag: `task-due-${task.id}`,
      type: 'task_due',
      requireInteraction: true,
      data: {
        taskId: task.id,
        page: 'tasks'
      },
      onClick: () => {
        // Navigate to tasks and highlight the task
        this.navigateToPage('tasks');
        this.highlightTask(task.id);
      }
    });
  }

  async notifyTaskCompleted(task) {
    await this.sendNotification({
      title: '🎉 Tarefa Concluída!',
      body: `Parabéns! Você completou "${task.title}"`,
      icon: '/assets/icons/task-completed.png',
      tag: `task-completed-${task.id}`,
      type: 'task_completed',
      timeout: 5000,
      data: {
        taskId: task.id,
        page: 'analytics'
      }
    });
  }

  async notifyTaskOverdue(task) {
    await this.sendNotification({
      title: '🔴 Tarefa Atrasada',
      body: `"${task.title}" está atrasada`,
      icon: '/assets/icons/task-overdue.png',
      tag: `task-overdue-${task.id}`,
      type: 'task_overdue',
      requireInteraction: true,
      data: {
        taskId: task.id,
        page: 'tasks'
      }
    });
  }

  // Pomodoro notifications
  async notifyPomodoroStart() {
    await this.sendNotification({
      title: '🍅 Pomodoro Iniciado',
      body: 'Sessão de 25 minutos começou. Foque na sua tarefa!',
      icon: '/assets/icons/pomodoro-start.png',
      tag: 'pomodoro-start',
      type: 'pomodoro_start',
      timeout: 3000
    });
  }

  async notifyPomodoroComplete() {
    await this.sendNotification({
      title: '🎯 Pomodoro Concluído!',
      body: 'Parabéns! Faça uma pausa de 5 minutos.',
      icon: '/assets/icons/pomodoro-complete.png',
      tag: 'pomodoro-complete',
      type: 'pomodoro_complete',
      requireInteraction: true,
      data: {
        page: 'timer'
      }
    });

    // Play completion sound
    this.playSound('pomodoro-complete');
  }

  async notifyBreakComplete() {
    await this.sendNotification({
      title: '⏰ Pausa Terminada',
      body: 'Hora de voltar ao trabalho! Pronto para outro Pomodoro?',
      icon: '/assets/icons/break-complete.png',
      tag: 'break-complete',
      type: 'break_complete',
      data: {
        page: 'timer'
      }
    });
  }

  // Daily summary
  async sendDailySummary() {
    if (!this.settings.dailySummary) return;

    try {
      const tasks = await Storage.getTasks();
      const today = Utils.Date.now();
      
      const todayTasks = tasks.filter(task => 
        task.dueDate && Utils.Date.isToday(new Date(task.dueDate))
      );
      
      const completedToday = todayTasks.filter(task => 
        task.status === 'completed'
      );
      
      const pendingToday = todayTasks.filter(task => 
        task.status === 'pending'
      );

      let body = '';
      if (completedToday.length > 0) {
        body += `✅ ${completedToday.length} tarefa(s) concluída(s) hoje. `;
      }
      
      if (pendingToday.length > 0) {
        body += `📋 ${pendingToday.length} tarefa(s) pendente(s).`;
      } else if (completedToday.length > 0) {
        body += 'Parabéns! Você completou todas as tarefas de hoje! 🎉';
      } else {
        body = 'Você não tem tarefas para hoje. Aproveite o dia! 😊';
      }

      await this.sendNotification({
        title: '📊 Resumo do Dia',
        body: body.trim(),
        icon: '/assets/icons/daily-summary.png',
        tag: 'daily-summary',
        type: 'daily_summary',
        data: {
          page: 'dashboard'
        }
      });
    } catch (error) {
      console.error('Error sending daily summary:', error);
    }
  }

  // Reminder service
  startReminderService() {
    // Check for task reminders every minute
    setInterval(async () => {
      if (!this.settings.taskReminders) return;
      
      await this.checkTaskReminders();
    }, 60000); // 1 minute
  }

  async checkTaskReminders() {
    try {
      const tasks = await Storage.getTasks({ status: 'pending' });
      const now = Utils.Date.now();
      const reminderTime = this.settings.reminderTime * 60 * 1000; // Convert to milliseconds

      for (const task of tasks) {
        if (!task.dueDate) continue;

        const dueDate = new Date(task.dueDate);
        const timeToDue = dueDate.getTime() - now.getTime();

        // Send reminder if task is due within reminder time
        if (timeToDue > 0 && timeToDue <= reminderTime) {
          // Check if we already sent a reminder for this task
          const reminderKey = `reminder_sent_${task.id}`;
          const reminderSent = Utils.Storage.get(reminderKey);
          
          if (!reminderSent) {
            await this.notifyTaskDue(task);
            Utils.Storage.set(reminderKey, true);
            
            // Clear reminder flag after due date passes
            setTimeout(() => {
              Utils.Storage.remove(reminderKey);
            }, timeToDue + 60000);
          }
        }
        
        // Send overdue notification
        if (timeToDue < 0) {
          const overdueKey = `overdue_sent_${task.id}`;
          const overdueSent = Utils.Storage.get(overdueKey);
          
          if (!overdueSent) {
            await this.notifyTaskOverdue(task);
            Utils.Storage.set(overdueKey, true);
          }
        }
      }
    } catch (error) {
      console.error('Error checking task reminders:', error);
    }
  }

  // Daily summary service
  startDailySummaryService() {
    // Send daily summary at 8 PM
    const checkDailySummary = () => {
      const now = Utils.Date.now();
      const currentTime = Utils.Date.formatTime(now);
      
      // Check if it's 20:00 (8 PM)
      if (currentTime === '20:00') {
        const todayKey = `daily_summary_${Utils.Date.formatDate(now)}`;
        const summarySent = Utils.Storage.get(todayKey);
        
        if (!summarySent) {
          this.sendDailySummary();
          Utils.Storage.set(todayKey, true);
        }
      }
    };

    // Check every minute
    setInterval(checkDailySummary, 60000);
  }

  // Sound management
  playSound(type) {
    if (!this.settings.sound) return;

    try {
      const audio = new Audio(`/assets/sounds/${type}.mp3`);
      audio.volume = 0.7;
      audio.play().catch(error => {
        console.warn('Could not play notification sound:', error);
      });
    } catch (error) {
      console.warn('Sound file not found:', type);
    }
  }

  // In-app notifications (toasts)
  showToast(message, type = 'info', duration = 5000) {
    const container = Utils.DOM.$('#toastContainer');
    if (!container) return;

    const toast = Utils.DOM.createElement('div', {
      className: `toast toast-${type}`
    });

    const icons = {
      success: '✅',
      danger: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-content">
        <div class="toast-message">${Utils.String.sanitizeHtml(message)}</div>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);

    return toast;
  }

  // Navigation helpers
  navigateToPage(page) {
    // Trigger page navigation (this would be handled by the main app)
    window.dispatchEvent(new CustomEvent('navigateTo', { 
      detail: { page } 
    }));
  }

  highlightTask(taskId) {
    setTimeout(() => {
      const taskElement = Utils.DOM.$(`[data-task-id="${taskId}"]`);
      if (taskElement) {
        taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        taskElement.classList.add('highlighted');
        setTimeout(() => {
          taskElement.classList.remove('highlighted');
        }, 3000);
      }
    }, 500);
  }

  onPageHidden() {
    // User switched away from the app
    // We might want to be more aggressive with notifications
  }

  onPageVisible() {
    // User returned to the app
    // Clear some notifications that might be redundant
    this.activeNotifications.forEach((notification, tag) => {
      if (tag.startsWith('task-due-') || tag.startsWith('task-overdue-')) {
        notification.close();
        this.activeNotifications.delete(tag);
      }
    });
  }

  // Settings management
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();

    // Dispatch settings change event
    document.dispatchEvent(new CustomEvent('settingsChanged', {
      detail: {
        key: 'notifications',
        value: this.settings
      }
    }));
  }

  async testNotification() {
    await this.sendNotification({
      title: '🔔 Teste de Notificação',
      body: 'Se você viu esta mensagem, as notificações estão funcionando corretamente!',
      icon: '/assets/icons/icon-192x192.png',
      tag: 'test-notification',
      type: 'test',
      timeout: 5000
    });
  }

  // Analytics
  async getNotificationStats() {
    try {
      const events = await Storage.getAnalytics({ type: 'notification_sent' });
      
      const stats = {
        total: events.length,
        byType: {},
        byDay: {}
      };

      events.forEach(event => {
        const type = event.data?.type || 'unknown';
        stats.byType[type] = (stats.byType[type] || 0) + 1;

        const day = Utils.Date.formatDate(new Date(event.date));
        stats.byDay[day] = (stats.byDay[day] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error getting notification stats:', error);
      return { total: 0, byType: {}, byDay: {} };
    }
  }

  // Cleanup
  clearAllNotifications() {
    this.activeNotifications.forEach(notification => {
      notification.close();
    });
    this.activeNotifications.clear();
  }

  cleanup() {
    this.clearAllNotifications();
    this.notificationQueue = [];
    Utils.Storage.remove('notificationQueue');
  }
}

// Initialize notification manager
window.Notifications = new NotificationManager();

// Global notification functions
window.showToast = (message, type, duration) => 
  Notifications.showToast(message, type, duration);

// Export for other modules
window.NotificationManager = NotificationManager;