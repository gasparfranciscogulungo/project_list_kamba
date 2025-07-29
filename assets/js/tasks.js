/**
 * List Kamba - Tasks Management
 * Handles task CRUD operations and UI interactions
 */

class TaskManager {
  constructor() {
    this.currentTasks = [];
    this.currentFilter = 'all';
    this.currentSort = 'priority';
    
    this.bindEvents();
    this.loadTasks();
  }

  bindEvents() {
    // Task form submission
    const taskForm = Utils.DOM.$('#taskForm');
    if (taskForm) {
      taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleTaskSubmit();
      });
    }

    // Task filter change
    const taskFilter = Utils.DOM.$('#taskFilter');
    if (taskFilter) {
      taskFilter.addEventListener('change', (e) => {
        this.currentFilter = e.target.value;
        this.renderTasks();
      });
    }

    // Quick create task button
    const quickCreateBtn = Utils.DOM.$('#quickCreateTask');
    if (quickCreateBtn) {
      quickCreateBtn.addEventListener('click', () => {
        this.showTaskModal();
      });
    }

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + N = New task
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        this.showTaskModal();
      }
      
      // Escape = Close modal
      if (e.key === 'Escape') {
        this.closeTaskModal();
      }
    });
  }

  async loadTasks() {
    try {
      this.currentTasks = await Storage.getTasks();
      this.renderTasks();
      this.updateDashboardStats();
    } catch (error) {
      console.error('Error loading tasks:', error);
      this.showToast('Erro ao carregar tarefas', 'danger');
    }
  }

  async handleTaskSubmit() {
    try {
      const formData = this.getTaskFormData();
      
      // Validate form
      const validation = this.validateTaskForm(formData);
      if (!validation.isValid) {
        this.showFormErrors(validation.errors);
        return;
      }

      // Check if editing existing task
      const taskId = Utils.DOM.$('#taskModal').dataset.editingTask;
      if (taskId) {
        formData.id = taskId;
      }

      // Save task
      const savedTask = await Storage.saveTask(formData);
      
      // Update UI
      await this.loadTasks();
      this.closeTaskModal();
      
      // Show success message
      const message = taskId ? 'Tarefa atualizada com sucesso!' : 'Tarefa criada com sucesso!';
      this.showToast(message, 'success');
      
      // Track analytics
      await Storage.trackEvent(taskId ? 'task_updated' : 'task_created', {
        taskId: savedTask.id,
        category: savedTask.category,
        priority: savedTask.priority
      });

    } catch (error) {
      console.error('Error saving task:', error);
      this.showToast('Erro ao salvar tarefa', 'danger');
    }
  }

  getTaskFormData() {
    return {
      title: Utils.DOM.$('#taskTitle')?.value?.trim() || '',
      description: Utils.DOM.$('#taskDescription')?.value?.trim() || '',
      category: Utils.DOM.$('#taskCategory')?.value || 'outros',
      priority: Utils.DOM.$('#taskPriority')?.value || 'media',
      dueDate: Utils.DOM.$('#taskDueDate')?.value || null,
      status: 'pending'
    };
  }

  validateTaskForm(data) {
    const errors = {};
    
    if (!Utils.Validation.isRequired(data.title)) {
      errors.title = 'Título é obrigatório';
    } else if (!Utils.Validation.minLength(data.title, 3)) {
      errors.title = 'Título deve ter pelo menos 3 caracteres';
    } else if (!Utils.Validation.maxLength(data.title, 100)) {
      errors.title = 'Título deve ter no máximo 100 caracteres';
    }
    
    if (data.description && !Utils.Validation.maxLength(data.description, 500)) {
      errors.description = 'Descrição deve ter no máximo 500 caracteres';
    }
    
    if (data.dueDate) {
      const dueDate = new Date(data.dueDate);
      if (!Utils.Validation.isValidDate(dueDate)) {
        errors.dueDate = 'Data de vencimento inválida';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  showFormErrors(errors) {
    // Clear previous errors
    Utils.DOM.$$('.form-error').forEach(el => el.remove());
    Utils.DOM.$$('.form-control').forEach(el => el.classList.remove('error'));

    // Show new errors
    Object.entries(errors).forEach(([field, message]) => {
      const input = Utils.DOM.$(`#task${Utils.String.capitalize(field)}`);
      if (input) {
        input.classList.add('error');
        const errorEl = Utils.DOM.createElement('div', {
          className: 'form-error',
          textContent: message
        });
        input.parentNode.appendChild(errorEl);
      }
    });

    // Focus first error field
    const firstErrorInput = Utils.DOM.$('.form-control.error');
    if (firstErrorInput) {
      firstErrorInput.focus();
    }
  }

  renderTasks() {
    const container = Utils.DOM.$('#tasksList');
    if (!container) return;

    // Filter tasks
    const filteredTasks = this.filterTasks(this.currentTasks, this.currentFilter);

    if (filteredTasks.length === 0) {
      this.renderEmptyState(container);
      return;
    }

    // Render task list
    container.innerHTML = '';
    filteredTasks.forEach(task => {
      const taskElement = this.createTaskElement(task);
      container.appendChild(taskElement);
    });
  }

  filterTasks(tasks, filter) {
    switch (filter) {
      case 'pending':
        return tasks.filter(task => task.status === 'pending');
      case 'completed':
        return tasks.filter(task => task.status === 'completed');
      case 'today':
        return tasks.filter(task => {
          if (!task.dueDate) return false;
          return Utils.Date.isToday(new Date(task.dueDate));
        });
      case 'overdue':
        return tasks.filter(task => {
          if (!task.dueDate || task.status === 'completed') return false;
          return new Date(task.dueDate) < Utils.Date.now();
        });
      default:
        return tasks;
    }
  }

  createTaskElement(task) {
    const category = Utils.Angola.getCategory(task.category);
    const isOverdue = task.dueDate && task.status !== 'completed' && 
                     new Date(task.dueDate) < Utils.Date.now();
    
    const taskEl = Utils.DOM.createElement('div', {
      className: `task-item ${task.status} ${isOverdue ? 'overdue' : ''}`,
      'data-task-id': task.id
    });

    taskEl.innerHTML = `
      <div class="task-header">
        <div class="task-main">
          <h3 class="task-title">${Utils.String.sanitizeHtml(task.title)}</h3>
          ${task.description ? `<p class="task-description">${Utils.String.sanitizeHtml(task.description)}</p>` : ''}
          <div class="task-meta">
            <span class="task-category" style="background-color: ${category.color}">
              ${category.icon} ${category.name}
            </span>
            <span class="task-priority ${task.priority}">
              ${this.getPriorityIcon(task.priority)} ${Utils.String.capitalize(task.priority)}
            </span>
            ${task.dueDate ? `
              <span class="task-due-date ${isOverdue ? 'overdue' : ''}">
                📅 ${Utils.Date.getRelativeTime(new Date(task.dueDate))}
              </span>
            ` : ''}
          </div>
        </div>
        <div class="task-actions">
          <button class="btn btn-ghost btn-sm" onclick="Tasks.toggleTaskComplete('${task.id}')" 
                  title="${task.status === 'completed' ? 'Marcar como pendente' : 'Marcar como concluída'}">
            ${task.status === 'completed' ? '↩️' : '✅'}
          </button>
          <button class="btn btn-ghost btn-sm" onclick="Tasks.editTask('${task.id}')" title="Editar tarefa">
            ✏️
          </button>
          <button class="btn btn-ghost btn-sm" onclick="Tasks.deleteTask('${task.id}')" title="Excluir tarefa">
            🗑️
          </button>
        </div>
      </div>
    `;

    return taskEl;
  }

  getPriorityIcon(priority) {
    const icons = {
      alta: '🔴',
      media: '🟡',
      baixa: '🟢'
    };
    return icons[priority] || '⚪';
  }

  renderEmptyState(container) {
    const emptyMessages = {
      all: {
        icon: '📝',
        title: 'Nenhuma tarefa encontrada',
        message: 'Crie sua primeira tarefa para começar a organizar seu dia!',
        buttonText: 'Criar Primeira Tarefa'
      },
      pending: {
        icon: '🎉',
        title: 'Todas as tarefas concluídas!',
        message: 'Parabéns! Você não tem tarefas pendentes.',
        buttonText: 'Criar Nova Tarefa'
      },
      completed: {
        icon: '📋',
        title: 'Nenhuma tarefa concluída',
        message: 'Complete algumas tarefas para vê-las aqui.',
        buttonText: 'Ver Todas as Tarefas'
      },
      today: {
        icon: '📅',
        title: 'Nenhuma tarefa para hoje',
        message: 'Você está livre hoje! Que tal criar uma nova tarefa?',
        buttonText: 'Criar Nova Tarefa'
      }
    };

    const config = emptyMessages[this.currentFilter] || emptyMessages.all;

    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">${config.icon}</span>
        <h3>${config.title}</h3>
        <p>${config.message}</p>
        <button class="btn btn-primary" onclick="Tasks.showTaskModal()">
          ${config.buttonText}
        </button>
      </div>
    `;
  }

  async toggleTaskComplete(taskId) {
    try {
      const task = await Storage.getTask(taskId);
      if (!task) {
        this.showToast('Tarefa não encontrada', 'danger');
        return;
      }

      if (task.status === 'completed') {
        // Mark as pending
        task.status = 'pending';
        task.completedAt = null;
        await Storage.saveTask(task);
        this.showToast('Tarefa marcada como pendente', 'info');
      } else {
        // Mark as completed
        await Storage.completeTask(taskId);
        this.showToast('Tarefa concluída! 🎉', 'success');
      }

      // Update UI
      await this.loadTasks();

    } catch (error) {
      console.error('Error toggling task completion:', error);
      this.showToast('Erro ao atualizar tarefa', 'danger');
    }
  }

  async editTask(taskId) {
    try {
      const task = await Storage.getTask(taskId);
      if (!task) {
        this.showToast('Tarefa não encontrada', 'danger');
        return;
      }

      // Populate form with task data
      this.populateTaskForm(task);
      
      // Show modal in edit mode
      this.showTaskModal(task.id);

    } catch (error) {
      console.error('Error loading task for editing:', error);
      this.showToast('Erro ao carregar tarefa', 'danger');
    }
  }

  async deleteTask(taskId) {
    try {
      const task = await Storage.getTask(taskId);
      if (!task) {
        this.showToast('Tarefa não encontrada', 'danger');
        return;
      }

      // Confirm deletion
      if (!confirm(`Tem certeza que deseja excluir a tarefa "${task.title}"?`)) {
        return;
      }

      await Storage.deleteTask(taskId);
      await this.loadTasks();
      
      this.showToast('Tarefa excluída com sucesso', 'success');

    } catch (error) {
      console.error('Error deleting task:', error);
      this.showToast('Erro ao excluir tarefa', 'danger');
    }
  }

  populateTaskForm(task) {
    Utils.DOM.$('#taskTitle').value = task.title || '';
    Utils.DOM.$('#taskDescription').value = task.description || '';
    Utils.DOM.$('#taskCategory').value = task.category || 'outros';
    Utils.DOM.$('#taskPriority').value = task.priority || 'media';
    
    if (task.dueDate) {
      const date = new Date(task.dueDate);
      Utils.DOM.$('#taskDueDate').value = date.toISOString().split('T')[0];
    } else {
      Utils.DOM.$('#taskDueDate').value = '';
    }
  }

  showTaskModal(editingTaskId = null) {
    const modal = Utils.DOM.$('#taskModal');
    const title = Utils.DOM.$('#taskModalTitle');
    
    if (editingTaskId) {
      modal.dataset.editingTask = editingTaskId;
      title.textContent = 'Editar Tarefa';
    } else {
      delete modal.dataset.editingTask;
      title.textContent = 'Nova Tarefa';
      this.clearTaskForm();
    }

    modal.classList.add('show');
    
    // Focus first input
    setTimeout(() => {
      Utils.DOM.$('#taskTitle')?.focus();
    }, 100);
  }

  closeTaskModal() {
    const modal = Utils.DOM.$('#taskModal');
    modal.classList.remove('show');
    delete modal.dataset.editingTask;
    this.clearTaskForm();
  }

  clearTaskForm() {
    Utils.DOM.$('#taskForm')?.reset();
    
    // Clear errors
    Utils.DOM.$$('.form-error').forEach(el => el.remove());
    Utils.DOM.$$('.form-control').forEach(el => el.classList.remove('error'));
  }

  updateDashboardStats() {
    const totalTasks = this.currentTasks.length;
    const todayTasks = this.currentTasks.filter(task => 
      task.dueDate && Utils.Date.isToday(new Date(task.dueDate))
    );
    const completedTasks = this.currentTasks.filter(task => task.status === 'completed');
    const pendingTasks = this.currentTasks.filter(task => task.status === 'pending');

    // Update dashboard elements
    const todayTasksEl = Utils.DOM.$('#todayTasks');
    const completedTasksEl = Utils.DOM.$('#completedTasks');
    const pendingTasksEl = Utils.DOM.$('#pendingTasks');
    const todayProgressEl = Utils.DOM.$('#todayProgress');

    if (todayTasksEl) todayTasksEl.textContent = todayTasks.length;
    if (completedTasksEl) completedTasksEl.textContent = completedTasks.length;
    if (pendingTasksEl) pendingTasksEl.textContent = pendingTasks.length;

    // Update progress bar
    if (todayProgressEl && todayTasks.length > 0) {
      const completedToday = todayTasks.filter(task => task.status === 'completed').length;
      const progress = (completedToday / todayTasks.length) * 100;
      todayProgressEl.style.width = `${progress}%`;
    }
  }

  showToast(message, type = 'info') {
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

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
      }
    }, 5000);
  }

  // Search functionality
  searchTasks(query) {
    const searchResults = this.currentTasks.filter(task =>
      Utils.String.searchMatch(task.title, query) ||
      Utils.String.searchMatch(task.description, query) ||
      Utils.String.searchMatch(Utils.Angola.getCategory(task.category).name, query)
    );

    this.renderSearchResults(searchResults, query);
  }

  renderSearchResults(results, query) {
    const container = Utils.DOM.$('#tasksList');
    if (!container) return;

    if (results.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">🔍</span>
          <h3>Nenhuma tarefa encontrada</h3>
          <p>Não encontramos tarefas com o termo "${Utils.String.sanitizeHtml(query)}"</p>
          <button class="btn btn-secondary" onclick="Tasks.clearSearch()">
            Limpar Pesquisa
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    results.forEach(task => {
      const taskElement = this.createTaskElement(task);
      container.appendChild(taskElement);
    });
  }

  clearSearch() {
    const searchInput = Utils.DOM.$('#taskSearch');
    if (searchInput) {
      searchInput.value = '';
    }
    this.renderTasks();
  }

  // Bulk operations
  async bulkComplete(taskIds) {
    try {
      for (const taskId of taskIds) {
        await Storage.completeTask(taskId);
      }
      await this.loadTasks();
      this.showToast(`${taskIds.length} tarefas concluídas`, 'success');
    } catch (error) {
      console.error('Error in bulk complete:', error);
      this.showToast('Erro ao concluir tarefas', 'danger');
    }
  }

  async bulkDelete(taskIds) {
    try {
      if (!confirm(`Tem certeza que deseja excluir ${taskIds.length} tarefas?`)) {
        return;
      }

      for (const taskId of taskIds) {
        await Storage.deleteTask(taskId);
      }
      await this.loadTasks();
      this.showToast(`${taskIds.length} tarefas excluídas`, 'success');
    } catch (error) {
      console.error('Error in bulk delete:', error);
      this.showToast('Erro ao excluir tarefas', 'danger');
    }
  }

  // Export functionality
  async exportTasks(format = 'json') {
    try {
      const tasks = await Storage.getTasks();
      
      if (format === 'json') {
        const data = JSON.stringify(tasks, null, 2);
        this.downloadFile(data, 'list-kamba-tasks.json', 'application/json');
      } else if (format === 'csv') {
        const csv = this.tasksToCSV(tasks);
        this.downloadFile(csv, 'list-kamba-tasks.csv', 'text/csv');
      }
      
      this.showToast('Tarefas exportadas com sucesso', 'success');
    } catch (error) {
      console.error('Error exporting tasks:', error);
      this.showToast('Erro ao exportar tarefas', 'danger');
    }
  }

  tasksToCSV(tasks) {
    const headers = ['Título', 'Descrição', 'Categoria', 'Prioridade', 'Status', 'Data de Vencimento', 'Criado em'];
    const rows = tasks.map(task => [
      task.title,
      task.description || '',
      Utils.Angola.getCategory(task.category).name,
      Utils.String.capitalize(task.priority),
      task.status === 'completed' ? 'Concluída' : 'Pendente',
      task.dueDate ? Utils.Date.formatDate(new Date(task.dueDate)) : '',
      Utils.Date.formatDateTime(new Date(task.createdAt))
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }

  downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// Initialize task manager and make it globally available
window.Tasks = new TaskManager();

// Global functions for onclick handlers
window.createNewTask = () => Tasks.showTaskModal();
window.closeTaskModal = () => Tasks.closeTaskModal();