import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import { createTank } from '../database.js';

export class AddTankDialog extends Adw.Window {
    static {
        GObject.registerClass({
            GTypeName: 'AddTankDialog',
            Signals: {
                'tank-added': {},
            },
        }, this);
    }

    _init(parentWindow) {
        super._init({
            transient_for: parentWindow,
            modal: true,
            title: 'Add New Tank',
            default_width: 400,
            default_height: 500,
            content: new Adw.ToolbarView(),
        });

        this._setupUI();
    }

    _setupUI() {
        const header = new Adw.HeaderBar();
        header.add_css_class('flat');

        const content = this.content;
        content.add_top_bar(header);

        // Cancel Button
        const cancelBtn = new Gtk.Button({ label: 'Cancel' });
        cancelBtn.connect('clicked', () => this.close());
        header.pack_start(cancelBtn);

        // Add Button
        const addBtn = new Gtk.Button({ label: 'Add', css_classes: ['suggested-action'] });
        addBtn.connect('clicked', () => this._onAdd());
        header.pack_end(addBtn);

        // Form
        const page = new Adw.PreferencesPage();
        const group = new Adw.PreferencesGroup();
        page.add(group);

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

        // Setup Date (Using simple entry for now, or Adw.ActionRow with calendar popover later)
        // For MVP, just a text entry or maybe today's date default
        this._dateEntry = new Adw.EntryRow({ title: 'Setup Date', text: new Date().toISOString().split('T')[0] });
        group.add(this._dateEntry);

        content.set_content(page);
    }

    _onAdd() {
        const name = this._nameEntry.text;
        const volume = parseFloat(this._volumeEntry.text);
        const typeIndex = this._typeRow.selected;
        const type = ['Freshwater', 'Saltwater', 'Brackish'][typeIndex];
        const date = this._dateEntry.text;

        if (!name) {
            // Show error toast?
            return;
        }

        // Call database
        try {
            createTank({ name, volume, type, setupDate: date });
            this.close();
            // Emit signal or callback to refresh main window?
            // The main window should listen to database changes or we pass a callback.
            this.emit('tank-added');
        } catch (e) {
            console.error(e);
        }
    }
}
