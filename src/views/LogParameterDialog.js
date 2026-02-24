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
    class LogParameterDialog extends Adw.Dialog {
        _init(parentWindow, tank) {
            super._init({
                title: 'Log Test Results',
                content_width: 400,
                content_height: 500,
            });

            this.tank = tank;
            this._setupUI();
        }

        _setupUI() {
            const toolbarView = new Adw.ToolbarView();
            const headerBar = new Adw.HeaderBar({
                title_widget: new Gtk.Label({ label: 'Add Bulk Test Results', css_classes: ['title'] }),
                show_end_title_buttons: false,
                show_start_title_buttons: false
            });
            toolbarView.add_top_bar(headerBar);

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
            this._currentDateStr = todayStr;

            this._dateRow = new Adw.ActionRow({
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
                this._dateRow.subtitle = this._currentDateStr;
                calendarPopover.popdown();
            });

            this._dateRow.add_suffix(dateBtn);

            // Make row clicking also toggle popover
            this._dateRow.activatable_widget = dateBtn;

            dateGroup.add(this._dateRow);
            mainBox.append(dateGroup);

            // Parameters Group
            const paramGroup = new Adw.PreferencesGroup({
                title: 'Results',
            });

            this._paramEntries = [];
            const defs = DB.getParameterDefinitions(this.tank.id);

            const actionBox = new Gtk.Box({
                orientation: Gtk.Orientation.HORIZONTAL,
                spacing: 12,
                halign: Gtk.Align.END,
                margin_top: 24,
            });

            const cancelBtn = new Gtk.Button({ label: 'Cancel' });
            cancelBtn.connect('clicked', () => this.close());

            this._saveBtn = new Gtk.Button({
                label: 'Save',
                css_classes: ['suggested-action']
            });
            this._saveBtn.connect('clicked', () => this._onSave());

            actionBox.append(cancelBtn);
            actionBox.append(this._saveBtn);

            const validateInputs = () => {
                // At least one field required
                let anyFilled = false;
                this._paramEntries.forEach(item => {
                    if (item.row.text && item.row.text.trim() !== '') {
                        anyFilled = true;
                    }
                });
                this._saveBtn.sensitive = anyFilled;
            };

            if (defs.length === 0) {
                const emptyRow = new Adw.ActionRow({
                    title: 'No Parameters Configured',
                    subtitle: 'Add parameters in the dashboard first.'
                });
                paramGroup.add(emptyRow);
                this._saveBtn.sensitive = false; // Cannot save if no parameters
            } else {
                defs.forEach(def => {
                    const row = new Adw.EntryRow({
                        title: `${def.name} (${def.unit})`,
                        input_purpose: Gtk.InputPurpose.NUMBER,
                    });

                    row.connect('notify::text', () => validateInputs());

                    paramGroup.add(row);
                    this._paramEntries.push({ def, row });
                });
                // Initial validation
                validateInputs();
            }

            mainBox.append(paramGroup);
            mainBox.append(actionBox);

            validateInputs();

            clamp.set_child(mainBox);

            const scroll = new Gtk.ScrolledWindow({
                hscrollbar_policy: Gtk.PolicyType.NEVER,
                vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
            });
            scroll.set_child(clamp);

            toolbarView.set_content(scroll);
            this.set_child(toolbarView);
        }

        _onSave() {
            const dateStr = this._currentDateStr;

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
