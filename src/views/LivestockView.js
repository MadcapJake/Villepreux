import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import * as DB from '../database.js';

export const LivestockView = GObject.registerClass(
    class LivestockView extends Adw.Bin {
        _init(tank) {
            super._init();
            this.tank = tank;

            this._navView = new Adw.NavigationView();

            // --- Root Page ---
            const rootPage = new Adw.NavigationPage({
                title: 'Livestock',
                tag: 'root',
            });

            const scroll = new Gtk.ScrolledWindow({
                hscrollbar_policy: Gtk.PolicyType.NEVER,
            });

            const clamp = new Adw.Clamp({
                maximum_size: 1000,
                margin_top: 24,
                margin_bottom: 24,
                margin_start: 12,
                margin_end: 12,
            });

            const mainBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 24,
            });

            // Livestock Grid
            this._flowBox = new Gtk.FlowBox({
                valign: Gtk.Align.START,
                min_children_per_line: 1,
                max_children_per_line: 10,
                selection_mode: Gtk.SelectionMode.NONE,
                column_spacing: 12,
                row_spacing: 12,
            });

            this._refreshGrid();

            mainBox.append(this._flowBox);
            clamp.set_child(mainBox);
            scroll.set_child(clamp);
            rootPage.set_child(scroll);

            this._navView.add(rootPage);
            this.set_child(this._navView);
        }

        get navigationView() {
            return this._navView;
        }

        _refreshGrid() {
            this._flowBox.remove_all();

            const items = DB.getLivestock(this.tank.id);

            items.forEach(item => {
                const card = this._createFishCard(item);
                this._flowBox.append(card);
            });

            // "Add Fish" Card
            const addCard = this._createAddCard();
            this._flowBox.append(addCard);
        }

        _createFishCard(item) {
            const button = new Gtk.Button({
                css_classes: ['card'],
            });

            const card = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 0,
            });

            // Image Area
            // Use a frame or placeholder if no image
            const imageArea = new Gtk.DrawingArea({
                height_request: 120,
                width_request: 160,
                css_classes: ['card-image-area'], // Custom CSS class needed?
            });
            // TODO: Load real image if item.image_path exists

            // Content
            const contentBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 6,
                css_classes: ['p-12'],
            });

            const nameLabel = new Gtk.Label({
                label: item.name || 'Unnamed',
                css_classes: ['heading'],
                halign: Gtk.Align.START,
            });

            const subLabel = new Gtk.Label({
                label: item.scientific_name || item.type || 'Unknown Species',
                css_classes: ['caption', 'dim-label'],
                halign: Gtk.Align.START,
            });

            contentBox.append(nameLabel);
            contentBox.append(subLabel);

            card.append(imageArea);
            card.append(contentBox);

            button.set_child(card);

            button.connect('clicked', () => {
                this._navigateToDetail(item);
            });

            return button;
        }

        _createAddCard() {
            const button = new Gtk.Button({
                css_classes: ['card'],
                height_request: 200,
                width_request: 180,
            });

            const card = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 12,
                css_classes: ['p-12'],
                valign: Gtk.Align.CENTER,
                halign: Gtk.Align.CENTER,
            });

            const icon = new Gtk.Image({
                icon_name: 'list-add-symbolic',
                pixel_size: 48,
                css_classes: ['dim-label'],
                halign: Gtk.Align.CENTER,
            });

            const label = new Gtk.Label({
                label: 'Add Inhabitant',
                css_classes: ['heading', 'dim-label'],
                halign: Gtk.Align.CENTER,
            });

            card.append(icon);
            card.append(label);
            button.set_child(card);

            button.connect('clicked', () => {
                this._navigateToDetail({
                    tank_id: this.tank.id,
                    name: '',
                    scientific_name: '',
                    type: '',
                    introduced_date: '',
                    quantity: 1,
                    source: '',
                    purchase_date: '',
                    cost: 0,
                    notes: '',
                    status: 'Alive'
                });
            });
            return button;
        }

        _navigateToDetail(item) {
            const isNew = !item.id;
            const detailPage = new Adw.NavigationPage({
                title: isNew ? 'New Inhabitant' : item.name,
                tag: 'detail',
            });

            const scroll = new Gtk.ScrolledWindow({
                hscrollbar_policy: Gtk.PolicyType.NEVER,
            });

            const clamp = new Adw.Clamp({
                maximum_size: 800,
                margin_top: 24,
                margin_bottom: 24,
                margin_start: 12,
                margin_end: 12,
            });

            const mainBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 24,
            });

            // --- Header / Image ---
            // Placeholder for image upload
            const imgBox = new Gtk.Box({
                height_request: 200,
                css_classes: ['card'], // style it like a card
                halign: Gtk.Align.FILL,
            });
            const imgLabel = new Gtk.Label({
                label: 'Tap to add photo',
                halign: Gtk.Align.CENTER,
                valign: Gtk.Align.CENTER,
                hexpand: true,
            });
            imgBox.append(imgLabel);
            mainBox.append(imgBox);

            // --- Save Button ---
            const saveBtn = new Gtk.Button({
                label: 'Save',
                valign: Gtk.Align.CENTER,
                css_classes: ['flat'],
                visible: false,
            });

            const edits = { ...item };

            const onEdit = () => { saveBtn.visible = true; };

            saveBtn.connect('clicked', () => {
                if (!edits.name) edits.name = 'Unnamed';

                try {
                    DB.upsertLivestock(edits);
                    this._refreshGrid();
                    this._navView.pop();
                } catch (e) {
                    console.error("Save livestock failed", e);
                }
            });


            const infoGroup = new Adw.PreferencesGroup({
                title: 'Information',
                header_suffix: saveBtn,
            });

            // Helper to create rows
            const addEntry = (title, key, purpose = Gtk.InputPurpose.FREE_FORM) => {
                const row = new Adw.EntryRow({
                    title: title,
                    text: String(edits[key] || ''),
                    input_purpose: purpose,
                });
                row.connect('notify::text', () => {
                    let val = row.text;
                    if (purpose === Gtk.InputPurpose.NUMBER) {
                        // Parse int or float?
                        edits[key] = key === 'quantity' ? parseInt(val) : parseFloat(val);
                    } else {
                        edits[key] = val;
                    }
                    onEdit();
                });
                infoGroup.add(row);
            };

            const addDateEntry = (title, key) => {
                const row = new Adw.ActionRow({
                    title: title,
                    subtitle: edits[key] || 'Not set',
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
                    edits[key] = dateStr;
                    row.subtitle = dateStr;
                    calendarPopover.popdown();
                    onEdit();
                });

                row.add_suffix(dateBtn);
                row.activatable_widget = dateBtn;
                infoGroup.add(row);
            };

            addEntry('Name', 'name');
            addEntry('Scientific Name', 'scientific_name');
            addEntry('Type', 'type');
            addDateEntry('Introduced On', 'introduced_date');
            addEntry('Quantity', 'quantity', Gtk.InputPurpose.NUMBER);
            addEntry('Purchased From', 'source');
            addDateEntry('Purchased On', 'purchase_date');
            addEntry('Cost', 'cost', Gtk.InputPurpose.NUMBER);
            addEntry('Notes', 'notes');

            mainBox.append(infoGroup);

            if (!isNew) {
                const dangerGroup = new Adw.PreferencesGroup();
                const delBtn = new Gtk.Button({
                    label: 'Delete Inhabitant',
                    css_classes: ['destructive-action'],
                });
                delBtn.connect('clicked', () => {
                    DB.deleteLivestock(item.id);
                    this._refreshGrid();
                    this._navView.pop();
                });
                dangerGroup.add(delBtn);
                mainBox.append(dangerGroup);
            }

            clamp.set_child(mainBox);
            scroll.set_child(clamp);
            detailPage.set_child(scroll);

            this._navView.push(detailPage);
        }
    }
);
