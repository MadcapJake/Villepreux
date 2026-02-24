import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import * as DB from '../database.js';

export const PastActivitiesDialog = GObject.registerClass(
    class PastActivitiesDialog extends Adw.Dialog {
        _init(parent, template) {
            super._init({
                title: 'Past Activities',
                content_width: 500,
                content_height: 500,
            });

            this.template = template;
            this._setupUI();
        }

        _setupUI() {
            const toolbarView = new Adw.ToolbarView();

            const headerBar = new Adw.HeaderBar({
                title_widget: new Gtk.Label({ label: `Prior ${this.template.title} Activities`, css_classes: ['title'] }),
                show_end_title_buttons: false,
                show_start_title_buttons: false
            });

            const closeBtn = new Gtk.Button({
                icon_name: 'window-close-symbolic',
                css_classes: ['flat']
            });
            closeBtn.connect('clicked', () => this.close());
            headerBar.pack_end(closeBtn);

            toolbarView.add_top_bar(headerBar);

            const clamp = new Adw.Clamp({
                maximum_size: 600,
                margin_top: 24,
                margin_bottom: 24,
                margin_start: 12,
                margin_end: 12,
            });

            this.mainBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 24,
            });

            this.listGroup = new Adw.PreferencesGroup();

            this.mainBox.append(this.listGroup);

            clamp.set_child(this.mainBox);

            const scroll = new Gtk.ScrolledWindow({
                hscrollbar_policy: Gtk.PolicyType.NEVER,
                vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
            });
            scroll.set_child(clamp);

            toolbarView.set_content(scroll);
            this.set_child(toolbarView);

            this._refreshData();
        }

        _refreshData() {
            // Re-create the list group to safely clear all logic
            if (this.listGroup) {
                this.mainBox.remove(this.listGroup);
            }

            this.listGroup = new Adw.PreferencesGroup();
            this.mainBox.append(this.listGroup);

            const activities = DB.getTaskActivities(this.template.id);

            if (activities.length === 0) {
                const empty = new Adw.ActionRow({
                    title: 'No past activities recorded.',
                });
                this.listGroup.add(empty);
                return;
            }

            activities.forEach(act => {
                const row = new Adw.ActionRow({
                    title: act.execution_date,
                    subtitle: `${act.action_taken}${act.notes ? ' - ' + act.notes : ''}`,
                });

                const delBtn = new Gtk.Button({
                    icon_name: 'user-trash-symbolic',
                    css_classes: ['flat', 'destructive-action'],
                    valign: Gtk.Align.CENTER,
                    tooltip_text: 'Delete Activity'
                });

                delBtn.connect('clicked', () => {
                    DB.deleteTaskActivity(act.id);
                    this._refreshData();
                });

                row.add_suffix(delBtn);
                this.listGroup.add(row);
            });
        }
    }
);
