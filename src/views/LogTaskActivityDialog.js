import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import * as DB from '../database.js';

export const LogTaskActivityDialog = GObject.registerClass(
    {
        Signals: {
            'activity-logged': {},
        },
    },
    class LogTaskActivityDialog extends Adw.Dialog {
        _init(parentWindow, template, actionStr) {
            super._init({
                title: `${actionStr} Task`,
                content_width: 500,
                content_height: 400,
            });

            this.template = template;
            this.actionStr = actionStr;

            this._setupUI();
        }

        _setupUI() {
            const clamp = new Adw.Clamp({
                maximum_size: 450,
                margin_start: 12,
                margin_end: 12,
                margin_top: 24,
                margin_bottom: 24,
            });

            const mainBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 12,
            });

            // Header Group
            const headerGroup = new Adw.PreferencesGroup({
                title: 'Activity Details',
            });

            // Read-Only Template Title
            const nameRow = new Adw.ActionRow({
                title: 'Task Name',
                subtitle: this.template.title,
            });
            headerGroup.add(nameRow);

            // Date & Time Picker (Simple EntryRow for now due to GTK4 constraints, or Calendar)
            // Flatpak GTK4 often relies on custom widgets for full DateTime.
            // We'll use an EntryRow that defaults to today's date YYYY-MM-DD for now.
            const today = new Date().toISOString().split('T')[0];

            this.dateEntry = new Adw.EntryRow({
                title: 'Date Logged',
                text: today,
            });
            headerGroup.add(this.dateEntry);

            // Notes
            this.notesEntry = new Adw.EntryRow({
                title: 'Notes',
            });
            this.notesEntry.set_text('');

            // GTK TextView allows multi-line if needed, but EntryRow is cleaner for small notes.
            // Let's use standard EntryRow since we are in Adw.

            headerGroup.add(this.notesEntry);
            mainBox.append(headerGroup);


            // Dialog Actions (Footer or Header buttons)
            // We will use standard Gtk Buttons in a Box at the bottom.
            const actionBox = new Gtk.Box({
                orientation: Gtk.Orientation.HORIZONTAL,
                spacing: 12,
                halign: Gtk.Align.END,
                margin_top: 24,
            });

            const cancelBtn = new Gtk.Button({ label: 'Cancel' });
            cancelBtn.connect('clicked', () => this.close());

            const saveBtn = new Gtk.Button({
                label: 'Save',
                css_classes: ['suggested-action'],
            });
            saveBtn.connect('clicked', () => this._onSave());

            actionBox.append(cancelBtn);
            actionBox.append(saveBtn);

            mainBox.append(actionBox);

            clamp.set_child(mainBox);

            const scroll = new Gtk.ScrolledWindow({
                hscrollbar_policy: Gtk.PolicyType.NEVER,
                vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
            });
            scroll.set_child(clamp);

            this.set_child(scroll);
        }

        _calculateNextDueDate(executionDateStr) {
            // Re-calculate based on template schedule
            const scheduleType = this.template.schedule_type; // 'Interval_Days', 'Specific_Days_Of_Week'
            const interval = this.template.interval_value || 0;

            const execDate = new Date(`${executionDateStr}T00:00:00`);

            if (scheduleType === 'Interval_Days' && interval > 0) {
                // strict interval calculated from actual execution date
                execDate.setDate(execDate.getDate() + interval);
                return execDate.toISOString().split('T')[0];
            } else if (scheduleType === 'One_Off') {
                return null;
            } else if (scheduleType === 'Fixed_Weekly') {
                // Snap to next occurrence of that day
                // Simplified for now, just advancing days by 7
                // Future: Complex specific days of week logic.
                execDate.setDate(execDate.getDate() + 7);
                return execDate.toISOString().split('T')[0];
            }

            // Fallback
            execDate.setDate(execDate.getDate() + interval);
            return execDate.toISOString().split('T')[0];
        }

        _onSave() {
            const execDateStr = this.dateEntry.get_text() || new Date().toISOString().split('T')[0];
            const notes = this.notesEntry.get_text() || '';

            // Calculate next due date
            const nextDueStr = this._calculateNextDueDate(execDateStr);

            // Write to DB
            DB.logTaskActivity(this.template.id, this.actionStr, notes, execDateStr, nextDueStr);

            this.emit('activity-logged');
            this.close();
        }
    }
);
