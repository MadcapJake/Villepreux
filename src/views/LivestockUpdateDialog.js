import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';

import * as DB from '../database.js';
import { ImageHandler } from '../utils/image_handler.js';

export class LivestockUpdateDialog extends Adw.Dialog {
    static {
        GObject.registerClass({
            GTypeName: 'LivestockUpdateDialog',
            Signals: {
                'update-logged': {},
            },
        }, this);
    }

    _init(livestock) {
        super._init({
            title: 'Log Update',
            content_width: 500,
            content_height: 600,
        });

        this.livestock = livestock;
        this.updateData = {
            livestock_id: livestock.id,
            log_date: new Date().toISOString().split('T')[0],
            note: '',
            image_filename: '',
            measurable1: null,
            measurable2: null
        };

        this._setupUI();
    }

    _setupUI() {
        const toolbarView = new Adw.ToolbarView();

        const cancelBtn = new Gtk.Button({ label: 'Cancel' });
        cancelBtn.connect('clicked', () => this.close());

        const saveBtn = new Gtk.Button({
            label: 'Save',
            css_classes: ['suggested-action'],
        });
        saveBtn.connect('clicked', () => this._onSave());

        const headerBar = new Adw.HeaderBar({
            title_widget: new Gtk.Label({ label: 'Log Update', css_classes: ['title', 'weight-bold'] }),
            show_end_title_buttons: false,
            show_start_title_buttons: false
        });
        headerBar.pack_start(cancelBtn);
        headerBar.pack_end(saveBtn);

        toolbarView.add_top_bar(headerBar);

        const page = new Adw.PreferencesPage();

        const group = new Adw.PreferencesGroup();

        // 1. Date Selection
        const dateRow = new Adw.ActionRow({
            title: 'Date',
            subtitle: this.updateData.log_date,
        });

        const calendar = new Gtk.Calendar({
            show_week_numbers: false,
            show_day_names: true,
            show_heading: true,
        });

        const calendarPopover = new Gtk.Popover({ child: calendar });
        const dateBtn = new Gtk.MenuButton({
            icon_name: 'x-office-calendar-symbolic',
            valign: Gtk.Align.CENTER,
            popover: calendarPopover,
            css_classes: ['flat'],
        });

        calendar.connect('day-selected', () => {
            const date = calendar.get_date();
            const dateStr = date.format('%Y-%m-%d');
            this.updateData.log_date = dateStr;
            dateRow.subtitle = dateStr;
            calendarPopover.popdown();
        });

        dateRow.add_suffix(dateBtn);
        dateRow.activatable_widget = dateBtn;
        group.add(dateRow);

        // 2. Image Attachment
        const imgRow = new Adw.ActionRow({
            title: 'Photo',
        });
        const selectFileBtn = new Gtk.Button({
            label: 'Select File...',
            valign: Gtk.Align.CENTER,
        });

        const previewPic = Gtk.Picture.new();
        previewPic.set_content_fit(Gtk.ContentFit.COVER);
        previewPic.height_request = 48;
        previewPic.width_request = 48;
        previewPic.can_shrink = true;
        previewPic.visible = false;
        previewPic.css_classes = ['card'];
        previewPic.margin_end = 12;

        const imgBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 6,
            valign: Gtk.Align.CENTER
        });
        imgBox.append(previewPic);
        imgBox.append(selectFileBtn);

        imgRow.add_suffix(imgBox);

        selectFileBtn.connect('clicked', () => {
            const dialog = new Gtk.FileDialog({ title: 'Select Update Photo' });
            const filter = new Gtk.FileFilter();
            filter.add_mime_type('image/jpeg');
            filter.add_mime_type('image/png');
            filter.add_mime_type('image/webp');

            const filterList = Gio.ListStore.new(Gtk.FileFilter);
            filterList.append(filter);
            dialog.set_filters(filterList);

            dialog.open(this.get_root(), null, (source, res) => {
                try {
                    const file = dialog.open_finish(res);
                    const newFilename = ImageHandler.importImage(file);
                    this.updateData.image_filename = newFilename;

                    selectFileBtn.label = file.get_basename();
                    const fullPath = ImageHandler.getImagePath(newFilename);
                    previewPic.set_filename(fullPath);
                    previewPic.visible = true;
                } catch (e) {
                    if (!e.matches(Gtk.DialogError, Gtk.DialogError.DISMISSED)) {
                        console.error('File open failed:', e);
                    }
                }
            });
        });
        group.add(imgRow);

        // 3. Measurements (Conditional)
        if (this.livestock.measurable1_label) {
            const m1Row = new Adw.EntryRow({
                title: this.livestock.measurable1_label,
                input_purpose: Gtk.InputPurpose.NUMBER,
            });
            if (this.livestock.measurable1_unit) {
                const suffix = new Gtk.Label({ label: this.livestock.measurable1_unit, margin_start: 12, margin_end: 12, css_classes: ['dim-label'] });
                m1Row.add_suffix(suffix);
            }
            m1Row.connect('notify::text', () => {
                const val = parseFloat(m1Row.text);
                this.updateData.measurable1 = isNaN(val) ? null : val;
            });
            group.add(m1Row);
        }

        if (this.livestock.measurable2_label) {
            const m2Row = new Adw.EntryRow({
                title: this.livestock.measurable2_label,
                input_purpose: Gtk.InputPurpose.NUMBER,
            });
            if (this.livestock.measurable2_unit) {
                const suffix = new Gtk.Label({ label: this.livestock.measurable2_unit, margin_start: 12, margin_end: 12, css_classes: ['dim-label'] });
                m2Row.add_suffix(suffix);
            }
            m2Row.connect('notify::text', () => {
                const val = parseFloat(m2Row.text);
                this.updateData.measurable2 = isNaN(val) ? null : val;
            });
            group.add(m2Row);
        }

        page.add(group);

        // 4. Notes
        const notesGroup = new Adw.PreferencesGroup({ title: 'Notes' });

        const textBuffer = new Gtk.TextBuffer();
        const textView = new Gtk.TextView({
            buffer: textBuffer,
            wrap_mode: Gtk.WrapMode.WORD_CHAR,
            height_request: 120,
            margin_start: 12,
            margin_end: 12,
            margin_top: 12,
            margin_bottom: 12,
            css_classes: ['view']
        });

        // Adw does not have an AdwTextViewRow out of the box in some common versions,
        // so we wrap a TextView in a frame/clamp within the group.
        const frame = new Gtk.Frame({
            child: textView,
            css_classes: ['view'],
            margin_top: 6
        });

        textBuffer.connect('changed', () => {
            const start = textBuffer.get_start_iter();
            const end = textBuffer.get_end_iter();
            this.updateData.note = textBuffer.get_text(start, end, false);
        });

        notesGroup.add(frame);
        page.add(notesGroup);

        toolbarView.set_content(page);
        this.set_child(toolbarView);
    }

    _onSave() {
        if (DB.insertLivestockUpdate(this.updateData)) {
            this.emit('update-logged');
            this.close();
        } else {
            console.error('Failed to save update');
            // Normally show a toast or error dialog here
        }
    }
}
