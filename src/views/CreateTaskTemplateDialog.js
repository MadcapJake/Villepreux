import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import * as DB from '../database.js';

export const CreateTaskTemplateDialog = GObject.registerClass(
    {
        Signals: {
            'task-created': {},
        },
    },
    class CreateTaskTemplateDialog extends Adw.Dialog {
        _init(parentWindow, tank) {
            super._init({
                title: 'Add Task',
                content_width: 500,
                content_height: 500,
            });

            this.tank = tank;
            this._setupUI();
        }

        _setupUI() {
            const clamp = new Adw.Clamp({
                maximum_size: 450,
                margin_start: 12,
                margin_end: 12,
                margin_top: 24,
                margin_bottom: 24,
            });

            const mainBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 12,
            });

            const group = new Adw.PreferencesGroup({
                title: 'Task Details',
            });

            // Category Dropdown (Simple model)
            const catList = ['Maintenance', 'Water Change', 'Dosing', 'Feeding', 'Miscellaneous'];
            const catModel = Gtk.StringList.new(catList);
            this.catDrop = new Adw.ComboRow({
                title: 'Category',
                model: catModel,
            });
            group.add(this.catDrop);

            // Title
            this.titleEntry = new Adw.EntryRow({
                title: 'Title',
                text: '',
            });
            group.add(this.titleEntry);

            // Instructions
            this.instEntry = new Adw.EntryRow({
                title: 'Instructions (Optional)',
                text: '',
            });
            group.add(this.instEntry);

            mainBox.append(group);

            // Schedule Group
            const schedGroup = new Adw.PreferencesGroup({
                title: 'Schedule details',
            });

            // Type
            const schedList = ['Interval_Days', 'One_Off'];
            const schedModel = Gtk.StringList.new(schedList);
            this.schedDrop = new Adw.ComboRow({
                title: 'Schedule Type',
                model: schedModel,
            });
            schedGroup.add(this.schedDrop);

            // Interval Value
            this.intervalSpin = new Adw.SpinRow({
                title: 'Interval (Days)',
                adjustment: new Gtk.Adjustment({
                    lower: 1,
                    upper: 365,
                    step_increment: 1,
                    value: 7
                }),
                numeric: true
            });
            schedGroup.add(this.intervalSpin);

            // Toggle interval spinner visibility based on combo selection
            this.schedDrop.connect('notify::selected', () => {
                const isInterval = this.schedDrop.selected === 0;
                this.intervalSpin.visible = isInterval;
            });

            // Start Date
            this.startEntry = new Adw.EntryRow({
                title: 'First Due Date (YYYY-MM-DD)',
                text: new Date().toISOString().split('T')[0],
            });
            schedGroup.add(this.startEntry);

            mainBox.append(schedGroup);

            // Actions
            const actionBox = new Gtk.Box({
                orientation: Gtk.Orientation.HORIZONTAL,
                spacing: 12,
                halign: Gtk.Align.END,
                margin_top: 24,
            });

            const cancelBtn = new Gtk.Button({ label: 'Cancel' });
            cancelBtn.connect('clicked', () => this.close());

            const saveBtn = new Gtk.Button({
                label: 'Save',
                css_classes: ['suggested-action'],
            });
            saveBtn.connect('clicked', () => this._onSave());

            actionBox.append(cancelBtn);
            actionBox.append(saveBtn);

            mainBox.append(actionBox);

            clamp.set_child(mainBox);

            const scroll = new Gtk.ScrolledWindow({
                hscrollbar_policy: Gtk.PolicyType.NEVER,
                vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
            });
            scroll.set_child(clamp);

            this.set_child(scroll);
        }

        _onSave() {
            const title = this.titleEntry.get_text();
            if (!title) return; // Prevent empty tasks

            const catList = ['Maintenance', 'Water Change', 'Dosing', 'Feeding', 'Miscellaneous'];
            const schedList = ['Interval_Days', 'One_Off'];

            const payload = {
                tank_id: this.tank.id,
                category: catList[this.catDrop.selected],
                title: title,
                instructions: this.instEntry.get_text(),
                schedule_type: schedList[this.schedDrop.selected],
                interval_value: this.schedDrop.selected === 0 ? this.intervalSpin.get_value() : null,
                next_due_date: this.startEntry.get_text() || new Date().toISOString().split('T')[0]
            };

            DB.upsertTaskTemplate(payload);

            this.emit('task-created');
            this.close();
        }
    }
);
