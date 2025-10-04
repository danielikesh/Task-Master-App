// ============================================
// TASKMASTER PRO - ENHANCED APPLICATION (FIXED)
// ============================================

// Global State Management
const AppState = {
    tasks: [],
    notes: [],
    statistics: {},
    settings: {},
    currentView: 'dashboard',
    currentDate: new Date(),
    selectedDate: new Date(),
    filters: {
        priority: '',
        category: '',
        search: ''
    },
    pomodoro: {
        timer: null,
        timeLeft: 1500,
        isRunning: false,
        workDuration: 25,
        breakDuration: 5,
        sessionsToday: 0
    },
    charts: {
        status: null,
        priority: null,
        completion: null
    }
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async() => {
    console.log('🚀 Initializing TaskMaster Pro...');
    showLoading();

    try {
        await initializeApp();
        setupEventListeners();
        setupKeyboardShortcuts();

        setTimeout(() => {
            hideLoading();
            console.log('✅ App initialized successfully!');
        }, 1000);
    } catch (error) {
        console.error('❌ Initialization error:', error);
        hideLoading();
        alert('Error initializing app. Please refresh the page.');
    }
});

async function initializeApp() {
    try {
        await loadSettings();
        await loadTasks();
        await loadNotes();
        await loadStatistics();
        await loadActivity();

        applyTheme();
        renderDashboard();
        renderCalendar();

        showToast('Welcome back!', 'TaskMaster Pro is ready', 'success');
    } catch (error) {
        console.error('Initialization error:', error);
    }
}

function showLoading() {
    const loader = document.getElementById('loading-screen');
    if (loader) {
        loader.classList.remove('hidden');
    }
}

function hideLoading() {
    const loader = document.getElementById('loading-screen');
    if (loader) {
        loader.classList.add('hidden');
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            switchView(view);
        });
    });

    // Note categories
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterNotesByCategory(btn.dataset.category);
        });
    });

    // Forms
    const taskForm = document.getElementById('task-form');
    if (taskForm) {
        taskForm.addEventListener('submit', handleTaskSubmit);
    }

    const noteForm = document.getElementById('note-form');
    if (noteForm) {
        noteForm.addEventListener('submit', handleNoteSubmit);
    }

    // Click outside modal to close
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    // Work duration change
    const workDuration = document.getElementById('work-duration');
    if (workDuration) {
        workDuration.addEventListener('change', (e) => {
            AppState.pomodoro.workDuration = parseInt(e.target.value);
            if (!AppState.pomodoro.isRunning) {
                AppState.pomodoro.timeLeft = AppState.pomodoro.workDuration * 60;
                updatePomodoroDisplay();
            }
        });
    }

    // Break duration change
    const breakDuration = document.getElementById('break-duration');
    if (breakDuration) {
        breakDuration.addEventListener('change', (e) => {
            AppState.pomodoro.breakDuration = parseInt(e.target.value);
        });
    }
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.target.matches('input, textarea')) return;

        switch (e.key.toLowerCase()) {
            case 'n':
                if (e.shiftKey) {
                    openNoteModal();
                } else {
                    openTaskModal();
                }
                break;
            case 't':
                toggleTheme();
                break;
            case 'p':
                switchView('pomodoro');
                break;
            case '/':
                e.preventDefault();
                const searchInput = document.getElementById('global-search');
                if (searchInput) searchInput.focus();
                break;
            case '?':
                openShortcutsModal();
                break;
            case 'escape':
                closeAllModals();
                break;
        }
    });
}

function openShortcutsModal() {
    const modal = document.getElementById('shortcuts-modal');
    if (modal) modal.classList.add('active');
}

function closeShortcutsModal() {
    const modal = document.getElementById('shortcuts-modal');
    if (modal) modal.classList.remove('active');
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

// ============================================
// VIEW MANAGEMENT
// ============================================

function switchView(view) {
    AppState.currentView = view;

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === view);
    });

    document.querySelectorAll('.view').forEach(v => {
        v.classList.remove('active');
    });

    const viewElement = document.getElementById(view + '-view');
    if (viewElement) {
        viewElement.classList.add('active');
    }

    switch (view) {
        case 'dashboard':
            renderDashboard();
            break;
        case 'kanban':
            renderKanban();
            break;
        case 'calendar':
            renderCalendar();
            break;
        case 'notes':
            renderNotes();
            break;
        case 'activity':
            loadActivity();
            break;
    }

    playSound('click');
}

// ============================================
// SETTINGS & THEME
// ============================================

async function loadSettings() {
    try {
        const response = await fetch('/api/settings');
        AppState.settings = await response.json();
    } catch (error) {
        console.error('Error loading settings:', error);
        AppState.settings = {
            theme: 'dark',
            sound_enabled: 'true'
        };
    }
}

async function saveSetting(key, value) {
    try {
        await fetch('/api/settings/' + key, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value })
        });
        AppState.settings[key] = value;
    } catch (error) {
        console.error('Error saving setting:', error);
    }
}

function toggleTheme() {
    const body = document.body;
    const isDark = body.classList.contains('theme-dark');

    body.classList.toggle('theme-dark', !isDark);
    body.classList.toggle('theme-light', isDark);

    const icon = document.querySelector('.theme-icon');
    if (icon) {
        icon.className = isDark ? 'fas fa-sun theme-icon' : 'fas fa-moon theme-icon';
    }

    saveSetting('theme', isDark ? 'light' : 'dark');
    showToast('Theme Changed', 'Switched to ' + (isDark ? 'light' : 'dark') + ' mode', 'info');
    playSound('click');
}

function applyTheme() {
    const theme = AppState.settings.theme || 'dark';
    document.body.classList.add('theme-' + theme);

    const icon = document.querySelector('.theme-icon');
    if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-moon theme-icon' : 'fas fa-sun theme-icon';
    }
}

function toggleSound() {
    const enabled = AppState.settings.sound_enabled === 'true';
    const newValue = !enabled;

    saveSetting('sound_enabled', newValue.toString());

    const icon = document.querySelector('.sound-icon');
    if (icon) {
        icon.className = newValue ? 'fas fa-volume-up sound-icon' : 'fas fa-volume-mute sound-icon';
    }

    showToast('Sound ' + (newValue ? 'Enabled' : 'Disabled'), '', 'info');
}

// ============================================
// TASKS API
// ============================================

async function loadTasks() {
    try {
        const params = new URLSearchParams(AppState.filters);
        const response = await fetch('/api/tasks?' + params.toString());
        AppState.tasks = await response.json();
        renderKanban();
        renderCalendarTasks();
    } catch (error) {
        console.error('Error loading tasks:', error);
        showToast('Error', 'Failed to load tasks', 'error');
    }
}

async function handleTaskSubmit(e) {
    e.preventDefault();

    const taskId = document.getElementById('task-id').value;
    const taskData = {
        title: document.getElementById('task-title').value,
        description: document.getElementById('task-description').value,
        status: document.getElementById('task-status').value,
        priority: document.getElementById('task-priority').value,
        category: document.getElementById('task-category').value,
        due_date: document.getElementById('task-due-date').value,
        tags: document.getElementById('task-tags').value
    };

    try {
        if (taskId) {
            await fetch('/api/tasks/' + taskId, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            });
            showToast('Success', 'Task updated successfully', 'success');
        } else {
            await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            });
            showToast('Success', 'Task created successfully', 'success');
        }

        closeTaskModal();
        await loadTasks();
        await loadStatistics();
        playSound('success');
    } catch (error) {
        console.error('Error saving task:', error);
        showToast('Error', 'Failed to save task', 'error');
    }
}

async function deleteTask(id) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
        await fetch('/api/tasks/' + id, { method: 'DELETE' });
        showToast('Success', 'Task deleted successfully', 'success');
        await loadTasks();
        await loadStatistics();
        playSound('delete');
    } catch (error) {
        console.error('Error deleting task:', error);
        showToast('Error', 'Failed to delete task', 'error');
    }
}

async function editTask(id) {
    const task = AppState.tasks.find(t => t.id === id);
    if (!task) return;

    document.getElementById('task-modal-title').innerHTML = '<i class="fas fa-edit"></i> Edit Task';
    document.getElementById('task-id').value = task.id;
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-description').value = task.description || '';
    document.getElementById('task-status').value = task.status;
    document.getElementById('task-priority').value = task.priority;
    document.getElementById('task-category').value = task.category || 'general';
    document.getElementById('task-due-date').value = task.due_date || '';
    document.getElementById('task-tags').value = task.tags || '';

    document.getElementById('task-modal').classList.add('active');
}

// ============================================
// NOTES API
// ============================================

async function loadNotes() {
    try {
        const response = await fetch('/api/notes');
        AppState.notes = await response.json();
        renderNotes();
    } catch (error) {
        console.error('Error loading notes:', error);
        showToast('Error', 'Failed to load notes', 'error');
    }
}

async function handleNoteSubmit(e) {
    e.preventDefault();

    const noteId = document.getElementById('note-id').value;
    const noteData = {
        title: document.getElementById('note-title').value,
        content: document.getElementById('note-content').value,
        color: document.querySelector('input[name="note-color"]:checked').value,
        category: document.getElementById('note-category').value,
        is_pinned: document.getElementById('note-pinned').checked ? 1 : 0
    };

    try {
        if (noteId) {
            await fetch('/api/notes/' + noteId, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(noteData)
            });
            showToast('Success', 'Note updated successfully', 'success');
        } else {
            await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(noteData)
            });
            showToast('Success', 'Note created successfully', 'success');
        }

        closeNoteModal();
        await loadNotes();
        await loadStatistics();
        playSound('success');
    } catch (error) {
        console.error('Error saving note:', error);
        showToast('Error', 'Failed to save note', 'error');
    }
}

async function deleteNote(id) {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
        await fetch('/api/notes/' + id, { method: 'DELETE' });
        showToast('Success', 'Note deleted successfully', 'success');
        await loadNotes();
        await loadStatistics();
        playSound('delete');
    } catch (error) {
        console.error('Error deleting note:', error);
        showToast('Error', 'Failed to delete note', 'error');
    }
}

async function editNote(id) {
    const note = AppState.notes.find(n => n.id === id);
    if (!note) return;

    document.getElementById('note-modal-title').innerHTML = '<i class="fas fa-edit"></i> Edit Note';
    document.getElementById('note-id').value = note.id;
    document.getElementById('note-title').value = note.title;
    document.getElementById('note-content').value = note.content || '';
    document.getElementById('note-category').value = note.category || 'general';
    document.getElementById('note-pinned').checked = note.is_pinned === 1;

    const colorRadio = document.querySelector('input[name="note-color"][value="' + note.color + '"]');
    if (colorRadio) colorRadio.checked = true;

    document.getElementById('note-modal').classList.add('active');
}

async function toggleNotePin(id) {
    const note = AppState.notes.find(n => n.id === id);
    if (!note) return;

    try {
        await fetch('/api/notes/' + id + '/pin', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_pinned: note.is_pinned === 1 ? 0 : 1 })
        });
        await loadNotes();
    } catch (error) {
        console.error('Error toggling pin:', error);
    }
}

// ============================================
// STATISTICS
// ============================================

async function loadStatistics() {
    try {
        const response = await fetch('/api/statistics');
        AppState.statistics = await response.json();
        updateDashboardStats();
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

function updateDashboardStats() {
    const stats = AppState.statistics;

    const totalTasks = document.getElementById('stat-total-tasks');
    const completedTasks = document.getElementById('stat-completed-tasks');
    const progressTasks = document.getElementById('stat-progress-tasks');
    const totalNotes = document.getElementById('stat-total-notes');
    const todayCompleted = document.getElementById('today-completed');

    if (totalTasks) totalTasks.textContent = (stats.tasks && stats.tasks.total) || 0;
    if (completedTasks) completedTasks.textContent = (stats.tasks && stats.tasks.completed) || 0;
    if (progressTasks) progressTasks.textContent = (stats.tasks && stats.tasks.in_progress) || 0;
    if (totalNotes) totalNotes.textContent = (stats.notes && stats.notes.total) || 0;
    if (todayCompleted) todayCompleted.textContent = stats.completedToday || 0;

    const totalTimeEl = document.getElementById('total-time-spent');
    const todayTimeEl = document.getElementById('today-time-spent');

    const totalMinutes = (stats.tasks && stats.tasks.total_time) || 0;
    if (totalTimeEl) totalTimeEl.textContent = formatTime(totalMinutes);
    if (todayTimeEl) todayTimeEl.textContent = '0h 0m';

    updateCharts();
}

function formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours + 'h ' + mins + 'm';
}

// ============================================
// CHARTS
// ============================================

function updateCharts() {
    createStatusChart();
    createPriorityChart();
    createCompletionChart();
}

function createStatusChart() {
    const ctx = document.getElementById('status-chart');
    if (!ctx) return;

    if (AppState.charts.status) {
        AppState.charts.status.destroy();
    }

    const stats = AppState.statistics.tasks || {};

    AppState.charts.status = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['To Do', 'In Progress', 'Done'],
            datasets: [{
                data: [stats.todo || 0, stats.in_progress || 0, stats.completed || 0],
                backgroundColor: ['#f59e0b', '#3b82f6', '#10b981'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#cbd5e1',
                        padding: 15,
                        font: { size: 12 }
                    }
                }
            }
        }
    });
}

function createPriorityChart() {
    const ctx = document.getElementById('priority-chart');
    if (!ctx) return;

    if (AppState.charts.priority) {
        AppState.charts.priority.destroy();
    }

    const priorityData = AppState.statistics.priority || [];
    const labels = priorityData.map(function(p) {
        return p.priority.charAt(0).toUpperCase() + p.priority.slice(1);
    });
    const data = priorityData.map(function(p) { return p.count; });

    AppState.charts.priority = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Tasks',
                data: data,
                backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                borderWidth: 0,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#94a3b8',
                        stepSize: 1
                    },
                    grid: { color: '#334155' }
                },
                x: {
                    ticks: { color: '#94a3b8' },
                    grid: { display: false }
                }
            }
        }
    });
}

function createCompletionChart() {
    const ctx = document.getElementById('completion-chart');
    if (!ctx) return;

    if (AppState.charts.completion) {
        AppState.charts.completion.destroy();
    }

    const stats = AppState.statistics.tasks || {};
    const total = stats.total || 1;
    const completed = stats.completed || 0;
    const completionRate = ((completed / total) * 100).toFixed(1);

    AppState.charts.completion = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                label: 'Completion Rate %',
                data: [65, 72, 78, completionRate],
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                tension: 0.4,
                fill: true,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: {
                        color: '#cbd5e1',
                        padding: 15,
                        font: { size: 12 }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        color: '#94a3b8',
                        callback: function(value) { return value + '%'; }
                    },
                    grid: { color: '#334155' }
                },
                x: {
                    ticks: { color: '#94a3b8' },
                    grid: { display: false }
                }
            }
        }
    });
}

// ============================================
// DASHBOARD
// ============================================

function renderDashboard() {
    updateDashboardStats();
    renderRecentActivity();
}

async function renderRecentActivity() {
    try {
        const response = await fetch('/api/activity?limit=5');
        const activities = await response.json();

        const container = document.getElementById('dashboard-activity');
        if (!container) return;

        if (activities.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No recent activity</p>';
            return;
        }

        container.innerHTML = activities.slice(0, 5).map(function(activity) {
            return '<div class="activity-item">' +
                '<div class="activity-icon ' + activity.action_type + '">' +
                '<i class="fas fa-' + getActivityIcon(activity.action_type) + '"></i>' +
                '</div>' +
                '<div class="activity-content">' +
                '<h4>' + activity.description + '</h4>' +
                '<p class="activity-time">' + formatRelativeTime(activity.created_at) + '</p>' +
                '</div>' +
                '</div>';
        }).join('');
    } catch (error) {
        console.error('Error loading activity:', error);
    }
}

// ============================================
// KANBAN BOARD
// ============================================

function renderKanban() {
    const columns = {
        'todo': document.getElementById('todo-column'),
        'in-progress': document.getElementById('in-progress-column'),
        'done': document.getElementById('done-column')
    };

    for (var key in columns) {
        if (columns[key]) {
            columns[key].innerHTML = '';
        }
    }

    AppState.tasks.forEach(function(task) {
        const column = columns[task.status];
        if (column) {
            column.appendChild(createTaskCard(task));
        }
    });

    updateTaskCounts();
}

function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.draggable = true;
    card.dataset.taskId = task.id;
    card.dataset.status = task.status;

    const tags = task.tags ? task.tags.split(',').map(function(t) { return t.trim(); }).filter(function(t) { return t; }) : [];
    const dueDate = task.due_date ? new Date(task.due_date) : null;
    const isOverdue = dueDate && dueDate < new Date() && task.status !== 'done';

    var tagsHtml = '';
    if (tags.length > 0) {
        tagsHtml = '<div class="task-tags">' +
            tags.map(function(tag) {
                return '<span class="task-tag">' + escapeHtml(tag) + '</span>';
            }).join('') +
            '</div>';
    }

    var dueDateHtml = '';
    if (dueDate) {
        dueDateHtml = '<span class="task-due-date ' + (isOverdue ? 'overdue' : '') + '">' +
            '<i class="fas fa-calendar"></i> ' + formatDate(dueDate) +
            '</span>';
    }

    card.innerHTML =
        '<div class="task-header">' +
        '<div class="task-title">' + escapeHtml(task.title) + '</div>' +
        '<div class="task-actions">' +
        '<button class="task-action-btn" onclick="editTask(' + task.id + ')" title="Edit">' +
        '<i class="fas fa-edit"></i>' +
        '</button>' +
        '<button class="task-action-btn delete" onclick="deleteTask(' + task.id + ')" title="Delete">' +
        '<i class="fas fa-trash"></i>' +
        '</button>' +
        '</div>' +
        '</div>' +
        (task.description ? '<div class="task-description">' + escapeHtml(task.description) + '</div>' : '') +
        '<div class="task-footer">' +
        '<div class="task-meta">' +
        '<span class="task-priority priority-' + task.priority + '">' + task.priority + '</span>' +
        (task.category ? '<span class="task-category">' + escapeHtml(task.category) + '</span>' : '') +
        dueDateHtml +
        '</div>' +
        tagsHtml +
        '</div>';

    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);

    return card;
}

function updateTaskCounts() {
    const counts = { 'todo': 0, 'in-progress': 0, 'done': 0 };

    AppState.tasks.forEach(function(task) {
        if (counts.hasOwnProperty(task.status)) {
            counts[task.status]++;
        }
    });

    const todoCount = document.getElementById('todo-count');
    const progressCount = document.getElementById('in-progress-count');
    const doneCount = document.getElementById('done-count');

    if (todoCount) todoCount.textContent = counts['todo'];
    if (progressCount) progressCount.textContent = counts['in-progress'];
    if (doneCount) doneCount.textContent = counts['done'];
}

// ============================================
// DRAG AND DROP
// ============================================

function allowDrop(e) {
    e.preventDefault();
}

function handleDragStart(e) {
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

async function drop(e) {
    e.preventDefault();

    const column = e.target.closest('.column-content');
    if (!column) return;

    const draggingCard = document.querySelector('.dragging');
    if (!draggingCard) return;

    const newStatus = column.parentElement.dataset.status;
    const taskId = draggingCard.dataset.taskId;
    const oldStatus = draggingCard.dataset.status;

    if (newStatus === oldStatus) return;

    try {
        await fetch('/api/tasks/' + taskId + '/status', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        const task = AppState.tasks.find(function(t) { return t.id == taskId; });
        if (task) {
            task.status = newStatus;

            if (newStatus === 'done') {
                celebrateTaskCompletion();
                playSound('complete');
            }
        }

        renderKanban();
        await loadStatistics();
    } catch (error) {
        console.error('Error updating task status:', error);
        showToast('Error', 'Failed to update task', 'error');
    }
}

// ============================================
// CALENDAR VIEW
// ============================================

function renderCalendar() {
    const year = AppState.currentDate.getFullYear();
    const month = AppState.currentDate.getMonth();

    const monthName = document.getElementById('current-month');
    if (monthName) {
        monthName.textContent = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const grid = document.getElementById('calendar-grid');
    if (!grid) return;

    grid.innerHTML = '';

    for (var i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        grid.appendChild(createCalendarDay(day, true, new Date(year, month - 1, day)));
    }

    for (var day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        grid.appendChild(createCalendarDay(day, false, date));
    }

    const totalCells = grid.children.length;
    const remainingCells = 42 - totalCells;
    for (var day = 1; day <= remainingCells; day++) {
        grid.appendChild(createCalendarDay(day, true, new Date(year, month + 1, day)));
    }

    renderCalendarTasks();
}

function createCalendarDay(day, otherMonth, date) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';

    if (otherMonth) dayEl.classList.add('other-month');

    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
        dayEl.classList.add('today');
    }

    if (date.toDateString() === AppState.selectedDate.toDateString()) {
        dayEl.classList.add('selected');
    }

    const tasksOnDay = AppState.tasks.filter(function(task) {
        if (!task.due_date) return false;
        const taskDate = new Date(task.due_date);
        return taskDate.toDateString() === date.toDateString();
    });

    if (tasksOnDay.length > 0) {
        dayEl.classList.add('has-tasks');
    }

    dayEl.textContent = day;
    dayEl.addEventListener('click', function() {
        selectCalendarDate(date);
    });

    return dayEl;
}

function selectCalendarDate(date) {
    AppState.selectedDate = date;
    renderCalendar();
    renderCalendarTasks();
}

function renderCalendarTasks() {
    const container = document.getElementById('calendar-tasks-list');
    if (!container) return;

    const selectedDateStr = AppState.selectedDate.toDateString();
    const selectedDateEl = document.getElementById('selected-date');
    if (selectedDateEl) {
        selectedDateEl.textContent = AppState.selectedDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    const tasksForDay = AppState.tasks.filter(function(task) {
        if (!task.due_date) return false;
        const taskDate = new Date(task.due_date);
        return taskDate.toDateString() === selectedDateStr;
    });

    if (tasksForDay.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No tasks for this day</p>';
        return;
    }

    container.innerHTML = tasksForDay.map(function(task) {
        return '<div class="task-card" style="cursor: pointer;" onclick="editTask(' + task.id + ')">' +
            '<div class="task-header">' +
            '<div class="task-title">' + escapeHtml(task.title) + '</div>' +
            '</div>' +
            (task.description ? '<div class="task-description">' + escapeHtml(task.description) + '</div>' : '') +
            '<div class="task-footer">' +
            '<span class="task-priority priority-' + task.priority + '">' + task.priority + '</span>' +
            '<span class="task-category">' + task.status + '</span>' +
            '</div>' +
            '</div>';
    }).join('');
}

function previousMonth() {
    AppState.currentDate.setMonth(AppState.currentDate.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    AppState.currentDate.setMonth(AppState.currentDate.getMonth() + 1);
    renderCalendar();
}

// ============================================
// NOTES
// ============================================

function renderNotes() {
    const grid = document.getElementById('notes-grid');
    if (!grid) return;

    grid.innerHTML = AppState.notes.map(function(note) {
        return createNoteCard(note);
    }).join('');
}

function createNoteCard(note) {
    return '<div class="note-card ' + (note.is_pinned ? 'pinned' : '') + '" style="background: ' + note.color + '">' +
        '<div class="note-header">' +
        '<div class="note-title">' + escapeHtml(note.title) + '</div>' +
        '<div class="note-actions">' +
        '<button class="note-action-btn" onclick="toggleNotePin(' + note.id + ')" title="' + (note.is_pinned ? 'Unpin' : 'Pin') + '">' +
        '<i class="fas fa-thumbtack"></i>' +
        '</button>' +
        '<button class="note-action-btn" onclick="editNote(' + note.id + ')" title="Edit">' +
        '<i class="fas fa-edit"></i>' +
        '</button>' +
        '<button class="note-action-btn" onclick="deleteNote(' + note.id + ')" title="Delete">' +
        '<i class="fas fa-trash"></i>' +
        '</button>' +
        '</div>' +
        '</div>' +
        '<div class="note-content">' + escapeHtml(note.content || '') + '</div>' +
        (note.category ? '<div class="note-category">' + escapeHtml(note.category) + '</div>' : '') +
        '</div>';
}

function searchNotes() {
    const search = document.getElementById('notes-search').value.toLowerCase();
    const filtered = AppState.notes.filter(function(note) {
        return note.title.toLowerCase().includes(search) ||
            (note.content && note.content.toLowerCase().includes(search));
    });

    const grid = document.getElementById('notes-grid');
    if (!grid) return;

    grid.innerHTML = filtered.map(function(note) {
        return createNoteCard(note);
    }).join('');
}

function filterNotesByCategory(category) {
    const filtered = category ?
        AppState.notes.filter(function(note) { return note.category === category; }) :
        AppState.notes;

    const grid = document.getElementById('notes-grid');
    if (!grid) return;

    grid.innerHTML = filtered.map(function(note) {
        return createNoteCard(note);
    }).join('');
}

// ============================================
// POMODORO TIMER
// ============================================

function startPomodoro() {
    if (AppState.pomodoro.isRunning) return;

    AppState.pomodoro.isRunning = true;
    AppState.pomodoro.timeLeft = AppState.pomodoro.workDuration * 60;

    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const statusEl = document.getElementById('timer-status');

    if (startBtn) startBtn.style.display = 'none';
    if (pauseBtn) pauseBtn.style.display = 'inline-flex';
    if (statusEl) statusEl.textContent = 'Working...';

    AppState.pomodoro.timer = setInterval(function() {
        AppState.pomodoro.timeLeft--;
        updatePomodoroDisplay();

        if (AppState.pomodoro.timeLeft <= 0) {
            completePomodoroSession();
        }
    }, 1000);

    playSound('start');
}

function pausePomodoro() {
    AppState.pomodoro.isRunning = false;
    clearInterval(AppState.pomodoro.timer);

    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const statusEl = document.getElementById('timer-status');

    if (startBtn) startBtn.style.display = 'inline-flex';
    if (pauseBtn) pauseBtn.style.display = 'none';
    if (statusEl) statusEl.textContent = 'Paused';

    playSound('pause');
}

function resetPomodoro() {
    AppState.pomodoro.isRunning = false;
    clearInterval(AppState.pomodoro.timer);
    AppState.pomodoro.timeLeft = AppState.pomodoro.workDuration * 60;

    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const statusEl = document.getElementById('timer-status');

    if (startBtn) startBtn.style.display = 'inline-flex';
    if (pauseBtn) pauseBtn.style.display = 'none';
    if (statusEl) statusEl.textContent = 'Ready to start';

    updatePomodoroDisplay();
    playSound('reset');
}

function updatePomodoroDisplay() {
    const minutes = Math.floor(AppState.pomodoro.timeLeft / 60);
    const seconds = AppState.pomodoro.timeLeft % 60;

    const display = document.getElementById('timer-display');
    if (display) {
        display.textContent = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
    }

    const totalTime = AppState.pomodoro.workDuration * 60;
    const progress = (AppState.pomodoro.timeLeft / totalTime) * 565.48;
    const circle = document.getElementById('timer-circle');
    if (circle) {
        circle.style.strokeDashoffset = 565.48 - progress;
    }
}

async function completePomodoroSession() {
    pausePomodoro();
    AppState.pomodoro.sessionsToday++;

    try {
        await fetch('/api/pomodoro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                duration: AppState.pomodoro.workDuration,
                completed: 1
            })
        });
    } catch (error) {
        console.error('Error saving pomodoro session:', error);
    }

    const badges = document.getElementById('session-badges');
    if (badges) {
        const badge = document.createElement('div');
        badge.className = 'session-badge';
        badge.innerHTML = '<i class="fas fa-check"></i>';
        badges.appendChild(badge);
    }

    showToast('Pomodoro Complete!', 'Great work! Take a break.', 'success');
    celebrateTaskCompletion();
    playSound('complete');

    const statusEl = document.getElementById('timer-status');
    if (statusEl) statusEl.textContent = 'Session complete!';
}

// ============================================
// ACTIVITY LOG
// ============================================

async function loadActivity() {
    try {
        const response = await fetch('/api/activity');
        const activities = await response.json();
        renderActivityTimeline(activities);
    } catch (error) {
        console.error('Error loading activity:', error);
    }
}

function renderActivityTimeline(activities) {
    const timeline = document.getElementById('activity-timeline');
    if (!timeline) return;

    if (activities.length === 0) {
        timeline.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No activity yet</p>';
        return;
    }

    timeline.innerHTML = activities.map(function(activity) {
        return '<div class="activity-item">' +
            '<div class="activity-icon ' + activity.action_type + '">' +
            '<i class="fas fa-' + getActivityIcon(activity.action_type) + '"></i>' +
            '</div>' +
            '<div class="activity-content">' +
            '<h4>' + activity.description + '</h4>' +
            '<p>' + activity.item_type + ' • ' + formatRelativeTime(activity.created_at) + '</p>' +
            '</div>' +
            '</div>';
    }).join('');
}

async function clearActivityLog() {
    if (!confirm('Clear all activity history?')) return;
    showToast('Info', 'Activity log cleared', 'info');
}

function getActivityIcon(actionType) {
    const icons = {
        create: 'plus',
        update: 'edit',
        'delete': 'trash',
        complete: 'check'
    };
    return icons[actionType] || 'circle';
}

// ============================================
// FILTERS & SEARCH
// ============================================

function applyFilters() {
    const priorityEl = document.getElementById('filter-priority');
    const categoryEl = document.getElementById('filter-category');

    AppState.filters.priority = priorityEl ? priorityEl.value : '';
    AppState.filters.category = categoryEl ? categoryEl.value : '';
    loadTasks();
}

function handleGlobalSearch() {
    const searchEl = document.getElementById('global-search');
    const search = searchEl ? searchEl.value : '';
    AppState.filters.search = search;
    loadTasks();
}

// ============================================
// MODALS
// ============================================

function openTaskModal() {
    const modal = document.getElementById('task-modal');
    const title = document.getElementById('task-modal-title');
    const form = document.getElementById('task-form');
    const taskId = document.getElementById('task-id');

    if (title) title.innerHTML = '<i class="fas fa-plus"></i> Create New Task';
    if (form) form.reset();
    if (taskId) taskId.value = '';
    if (modal) modal.classList.add('active');

    setTimeout(function() {
        const titleInput = document.getElementById('task-title');
        if (titleInput) titleInput.focus();
    }, 100);
}

function closeTaskModal() {
    const modal = document.getElementById('task-modal');
    if (modal) modal.classList.remove('active');
}

function openNoteModal() {
    const modal = document.getElementById('note-modal');
    const title = document.getElementById('note-modal-title');
    const form = document.getElementById('note-form');
    const noteId = document.getElementById('note-id');

    if (title) title.innerHTML = '<i class="fas fa-plus"></i> Create New Note';
    if (form) form.reset();
    if (noteId) noteId.value = '';
    if (modal) modal.classList.add('active');

    setTimeout(function() {
        const titleInput = document.getElementById('note-title');
        if (titleInput) titleInput.focus();
    }, 100);
}

function closeNoteModal() {
    const modal = document.getElementById('note-modal');
    if (modal) modal.classList.remove('active');
}

// ============================================
// EXPORT/IMPORT
// ============================================

async function exportData() {
    try {
        const response = await fetch('/api/export');
        const data = await response.json();

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'taskmaster-backup-' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
        URL.revokeObjectURL(url);

        showToast('Success', 'Data exported successfully', 'success');
        playSound('success');
    } catch (error) {
        console.error('Error exporting data:', error);
        showToast('Error', 'Failed to export data', 'error');
    }
}

// ============================================
// NOTIFICATIONS & EFFECTS
// ============================================

function showToast(title, message, type) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };

    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.innerHTML =
        '<div class="toast-icon">' +
        '<i class="fas fa-' + icons[type] + '"></i>' +
        '</div>' +
        '<div class="toast-content">' +
        '<strong>' + title + '</strong>' +
        (message ? '<p>' + message + '</p>' : '') +
        '</div>';

    container.appendChild(toast);

    setTimeout(function() {
        toast.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(function() {
            toast.remove();
        }, 300);
    }, 3000);
}

function celebrateTaskCompletion() {
    if (typeof confetti !== 'undefined') {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    }
}

// ============================================
// SOUND EFFECTS
// ============================================

function playSound(type) {
    if (AppState.settings.sound_enabled !== 'true') return;

    try {
        const audioContext = new(window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        const frequencies = {
            click: 200,
            success: 400,
            complete: 600,
            'delete': 150,
            start: 300,
            pause: 250,
            reset: 200
        };

        oscillator.frequency.value = frequencies[type] || 200;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        console.log('Sound not available');
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
}

function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return diffMins + 'm ago';
    if (diffHours < 24) return diffHours + 'h ago';
    if (diffDays < 7) return diffDays + 'd ago';
    return formatDate(date);
}

console.log('TaskMaster Pro Enhanced Edition v2.0 - Ready!');