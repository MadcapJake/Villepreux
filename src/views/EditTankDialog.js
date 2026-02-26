import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import { createTank, updateTank } from '../database.js';

export class EditTankDialog extends Adw.Dialog {
    static {
        GObject.registerClass({
            GTypeName: 'EditTankDialog',
            Signals: {
                'tank-saved': {},
            },
        }, this);
    }

    _init(parentWindow, tank = null) {
        this._tank = tank;
        super._init({
            title: tank ? 'Edit Tank' : 'Add New Tank',
            content_width: 400,
            content_height: 500,
        });

        this._setupUI();
    }

    _setupUI() {
        const toolbarView = new Adw.ToolbarView();
        const headerBar = new Adw.HeaderBar({
            title_widget: new Gtk.Label({ label: this._tank ? 'Edit Tank' : 'Add Tank', css_classes: ['title'] }),
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

        const group = new Adw.PreferencesGroup();

        // Name
        this._nameEntry = new Adw.EntryRow({ title: 'Tank Name' });
        group.add(this._nameEntry);

        // Volume
        this._volumeEntry = new Adw.EntryRow({ title: 'Volume (Liters)', input_purpose: Gtk.InputPurpose.NUMBER });
        group.add(this._volumeEntry);

        // Type
        this._typeRow = new Adw.ComboRow({
            title: 'Water Type',
            model: new Gtk.StringList({ strings: ['Freshwater', 'Saltwater', 'Brackish'] }),
        });
        group.add(this._typeRow);

        // Setup Date
        this._dateEntry = new Adw.EntryRow({ title: 'Setup Date', text: new Date().toISOString().split('T')[0] });
        group.add(this._dateEntry);

        if (this._tank) {
            this._nameEntry.text = this._tank.name;
            this._volumeEntry.text = this._tank.volume.toString();
            this._dateEntry.text = this._tank.setupDate;
            const types = ['Freshwater', 'Saltwater', 'Brackish'];
            this._typeRow.selected = Math.max(0, types.indexOf(this._tank.type));
        }

        mainBox.append(group);

        const actionBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 12,
            halign: Gtk.Align.END,
            margin_top: 24,
        });

        const cancelBtn = new Gtk.Button({ label: 'Cancel' });
        cancelBtn.connect('clicked', () => this.close());
        const addBtn = new Gtk.Button({ label: this._tank ? 'Save' : 'Add', css_classes: ['suggested-action'] });
        addBtn.connect('clicked', () => this._onSave());

        actionBox.append(cancelBtn);
        actionBox.append(addBtn);
        mainBox.append(actionBox);

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
        const name = this._nameEntry.text;
        const volume = parseFloat(this._volumeEntry.text) || 0;
        const typeIndex = this._typeRow.selected;
        const type = ['Freshwater', 'Saltwater', 'Brackish'][typeIndex];
        const date = this._dateEntry.text;

        if (!name) {
            return;
        }

        try {
            if (this._tank) {
                updateTank(this._tank.id, { name, volume, type, setupDate: date });
            } else {
                createTank({ name, volume, type, setupDate: date });
            }
            this.close();
            this.emit('tank-saved');
        } catch (e) {
            console.error(e);
        }
    }
}
