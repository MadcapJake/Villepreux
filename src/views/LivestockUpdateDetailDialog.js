import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import * as DB from '../database.js';
import { ImageHandler } from '../utils/image_handler.js';

export class LivestockUpdateDetailDialog extends Adw.Dialog {
    static {
        GObject.registerClass({
            GTypeName: 'LivestockUpdateDetailDialog',
            Signals: {
                'update-deleted': {},
            },
        }, this);
    }

    _init(parent, livestock, updateData) {
        super._init({
            title: `${livestock.name || 'Inhabitant'} Update`,
            content_width: 500,
            content_height: 600,
        });

        this.livestock = livestock;
        this.updateData = updateData;
        this._setupUI();
    }

    _setupUI() {
        const toolbarView = new Adw.ToolbarView();

        const closeBtn = new Gtk.Button({ label: 'Close' });
        closeBtn.connect('clicked', () => this.close());

        const headerBar = new Adw.HeaderBar({
            title_widget: new Gtk.Label({
                label: `${this.livestock.name} Update ${this.updateData.log_date}`,
                css_classes: ['title', 'weight-bold']
            }),
            show_end_title_buttons: false,
            show_start_title_buttons: false
        });
        headerBar.pack_end(closeBtn);

        toolbarView.add_top_bar(headerBar);

        const clamp = new Adw.Clamp({
            maximum_size: 600,
            margin_start: 24,
            margin_end: 24,
            margin_top: 24,
            margin_bottom: 24,
        });

        const mainBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 24,
        });

        // 1. Image
        if (this.updateData.image_filename) {
            const fullPath = ImageHandler.getImagePath(this.updateData.image_filename);
            const pic = Gtk.Picture.new();
            pic.set_content_fit(Gtk.ContentFit.CONTAIN);
            pic.can_shrink = true;
            pic.hexpand = true;
            pic.height_request = 300;
            pic.set_filename(fullPath);
            pic.css_classes = ['card'];

            mainBox.append(pic);
        }

        // 2. Measurements
        let measureText = '';
        if (this.updateData.measurable1 !== null && this.livestock.measurable1_label) {
            measureText += `${this.livestock.measurable1_label}: ${this.updateData.measurable1} ${this.livestock.measurable1_unit || ''}\n`;
        }
        if (this.updateData.measurable2 !== null && this.livestock.measurable2_label) {
            measureText += `${this.livestock.measurable2_label}: ${this.updateData.measurable2} ${this.livestock.measurable2_unit || ''}\n`;
        }

        if (measureText.trim().length > 0) {
            const measureLbl = new Gtk.Label({
                label: measureText.trim(),
                css_classes: ['numeric', 'heading'],
                halign: Gtk.Align.START,
                justify: Gtk.Justification.LEFT
            });
            mainBox.append(measureLbl);
        }

        // 3. Note
        if (this.updateData.note) {
            const noteLbl = new Gtk.Label({
                label: this.updateData.note,
                wrap: true,
                halign: Gtk.Align.START,
                valign: Gtk.Align.START,
                justify: Gtk.Justification.LEFT,
                css_classes: ['body']
            });
            mainBox.append(noteLbl);
        } else if (!this.updateData.image_filename && measureText.trim().length === 0) {
            const emptyLbl = new Gtk.Label({
                label: 'No details provided for this update.',
                css_classes: ['dim-label']
            });
            mainBox.append(emptyLbl);
        }

        // 4. Delete Button
        const deleteGroup = new Adw.PreferencesGroup();
        const deleteBtn = new Gtk.Button({
            label: 'Delete Update',
            css_classes: ['destructive-action'],
            halign: Gtk.Align.CENTER
        });

        deleteBtn.connect('clicked', () => {
            const confirmDialog = new Adw.MessageDialog({
                heading: 'Delete Update',
                body: 'Are you sure you want to permanently delete this timeline update?',
            });
            if (this.get_root()) {
                confirmDialog.transient_for = this.get_root();
            }
            confirmDialog.add_response('cancel', 'Cancel');
            confirmDialog.add_response('delete', 'Delete');
            confirmDialog.set_response_appearance('delete', Adw.ResponseAppearance.DESTRUCTIVE);

            confirmDialog.connect('response', (dlg, response) => {
                if (response === 'delete') {
                    DB.deleteLivestockUpdate(this.updateData.id);
                    this.emit('update-deleted');
                    this.close();
                }
            });
            confirmDialog.present(this.get_root());
        });

        deleteGroup.add(deleteBtn);
        mainBox.append(deleteGroup);

        clamp.set_child(mainBox);

        const scroll = new Gtk.ScrolledWindow({
            hscrollbar_policy: Gtk.PolicyType.NEVER,
            vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
        });
        scroll.set_child(clamp);

        toolbarView.set_content(scroll);
        this.set_child(toolbarView);
    }
}
