import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import * as DB from './database.js';
import { getTaskCategoryIcon } from './utils/icons.js';

class NotificationService {
    constructor() {
        this._app = null;
        this._notifiedTasks = new Set();
        this._timerId = null;
    }

    init(app) {
        this._app = app;
        console.log('[NotificationService] Initializing time tracker...');

        // Set up application-wide notification actions
        const snoozeAction = new Gio.SimpleAction({ name: 'snooze-task', parameter_type: GLib.VariantType.new('s') });
        snoozeAction.connect('activate', (action, param) => this._onSnooze(param.unpack()));
        this._app.add_action(snoozeAction);

        const ignoreAction = new Gio.SimpleAction({ name: 'ignore-task', parameter_type: GLib.VariantType.new('s') });
        ignoreAction.connect('activate', (action, param) => this._onIgnore(param.unpack()));
        this._app.add_action(ignoreAction);

        const skipAction = new Gio.SimpleAction({ name: 'skip-task', parameter_type: GLib.VariantType.new('s') });
        skipAction.connect('activate', (action, param) => this._onSkip(param.unpack()));
        this._app.add_action(skipAction);

        const performAction = new Gio.SimpleAction({ name: 'perform-task', parameter_type: GLib.VariantType.new('s') });
        performAction.connect('activate', (action, param) => this._onPerform(param.unpack()));
        this._app.add_action(performAction);

        // Run the checker every 60 seconds
        this._timerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 60, () => {
            this._checkTasks();
            return GLib.SOURCE_CONTINUE;
        });

        // Run once immediately
        this._checkTasks();
    }

    _checkTasks() {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        const currentHour = String(now.getHours()).padStart(2, '0');
        const currentMin = String(now.getMinutes()).padStart(2, '0');
        const currentTimeStr = `${currentHour}:${currentMin}`;

        const tasksInfo = DB.getTasksByDate(todayStr); // Returns { due: [], activities: [] }

        for (const task of tasksInfo.due) {
            // Task is due today. Does it have a notification time?
            if (task.notification_time) {
                // If it's time to notify (or past time, but we haven't notified yet today)
                if (currentTimeStr >= task.notification_time && !this._notifiedTasks.has(task.id)) {
                    this._sendNotification(task);
                }
            }
        }
    }

    _sendNotification(task) {
        console.log(`[NotificationService] Sending notification for task: ${task.title}`);

        const notification = new Gio.Notification();
        notification.set_title(`Task Due: ${task.title}`);
        notification.set_body(`Tank: ${task.tank_name}`);

        const iconName = getTaskCategoryIcon(task.category);
        const icon = Gio.ThemedIcon.new(`io.github.madcapjake.Villepreux-${iconName}`);
        notification.set_icon(icon);

        // Pass the task ID as string parameter to the actions
        const taskIdStr = String(task.id);

        notification.add_button('Snooze (15m)', `app.snooze-task::${taskIdStr}`);
        notification.add_button('Ignore', `app.ignore-task::${taskIdStr}`);
        notification.add_button('Skip', `app.skip-task::${taskIdStr}`);
        notification.add_button('Perform', `app.perform-task::${taskIdStr}`);

        // Default action (clicking the notification body)
        notification.set_default_action(`app.perform-task::${taskIdStr}`);

        // Send to system
        this._app.send_notification(`villepreux-task-${task.id}`, notification);

        // Mark as notified in memory so we don't spam them constantly while the app is open
        this._notifiedTasks.add(task.id);
    }

    _onSnooze(taskIdStr) {
        console.log(`[NotificationService] Snoozed task ${taskIdStr}`);
        const id = parseInt(taskIdStr, 10);
        // Remove from notified list so it can trigger again
        this._notifiedTasks.delete(id);

        // Find task to update its notification time to +15m
        // We'll just grab the date's tasks to find the full object
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        const tasksInfo = DB.getTasksByDate(todayStr);
        const task = tasksInfo.due.find(t => t.id === id);

        if (task && task.notification_time) {
            // Add 15m to current time
            const snoozeTime = new Date();
            snoozeTime.setMinutes(snoozeTime.getMinutes() + 15);

            const newHour = String(snoozeTime.getHours()).padStart(2, '0');
            const newMin = String(snoozeTime.getMinutes()).padStart(2, '0');

            // This requires a full DB update to persist the new time, but since 
            // the NotificationService operates on the daily 'due' array, this ensures 
            // the next check won't fire until the new time is reached.
            const updatedTask = { ...task, notification_time: `${newHour}:${newMin}` };
            DB.upsertTaskTemplate(updatedTask);
        }
    }

    _onIgnore(taskIdStr) {
        console.log(`[NotificationService] Ignored task ${taskIdStr}`);
        // Already in the _notifiedTasks set, so it won't fire again today.
        // We can optionally clear the system notification to be safe.
        this._app.withdraw_notification(`villepreux-task-${taskIdStr}`);
    }

    _onSkip(taskIdStr) {
        console.log(`[NotificationService] Skip requested for task ${taskIdStr}`);
        this._app.withdraw_notification(`villepreux-task-${taskIdStr}`);
        this._navigateToTaskDialog(parseInt(taskIdStr, 10), 'Skipped');
    }

    _onPerform(taskIdStr) {
        console.log(`[NotificationService] Perform requested for task ${taskIdStr}`);
        this._app.withdraw_notification(`villepreux-task-${taskIdStr}`);
        this._navigateToTaskDialog(parseInt(taskIdStr, 10), 'Performed');
    }

    _navigateToTaskDialog(taskId, initialAction) {
        // Bring app to foreground
        const window = this._app.active_window;
        if (!window) return;
        window.present();

        // We need to find the tank ID to switch the view
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const tasksInfo = DB.getTasksByDate(todayStr);
        const taskMeta = tasksInfo.due.find(t => t.id === taskId);

        if (taskMeta && window._onTankSelected) {
            const tanks = DB.getTanks();
            const tank = tanks.find(t => t.id === taskMeta.tank_id);
            if (tank) {
                // Switch window context to this tank
                window._onTankSelected(tank);
                // Switch to Tasks tab
                if (window._contentView.content.stack) {
                    window._contentView.content.stack.set_visible_child_name('tasks');

                    // The dashboard creates the TaskView. We need a reference.
                    const taskView = window._contentView.content.stack.get_child_by_name('tasks');
                    if (taskView && typeof taskView._handleAction === 'function') {
                        // The TaskView relies on the full task template object from the DB, not just the abbreviated metadata
                        const fullTemplates = DB.getTaskTemplates(tank.id);
                        const fullTask = fullTemplates.find(t => t.id === taskId);
                        if (fullTask) {
                            GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                                taskView._handleAction(fullTask, initialAction);
                                return GLib.SOURCE_REMOVE;
                            });
                        }
                    }
                }
            }
        }
    }
}

// Export a singleton instance
export const notificationService = new NotificationService();
