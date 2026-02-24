import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import * as DB from '../database.js';
import { LogTaskActivityDialog } from './LogTaskActivityDialog.js';
import { CreateTaskTemplateDialog } from './CreateTaskTemplateDialog.js';

export const TaskView = GObject.registerClass(
    class TaskView extends Adw.PreferencesPage {
        _init(tank) {
            super._init({
                title: 'Tasks',
                icon_name: 'checkbox-checked-symbolic',
            });
            this.tank = tank;

            this.groups = {};

            this._setupUI();
            this.refreshData();
        }

        _setupUI() {
            // Empty state
            this.emptyStateGroup = new Adw.PreferencesGroup({ visible: false });
            this.emptyState = new Adw.StatusPage({
                title: 'No Tasks',
                description: 'Schedule your first maintenance task.',
                icon_name: 'checkbox-symbolic',
            });
            this.emptyStateGroup.add(this.emptyState);
            this.add(this.emptyStateGroup);
        }

        openCreateTaskDialog() {
            const rootWindow = this.get_root();
            const dialog = new CreateTaskTemplateDialog(rootWindow, this.tank);
            dialog.connect('task-created', () => {
                this.refreshData();
            });
            dialog.present(rootWindow);
        }

        refreshData() {
            // Clear existing groups
            for (const key in this.groups) {
                this.remove(this.groups[key]);
            }
            this.groups = {};

            const templates = DB.getTaskTemplates(this.tank.id);

            if (templates.length === 0) {
                this.emptyStateGroup.visible = true;
                return;
            }

            this.emptyStateGroup.visible = false;

            // Group by category
            templates.forEach(t => {
                const cat = t.category || 'Miscellaneous';
                if (!this.groups[cat]) {
                    this.groups[cat] = new Adw.PreferencesGroup({ title: cat });
                    this.add(this.groups[cat]);
                }

                // Create the row
                const row = new Adw.ExpanderRow({
                    title: t.title,
                    subtitle: `Due: ${t.next_due_date}`,
                });

                if (new Date(t.next_due_date) < new Date()) {
                    row.add_css_class('error'); // Make row text red if overdue
                }

                // Add Actions
                const performBtn = new Gtk.Button({
                    icon_name: 'object-select-symbolic',
                    css_classes: ['circular', 'suggested-action'],
                    valign: Gtk.Align.CENTER,
                    tooltip_text: 'Perform Task',
                });
                performBtn.connect('clicked', () => this._handleAction(t, 'Performed'));

                const skipBtn = new Gtk.Button({
                    icon_name: 'window-close-symbolic',
                    css_classes: ['circular', 'destructive-action'],
                    valign: Gtk.Align.CENTER,
                    margin_start: 6,
                    tooltip_text: 'Skip Task',
                });
                skipBtn.connect('clicked', () => this._handleAction(t, 'Skipped'));

                row.add_action(performBtn);
                row.add_action(skipBtn);

                // Expanded content (instructions, historical config, edit/delete)
                if (t.instructions) {
                    const insRow = new Adw.ActionRow({
                        title: 'Instructions',
                        subtitle: t.instructions,
                        subtitle_lines: 0 // allow wrap
                    });
                    row.add_row(insRow);
                }

                const cfgRow = new Adw.ActionRow({
                    title: 'Schedule',
                    subtitle: `${t.schedule_type} (${t.interval_value || 'N/A'})`
                });

                // Add Delete to expanded content
                const delBtn = new Gtk.Button({
                    icon_name: 'user-trash-symbolic',
                    css_classes: ['flat', 'destructive-action'],
                    valign: Gtk.Align.CENTER,
                });
                delBtn.connect('clicked', () => {
                    DB.deleteTaskTemplate(t.id);
                    this.refreshData();
                });
                cfgRow.add_suffix(delBtn);

                row.add_row(cfgRow);

                this.groups[cat].add(row);
            });
        }

        _handleAction(template, actionStr) {
            const rootWindow = this.get_root();
            const dialog = new LogTaskActivityDialog(rootWindow, template, actionStr);
            dialog.connect('activity-logged', () => {
                this.refreshData();
            });
            dialog.present(rootWindow);
        }
    }
);
