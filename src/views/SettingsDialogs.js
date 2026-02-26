import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import { getSetting, setSetting } from '../database.js';

export const ThemeDialog = GObject.registerClass(
    class ThemeDialog extends Adw.Dialog {
        _init(parentWindow) {
            super._init({
                title: 'Theme Settings',
                content_width: 350,
                content_height: 350,
            });

            this._selectedTheme = getSetting('theme', 'System');

            const toolbarView = new Adw.ToolbarView();
            const headerBar = new Adw.HeaderBar({
                title_widget: new Gtk.Label({ label: 'Theme', css_classes: ['title'] }),
                show_end_title_buttons: false,
                show_start_title_buttons: false
            });
            toolbarView.add_top_bar(headerBar);

            const prefGroup = new Adw.PreferencesGroup();

            const systemRow = new Adw.ActionRow({ title: 'System Default', activatable: true });
            const lightRow = new Adw.ActionRow({ title: 'Light', activatable: true });
            const darkRow = new Adw.ActionRow({ title: 'Dark', activatable: true });

            const updateCheckmarks = () => {
                systemRow.set_icon_name(this._selectedTheme === 'System' ? 'object-select-symbolic' : null);
                lightRow.set_icon_name(this._selectedTheme === 'Light' ? 'object-select-symbolic' : null);
                darkRow.set_icon_name(this._selectedTheme === 'Dark' ? 'object-select-symbolic' : null);
            };

            systemRow.connect('activated', () => { this._selectedTheme = 'System'; updateCheckmarks(); });
            lightRow.connect('activated', () => { this._selectedTheme = 'Light'; updateCheckmarks(); });
            darkRow.connect('activated', () => { this._selectedTheme = 'Dark'; updateCheckmarks(); });

            updateCheckmarks();

            prefGroup.add(systemRow);
            prefGroup.add(lightRow);
            prefGroup.add(darkRow);

            const mainBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 24,
            });
            mainBox.append(prefGroup);

            const actionBox = new Gtk.Box({
                orientation: Gtk.Orientation.HORIZONTAL,
                spacing: 12,
                halign: Gtk.Align.END,
                margin_top: 24,
            });
            const cancelBtn = new Gtk.Button({ label: 'Cancel' });
            cancelBtn.connect('clicked', () => this.close());
            const saveBtn = new Gtk.Button({ label: 'Save', css_classes: ['suggested-action'] });
            saveBtn.connect('clicked', () => {
                setSetting('theme', this._selectedTheme);
                const styleManager = Adw.StyleManager.get_default();
                if (this._selectedTheme === 'System') {
                    styleManager.set_color_scheme(Adw.ColorScheme.DEFAULT);
                } else if (this._selectedTheme === 'Light') {
                    styleManager.set_color_scheme(Adw.ColorScheme.FORCE_LIGHT);
                } else if (this._selectedTheme === 'Dark') {
                    styleManager.set_color_scheme(Adw.ColorScheme.FORCE_DARK);
                }
                this.close();
            });

            actionBox.append(cancelBtn);
            actionBox.append(saveBtn);
            mainBox.append(actionBox);

            const clamp = new Adw.Clamp({
                maximum_size: 400,
                margin_top: 24,
                margin_bottom: 24,
                margin_start: 12,
                margin_end: 12,
                child: mainBox
            });

            toolbarView.set_content(clamp);
            this.set_child(toolbarView);
        }
    }
);

export const DateTimeFormatDialog = GObject.registerClass(
    class DateTimeFormatDialog extends Adw.Dialog {
        _init(parentWindow) {
            super._init({
                title: 'Date & Time Format',
                content_width: 350,
                content_height: 480,
            });

            this._selectedFormat = getSetting('date_format', 'YYYY-MM-DD');
            this._selectedAMPM = getSetting('use_ampm', 'false') === 'true';

            const toolbarView = new Adw.ToolbarView();
            const headerBar = new Adw.HeaderBar({
                title_widget: new Gtk.Label({ label: 'Date & Time', css_classes: ['title'] }),
                show_end_title_buttons: false,
                show_start_title_buttons: false
            });
            toolbarView.add_top_bar(headerBar);

            const mainBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 24,
            });

            const dateGroup = new Adw.PreferencesGroup({ title: 'Date Format' });
            const formats = ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY', 'Mon DD, YYYY'];
            const rows = [];

            const updateCheckmarks = () => {
                rows.forEach(r => {
                    r.row.set_icon_name(r.format === this._selectedFormat ? 'object-select-symbolic' : null);
                });
            };

            formats.forEach(f => {
                const row = new Adw.ActionRow({ title: f, activatable: true });
                row.connect('activated', () => {
                    this._selectedFormat = f;
                    updateCheckmarks();
                });
                rows.push({ row, format: f });
                dateGroup.add(row);
            });
            updateCheckmarks();
            mainBox.append(dateGroup);

            const timeGroup = new Adw.PreferencesGroup({ title: 'Time Format' });
            const ampmCheck = new Gtk.Switch({
                valign: Gtk.Align.CENTER,
                active: this._selectedAMPM
            });
            ampmCheck.connect('notify::active', () => {
                this._selectedAMPM = ampmCheck.active;
            });
            const ampmRow = new Adw.ActionRow({ title: 'Use AM/PM Time', activatable: true });
            ampmRow.add_suffix(ampmCheck);
            ampmRow.connect('activated', () => {
                ampmCheck.active = !ampmCheck.active;
            });
            timeGroup.add(ampmRow);
            mainBox.append(timeGroup);

            const actionBox = new Gtk.Box({
                orientation: Gtk.Orientation.HORIZONTAL,
                spacing: 12,
                halign: Gtk.Align.END,
                margin_top: 24,
            });

            const cancelBtn = new Gtk.Button({ label: 'Cancel' });
            cancelBtn.connect('clicked', () => this.close());

            const saveBtn = new Gtk.Button({ label: 'Save', css_classes: ['suggested-action'] });
            saveBtn.connect('clicked', () => {
                setSetting('date_format', this._selectedFormat);
                setSetting('use_ampm', this._selectedAMPM ? 'true' : 'false');
                this.close();
            });

            actionBox.append(cancelBtn);
            actionBox.append(saveBtn);
            mainBox.append(actionBox);

            const clamp = new Adw.Clamp({
                maximum_size: 400,
                margin_top: 24,
                margin_bottom: 24,
                margin_start: 12,
                margin_end: 12,
                child: mainBox
            });

            const scroll = new Gtk.ScrolledWindow({
                hscrollbar_policy: Gtk.PolicyType.NEVER,
                child: clamp
            });

            toolbarView.set_content(scroll);
            this.set_child(toolbarView);
        }
    }
);
