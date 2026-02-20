import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import GLib from 'gi://GLib';
import * as DB from '../database.js';

export const LogParameterDialog = GObject.registerClass(
    {
        Signals: {
            'parameters-logged': {},
        },
    },
    class LogParameterDialog extends Adw.Window {
        _init(parentWindow, tank) {
            super._init({
                transient_for: parentWindow,
                modal: true,
                title: 'Log Test Results',
                default_width: 400,
                default_height: 500,
            });

            this.tank = tank;
            this._setupUI();
        }

        _setupUI() {
            const toolbarView = new Adw.ToolbarView();
            const headerBar = new Adw.HeaderBar({
                show_end_title_buttons: false,
                show_start_title_buttons: false
            });

            const cancelBtn = new Gtk.Button({ label: 'Cancel' });
            cancelBtn.connect('clicked', () => this.close());
            headerBar.pack_start(cancelBtn);

            const saveBtn = new Gtk.Button({
                label: 'Save',
                css_classes: ['suggested-action']
            });
            saveBtn.connect('clicked', () => this._onSave());
            headerBar.pack_end(saveBtn);

            toolbarView.add_top_bar(headerBar);

            const scroll = new Gtk.ScrolledWindow({
                hscrollbar_policy: Gtk.PolicyType.NEVER,
            });

            const clamp = new Adw.Clamp({
                maximum_size: 400,
                margin_top: 24,
                margin_bottom: 24,
                margin_start: 12,
                margin_end: 12,
            });

            const mainBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 24,
            });

            // Date Group
            const dateGroup = new Adw.PreferencesGroup({ title: 'Date' });

            const now = GLib.DateTime.new_now_local();
            const todayStr = now.format('%Y-%m-%d');

            this._dateEntry = new Adw.EntryRow({
                title: 'Date Logged',
                text: todayStr,
            });
            dateGroup.add(this._dateEntry);
            mainBox.append(dateGroup);

            // Parameters Group
            const paramGroup = new Adw.PreferencesGroup({
                title: 'Results',
                description: 'Leave blank to skip'
            });

            this._paramEntries = [];
            const defs = DB.getParameterDefinitions(this.tank.id);

            if (defs.length === 0) {
                const emptyRow = new Adw.ActionRow({
                    title: 'No Parameters Configured',
                    subtitle: 'Add parameters in the dashboard first.'
                });
                paramGroup.add(emptyRow);
                saveBtn.sensitive = false; // Cannot save if no parameters
            } else {
                defs.forEach(def => {
                    const row = new Adw.EntryRow({
                        title: `${def.name} (${def.unit})`,
                        input_purpose: Gtk.InputPurpose.NUMBER,
                    });
                    paramGroup.add(row);
                    this._paramEntries.push({ def, row });
                });
            }

            mainBox.append(paramGroup);
            clamp.set_child(mainBox);
            scroll.set_child(clamp);
            toolbarView.set_content(scroll);

            this.set_content(toolbarView);
        }

        _onSave() {
            const dateStr = this._dateEntry.text;

            this._paramEntries.forEach(item => {
                const valStr = item.row.text;
                // Replace commas with dots if user typed them
                const normalizedStr = valStr.replace(',', '.');
                if (normalizedStr) {
                    const value = parseFloat(normalizedStr);
                    if (!isNaN(value)) {
                        DB.insertParameter(this.tank.id, item.def.name, value, dateStr);
                    }
                }
            });

            this.emit('parameters-logged');
            this.close();
        }
    }
);
