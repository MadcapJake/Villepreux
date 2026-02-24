import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import * as DB from '../database.js';
import { LogTaskActivityDialog } from './LogTaskActivityDialog.js';
import { CreateTaskTemplateDialog } from './CreateTaskTemplateDialog.js';
import { PastActivitiesDialog } from './PastActivitiesDialog.js';
import { CopyTaskDialog } from './CopyTaskDialog.js';
import { getTaskCategoryIcon } from '../utils/icons.js';

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
            this.emptyStateAdded = true;

            // Archived section
            this.archiveGroup = new Adw.PreferencesGroup({
                margin_top: 24,
            });
            this.archiveExpander = new Adw.ExpanderRow({
                title: 'Archived Tasks',
                icon_name: 'user-trash-full-symbolic',
            });
            this.archiveGroup.add(this.archiveExpander);
            this.add(this.archiveGroup);
            this.archiveAdded = true;
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

            // Temporarily remove empty state and archive group to manage order
            if (this.emptyStateAdded) {
                this.remove(this.emptyStateGroup);
                this.emptyStateAdded = false;
            }
            if (this.archiveAdded) {
                this.remove(this.archiveGroup);
                this.archiveAdded = false;
            }

            const templates = DB.getTaskTemplates(this.tank.id);
            const archivedTemplates = DB.getArchivedTaskTemplates(this.tank.id);

            // Hide/Show empty state
            if (templates.length === 0 && archivedTemplates.length === 0) {
                this.emptyStateGroup.visible = true;
                this.add(this.emptyStateGroup);
                this.emptyStateAdded = true;

                this.archiveGroup.visible = false;
                this.add(this.archiveGroup);
                this.archiveAdded = true;
                return;
            }

            this.emptyStateGroup.visible = templates.length === 0;
            if (this.emptyStateGroup.visible) {
                this.add(this.emptyStateGroup);
                this.emptyStateAdded = true;
            }

            // Group Active by category
            templates.forEach(t => {
                const cat = t.category || 'Miscellaneous';
                if (!this.groups[cat]) {
                    this.groups[cat] = new Adw.PreferencesGroup({
                        title: cat,
                    });

                    const headerIcon = new Gtk.Image({
                        icon_name: getTaskCategoryIcon(cat),
                        css_classes: ['dim-label'],
                        margin_bottom: 12
                    });
                    this.groups[cat].set_header_suffix(headerIcon);

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
                    icon_name: 'running-symbolic',
                    css_classes: ['circular', 'suggested-action'],
                    valign: Gtk.Align.CENTER,
                    tooltip_text: 'Perform Task',
                });
                performBtn.connect('clicked', () => this._handleAction(t, 'Performed'));

                const skipBtn = new Gtk.Button({
                    icon_name: 'media-skip-forward-symbolic',
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

                // Add Menu Popover for extra actions
                const menuButton = new Gtk.MenuButton({
                    icon_name: 'open-menu-symbolic',
                    css_classes: ['flat'],
                    valign: Gtk.Align.CENTER,
                    tooltip_text: 'Task Options'
                });

                const popover = new Gtk.Popover();
                popover.add_css_class('menu');
                const popoverBox = new Gtk.Box({
                    orientation: Gtk.Orientation.VERTICAL,
                    spacing: 0,
                    margin_top: 6, margin_bottom: 6, margin_start: 6, margin_end: 6
                });

                const pastActivitiesBtn = new Gtk.Button({ label: 'Past Activities', css_classes: ['flat'] });
                pastActivitiesBtn.connect('clicked', () => {
                    popover.popdown();
                    this._showPastActivities(t);
                });

                const copyBtn = new Gtk.Button({ label: 'Copy to...', css_classes: ['flat'] });
                copyBtn.connect('clicked', () => {
                    popover.popdown();
                    this._showCopyTaskDialog(t);
                });

                const archiveBtn = new Gtk.Button({ label: 'Archive Task', css_classes: ['flat'] });
                archiveBtn.connect('clicked', () => {
                    popover.popdown();
                    DB.archiveTaskTemplate(t.id);
                    this.refreshData();
                });

                const deleteBtn = new Gtk.Button({ label: 'Delete Task', css_classes: ['flat', 'destructive-action'] });
                deleteBtn.connect('clicked', () => {
                    popover.popdown();
                    this._confirmDeleteTask(t);
                });

                popoverBox.append(pastActivitiesBtn);
                popoverBox.append(copyBtn);
                popoverBox.append(archiveBtn);
                popoverBox.append(deleteBtn);
                popover.set_child(popoverBox);
                menuButton.set_popover(popover);

                cfgRow.add_suffix(menuButton);

                row.add_row(cfgRow);

                this.groups[cat].add(row);
            });

            // Populate Archived Section
            if (archivedTemplates.length === 0) {
                this.archiveGroup.visible = false;
            } else {
                this.archiveGroup.visible = true;

                // If we can't cleanly clear an ExpanderRow, it's safer to recreate it.
                this.archiveGroup.remove(this.archiveExpander);
                this.archiveExpander = new Adw.ExpanderRow({
                    title: 'Archived Tasks',
                    icon_name: 'drawer-symbolic',
                });
                this.archiveGroup.add(this.archiveExpander);

                archivedTemplates.forEach(t => {
                    const row = new Adw.ActionRow({
                        title: t.title,
                        subtitle: t.category,
                    });

                    const restoreBtn = new Gtk.Button({
                        icon_name: 'archive-extract-symbolic',
                        css_classes: ['flat'],
                        valign: Gtk.Align.CENTER,
                        tooltip_text: 'Restore Task'
                    });
                    restoreBtn.connect('clicked', () => {
                        DB.restoreTaskTemplate(t.id);
                        this.refreshData();
                    });

                    const delBtn = new Gtk.Button({
                        icon_name: 'edit-delete-symbolic',
                        css_classes: ['flat', 'destructive-action'],
                        valign: Gtk.Align.CENTER,
                        tooltip_text: 'Delete Permanently'
                    });
                    delBtn.connect('clicked', () => {
                        this._confirmDeleteTask(t);
                    });

                    const box = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 6 });
                    box.append(restoreBtn);
                    box.append(delBtn);

                    row.add_suffix(box);
                    this.archiveExpander.add_row(row);
                });
            }

            // Always add archive group at the very end
            this.add(this.archiveGroup);
            this.archiveAdded = true;
        }

        _handleAction(template, actionStr) {
            const rootWindow = this.get_root();
            const dialog = new LogTaskActivityDialog(rootWindow, template, actionStr);
            dialog.connect('activity-logged', () => {
                this.refreshData();
            });
            dialog.present(rootWindow);
        }

        _confirmDeleteTask(template) {
            const rootWindow = this.get_root();
            const dialog = new Adw.AlertDialog({
                heading: 'Delete Task?',
                body: `Are you sure you want to delete '${template.title}' and all previously completed activities for this task?`,
            });
            dialog.add_response('cancel', 'Cancel');
            dialog.add_response('delete', 'Delete');
            dialog.set_response_appearance('delete', Adw.ResponseAppearance.DESTRUCTIVE);

            dialog.connect('response', (dlg, response) => {
                if (response === 'delete') {
                    DB.permanentlyDeleteTaskTemplate(template.id);
                    this.refreshData();
                }
            });

            dialog.present(rootWindow);
        }

        _showPastActivities(template) {
            const rootWindow = this.get_root();
            const dialog = new PastActivitiesDialog(rootWindow, template);
            dialog.present(rootWindow);
        }

        _showCopyTaskDialog(template) {
            const rootWindow = this.get_root();
            const dialog = new CopyTaskDialog(rootWindow, template);
            dialog.connect('task-copied', () => {
                const toast = new Adw.Toast({ title: 'Task copied successfully' });
                const appWindow = this.get_root().get_application().active_window;
                if (appWindow && appWindow.addToast) {
                    appWindow.addToast(toast);
                } else {
                    console.error("Could not find addToast on main window");
                }
            });
            dialog.present(rootWindow);
        }
    }
);
