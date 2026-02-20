import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import GLib from 'gi://GLib';

import * as DB from '../database.js';

export const LogSingleParameterDialog = GObject.registerClass(
    {
        Signals: {
            'parameter-logged': {},
        }
    },
    class LogSingleParameterDialog extends Adw.Window {
        _init(parentWindow, tank, def) {
            super._init({
                transient_for: parentWindow,
                modal: true,
                title: `Log ${def.name}`,
                default_width: 400,
                default_height: 300,
            });

            this.tank = tank;
            this.def = def;
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

            this._saveBtn = new Gtk.Button({
                label: 'Save',
                css_classes: ['suggested-action']
            });
            this._saveBtn.connect('clicked', () => this._onSave());
            headerBar.pack_end(this._saveBtn);

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

            const today = GLib.DateTime.new_now_local();
            this._currentDateStr = today.format('%Y-%m-%d');

            this._dateRow = new Adw.ActionRow({
                title: 'Date Logged',
                subtitle: this._currentDateStr,
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
            this._dateRow.activatable_widget = dateBtn;

            dateGroup.add(this._dateRow);
            mainBox.append(dateGroup);

            // Value Group
            const valueGroup = new Adw.PreferencesGroup({ title: 'Result' });
            this._valueRow = new Adw.EntryRow({
                title: this.def.name,
                input_purpose: Gtk.InputPurpose.NUMBER,
            });

            const validateInputs = () => {
                this._saveBtn.sensitive = !!(this._valueRow.text && this._valueRow.text.trim() !== '');
            };

            this._valueRow.connect('notify::text', () => validateInputs());
            validateInputs();

            if (this.def.unit) {
                const unitLabel = new Gtk.Label({
                    label: this.def.unit,
                    css_classes: ['dim-label'],
                    valign: Gtk.Align.CENTER,
                    margin_end: 12,
                });
                this._valueRow.add_suffix(unitLabel);
            }

            valueGroup.add(this._valueRow);
            mainBox.append(valueGroup);

            clamp.set_child(mainBox);
            scroll.set_child(clamp);
            toolbarView.set_content(scroll);
            this.set_content(toolbarView);
        }

        _onSave() {
            const dateStr = this._currentDateStr;
            const valStr = this._valueRow.text;
            const normalizedStr = valStr.replace(',', '.');
            if (normalizedStr) {
                const value = parseFloat(normalizedStr);
                if (!isNaN(value)) {
                    DB.insertParameter(this.tank.id, this.def.name, value, dateStr);
                }
            }

            this.emit('parameter-logged');
            this.close();
        }
    }
);
