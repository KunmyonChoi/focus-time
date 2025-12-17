class TaskManager {
    constructor() {
        this.tasks = [];
        this.STORAGE_KEY = 'focusTimerTasks';
        this.init();
    }

    init() {
        this.loadTasks();
    }

    loadTasks() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
            try {
                this.tasks = JSON.parse(saved);
            } catch (e) {
                console.error('Failed to load tasks', e);
                this.tasks = [];
            }
        }
    }

    saveTasks() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.tasks));
        this.notifyUpdate();
    }

    notifyUpdate() {
        // Dispatch custom event for UI updates
        const event = new CustomEvent('tasks-updated', { detail: { tasks: this.tasks } });
        document.dispatchEvent(event);
    }

    addTask(text) {
        if (!text.trim()) return;
        const newTask = {
            id: Date.now().toString(),
            text: text.trim(),
            done: false,
            focusTime: 0,
            completedAt: null,
            createdAt: Date.now()
        };
        this.tasks.push(newTask);
        this.saveTasks();
        return newTask;
    }

    removeTask(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.saveTasks();
    }

    toggleTask(id, duration = 0) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.done = !task.done;
            if (task.done) {
                task.focusTime = duration;
                task.completedAt = Date.now();
            } else {
                task.focusTime = 0;
                task.completedAt = null;
            }
            this.saveTasks();
        }
    }

    reorderTasks(fromIndex, toIndex) {
        if (fromIndex < 0 || fromIndex >= this.tasks.length || toIndex < 0 || toIndex >= this.tasks.length) return;

        const [movedTask] = this.tasks.splice(fromIndex, 1);
        this.tasks.splice(toIndex, 0, movedTask);
        this.saveTasks();
    }

    getTasks() {
        return this.tasks;
    }

    getTodayTotalTime() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return this.tasks
            .filter(t => t.done && t.completedAt >= today.getTime())
            .reduce((total, t) => total + (t.focusTime || 0), 0);
    }

    getActiveTask() {
        return this.tasks.find(t => !t.done);
    }

    getNextTask() {
        // Returns the task after the active one, or null
        const activeIndex = this.tasks.findIndex(t => !t.done);
        if (activeIndex !== -1 && activeIndex + 1 < this.tasks.length) {
            return this.tasks[activeIndex + 1];
        }
        return null;
    }

    completeCurrentTask(duration = 0) {
        const current = this.tasks.find(t => !t.done);
        if (current) {
            current.done = true;
            current.focusTime = duration;
            current.completedAt = Date.now();
            this.saveTasks();
            return current;
        }
        return null;
    }

    // Move a task to a specific index (helper for drag and drop)
    moveTask(id, newIndex) {
        const index = this.tasks.findIndex(t => t.id === id);
        if (index !== -1) {
            this.reorderTasks(index, newIndex);
        }
    }

    getProgress() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.done).length;
        return { total, completed };
    }
}

// Export for module usage, or attach to window for simple script inclusion
window.TaskManager = TaskManager;
