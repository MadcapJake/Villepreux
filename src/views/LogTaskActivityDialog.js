import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import GLib from 'gi://GLib';
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
            const toolbarView = new Adw.ToolbarView();

            const headerBar = new Adw.HeaderBar({
                title_widget: new Gtk.Label({ label: `${this.actionStr} Task`, css_classes: ['title'] }),
                show_end_title_buttons: false,
                show_start_title_buttons: false
            });

            const cancelBtn = new Gtk.Button({ label: 'Cancel' });
            cancelBtn.connect('clicked', () => this.close());
            headerBar.pack_start(cancelBtn);

            const saveBtn = new Gtk.Button({
                label: 'Save',
                css_classes: ['suggested-action'],
            });
            saveBtn.connect('clicked', () => this._onSave());
            headerBar.pack_end(saveBtn);

            toolbarView.add_top_bar(headerBar);

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

            // Date & Time Picker using Gtk.Calendar
            const now = GLib.DateTime.new_now_local();
            const todayStr = now.format('%Y-%m-%d');
            this._currentDateStr = todayStr;

            this.dateRow = new Adw.ActionRow({
                title: 'Date Logged',
                subtitle: todayStr,
            });

            const calendar = new Gtk.Calendar({
                show_week_numbers: false,
                show_day_names: true,
                show_heading: true,
            });

            const calendarPopover = new Gtk.Popover({
                child: calendar,
            });

            const dateBtn = new Gtk.MenuButton({
                icon_name: 'x-office-calendar-symbolic',
                valign: Gtk.Align.CENTER,
                popover: calendarPopover,
                css_classes: ['flat'],
            });

            calendar.connect('day-selected', () => {
                const date = calendar.get_date();
                this._currentDateStr = date.format('%Y-%m-%d');
                this.dateRow.subtitle = this._currentDateStr;
                calendarPopover.popdown();
            });

            this.dateRow.add_suffix(dateBtn);
            this.dateRow.activatable_widget = dateBtn;

            headerGroup.add(this.dateRow);

            // Notes
            this.notesEntry = new Adw.EntryRow({
                title: 'Notes',
            });
            this.notesEntry.set_text('');

            headerGroup.add(this.notesEntry);
            mainBox.append(headerGroup);

            clamp.set_child(mainBox);

            const scroll = new Gtk.ScrolledWindow({
                hscrollbar_policy: Gtk.PolicyType.NEVER,
                vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
            });
            scroll.set_child(clamp);

            toolbarView.set_content(scroll);

            this.set_child(toolbarView);
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
            const execDateStr = this._currentDateStr || new Date().toISOString().split('T')[0];
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
