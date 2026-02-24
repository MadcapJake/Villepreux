import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import * as DB from '../database.js';

export const CopyTaskDialog = GObject.registerClass(
    {
        Signals: {
            'task-copied': {},
        }
    },
    class CopyTaskDialog extends Adw.Dialog {
        _init(parent, template) {
            super._init({
                title: 'Copy Task',
                content_width: 450,
                content_height: 400,
            });

            this.template = template;
            this._setupUI();
        }

        _setupUI() {
            const toolbarView = new Adw.ToolbarView();

            const headerBar = new Adw.HeaderBar({
                title_widget: new Gtk.Label({ label: 'Copy Task to...', css_classes: ['title'] }),
                show_end_title_buttons: false,
                show_start_title_buttons: false
            });

            const cancelBtn = new Gtk.Button({ label: 'Cancel' });
            cancelBtn.connect('clicked', () => this.close());
            headerBar.pack_start(cancelBtn);

            const copyBtn = new Gtk.Button({
                label: 'Copy',
                css_classes: ['suggested-action'],
            });
            headerBar.pack_end(copyBtn);

            toolbarView.add_top_bar(headerBar);

            const clamp = new Adw.Clamp({
                maximum_size: 400,
                margin_start: 12,
                margin_end: 12,
                margin_top: 24,
                margin_bottom: 24,
            });

            const mainBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 12,
            });

            // Note Banner
            const noteLabel = new Gtk.Label({
                label: 'No prior activities will be copied, just the task details.',
                wrap: true,
                halign: Gtk.Align.START,
                css_classes: ['dim-label'],
                margin_bottom: 12
            });
            mainBox.append(noteLabel);

            // Tanks List
            const tanksGroup = new Adw.PreferencesGroup({
                title: 'Select Destination Tank',
            });

            const tanks = DB.getTanks();
            let selectedTankId = null;
            let rows = [];

            // We only show tanks that are NOT the current tank.
            const otherTanks = tanks.filter(t => t.id !== this.template.tank_id);

            if (otherTanks.length === 0) {
                const emptyRow = new Adw.ActionRow({
                    title: 'No other tanks available.',
                });
                tanksGroup.add(emptyRow);
                copyBtn.sensitive = false;
            } else {
                otherTanks.forEach((tank, index) => {
                    const row = new Adw.ActionRow({
                        title: tank.name,
                        subtitle: `${tank.volume}g ${tank.type}`,
                        activatable: true,
                    });

                    const checkImg = new Gtk.Image({
                        icon_name: 'object-select-symbolic',
                        visible: false,
                    });
                    row.add_suffix(checkImg);

                    row.connect('activated', () => {
                        selectedTankId = tank.id;
                        rows.forEach(r => r.check.visible = false);
                        checkImg.visible = true;
                        copyBtn.sensitive = true;
                    });

                    rows.push({ row, check: checkImg });
                    tanksGroup.add(row);
                });
                copyBtn.sensitive = false; // Disabled until selection
            }

            mainBox.append(tanksGroup);

            clamp.set_child(mainBox);

            const scroll = new Gtk.ScrolledWindow({
                hscrollbar_policy: Gtk.PolicyType.NEVER,
                vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
            });
            scroll.set_child(clamp);

            toolbarView.set_content(scroll);
            this.set_child(toolbarView);

            // Action Connection
            copyBtn.connect('clicked', () => {
                if (selectedTankId) {
                    DB.copyTaskTemplate(this.template.id, selectedTankId);
                    this.emit('task-copied');
                    this.close();
                }
            });
        }
    }
);
