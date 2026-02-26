import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import { duplicateTank } from '../database.js';

export class DuplicateTankDialog extends Adw.Dialog {
    static {
        GObject.registerClass({
            GTypeName: 'DuplicateTankDialog',
            Signals: {
                'tank-duplicated': {},
            },
        }, this);
    }

    _init(parentWindow, sourceTank) {
        this._sourceTank = sourceTank;
        super._init({
            title: 'Duplicate Tank',
            content_width: 400,
            content_height: 480,
        });

        this._setupUI();
    }

    _setupUI() {
        const toolbarView = new Adw.ToolbarView();
        const headerBar = new Adw.HeaderBar({
            title_widget: new Gtk.Label({ label: 'Duplicate Tank', css_classes: ['title'] }),
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
        this._nameEntry = new Adw.EntryRow({
            title: 'New Tank Name',
            text: `${this._sourceTank.name} (2)`
        });
        group.add(this._nameEntry);

        const descLabel = new Gtk.Label({
            label: 'The tank attributes are automatically duplicated.',
            css_classes: ['dim-label', 'body'],
            halign: Gtk.Align.START,
            margin_top: 12,
            margin_bottom: 12
        });
        mainBox.append(group);
        mainBox.append(descLabel);

        const optGroup = new Adw.PreferencesGroup({ title: 'Optional Data' });

        this._paramsCheck = new Gtk.CheckButton({ active: true });
        this._tasksCheck = new Gtk.CheckButton({ active: true });
        this._livestockCheck = new Gtk.CheckButton({ active: false });

        const pRow = new Adw.ActionRow({ title: 'Parameters' });
        pRow.add_prefix(this._paramsCheck);
        pRow.set_activatable_widget(this._paramsCheck);

        const tRow = new Adw.ActionRow({ title: 'Tasks' });
        tRow.add_prefix(this._tasksCheck);
        tRow.set_activatable_widget(this._tasksCheck);

        const lRow = new Adw.ActionRow({ title: 'Inhabitants' });
        lRow.add_prefix(this._livestockCheck);
        lRow.set_activatable_widget(this._livestockCheck);

        optGroup.add(pRow);
        optGroup.add(tRow);
        optGroup.add(lRow);

        mainBox.append(optGroup);

        const actionBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 12,
            halign: Gtk.Align.END,
            margin_top: 24,
        });

        const cancelBtn = new Gtk.Button({ label: 'Cancel' });
        cancelBtn.connect('clicked', () => this.close());

        const dupBtn = new Gtk.Button({ label: 'Duplicate', css_classes: ['suggested-action'] });
        dupBtn.connect('clicked', () => this._onDuplicate());

        actionBox.append(cancelBtn);
        actionBox.append(dupBtn);
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

    _onDuplicate() {
        const newName = this._nameEntry.text;
        if (!newName) return;

        const opts = {
            parameters: this._paramsCheck.active,
            tasks: this._tasksCheck.active,
            livestock: this._livestockCheck.active
        };

        const newId = duplicateTank(this._sourceTank.id, newName, opts);
        if (newId) {
            this.close();
            this.emit('tank-duplicated');
        } else {
            console.error('[DuplicateTankDialog] Failed to duplicate tank');
        }
    }
}
