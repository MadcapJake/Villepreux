import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gdk from 'gi://Gdk';
import GdkPixbuf from 'gi://GdkPixbuf';
import Pango from 'gi://Pango';

import * as DB from '../database.js';
import { ImageHandler } from '../utils/image_handler.js';

export const LivestockView = GObject.registerClass(
    class LivestockView extends Adw.Bin {
        _init(tank) {
            super._init();
            this.tank = tank;

            this._navView = new Adw.NavigationView();

            // Load CSS for image border radius
            const cssProvider = new Gtk.CssProvider();
            cssProvider.load_from_string(`
                .card-image-area {
                    border-top-left-radius: 12px;
                    border-top-right-radius: 12px;
                }
            `);
            Gtk.StyleContext.add_provider_for_display(
                Gdk.Display.get_default(),
                cssProvider,
                Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
            );

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
                halign: Gtk.Align.FILL,
                min_children_per_line: 1,
                max_children_per_line: 10,
                selection_mode: Gtk.SelectionMode.NONE,
                column_spacing: 12,
                row_spacing: 12,
                homogeneous: true,
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
                width_request: 160,
                height_request: 200,
                hexpand: true,
            });

            const card = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 0,
            });

            // Image Area
            let imageArea;
            if (item.image_path && item.image_path !== 'Alive' && item.image_path !== 'Deceased') {
                const fullPath = ImageHandler.getImagePath(item.image_path);
                try {
                    const pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(fullPath, 160, 120, false);
                    const texture = Gdk.Texture.new_for_pixbuf(pixbuf);
                    imageArea = Gtk.Picture.new_for_paintable(texture);
                } catch (e) {
                    imageArea = Gtk.Picture.new_for_filename(fullPath);
                }
                imageArea.set_content_fit(Gtk.ContentFit.COVER);
                imageArea.can_shrink = true;
                imageArea.hexpand = true;
                imageArea.height_request = 120;
                imageArea.css_classes = ['card-image-area'];
            } else {
                imageArea = new Gtk.Image({
                    icon_name: 'image-missing-symbolic',
                    pixel_size: 48,
                    height_request: 120,
                    hexpand: true,
                    css_classes: ['card-image-area', 'dim-label'],
                });
            }

            // Content
            const contentBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 6,
                margin_start: 12,
                margin_end: 12,
                margin_top: 12,
                margin_bottom: 12,
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
                width_request: 160,
                hexpand: true,
            });

            const card = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 12,
                margin_start: 12,
                margin_end: 12,
                margin_top: 12,
                margin_bottom: 12,
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

        openAddLivestock() {
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
            const edits = { ...item };

            // --- Save Button (Setup Early for Callbacks) ---
            const saveBtn = new Gtk.Button({
                label: 'Save',
                valign: Gtk.Align.CENTER,
                css_classes: ['flat'],
                visible: false,
            });

            const onEdit = () => { saveBtn.visible = true; };

            const imgBox = new Gtk.Overlay({
                css_classes: ['card'],
                halign: Gtk.Align.FILL,
                height_request: 200,
            });

            const imgLabel = new Gtk.Label({
                label: 'Tap to add photo',
                halign: Gtk.Align.CENTER,
                valign: Gtk.Align.CENTER,
                hexpand: true,
                height_request: 200,
            });

            const pic = Gtk.Picture.new();
            pic.set_content_fit(Gtk.ContentFit.CONTAIN);
            pic.can_shrink = true;
            pic.hexpand = true;
            pic.vexpand = true;
            pic.height_request = 300;

            const deleteBtn = new Gtk.Button({
                icon_name: 'user-trash-symbolic',
                css_classes: ['circular', 'osd'],
                halign: Gtk.Align.END,
                valign: Gtk.Align.START,
                margin_top: 12,
                margin_end: 12,
            });

            deleteBtn.connect('clicked', () => {
                const dialog = new Adw.MessageDialog({
                    heading: 'Delete Photo',
                    body: `Are you sure you want to delete this photo from the '${edits.name || 'inhabitant'}'?`,
                });
                if (this.get_root()) {
                    dialog.transient_for = this.get_root();
                }

                dialog.add_response('cancel', 'Cancel');
                dialog.add_response('delete', 'Delete');
                dialog.set_response_appearance('delete', Adw.ResponseAppearance.DESTRUCTIVE);

                dialog.connect('response', (dlg, response) => {
                    if (response === 'delete') {
                        edits.image_path = '';
                        refreshDetailImage();
                        onEdit();
                    }
                });

                dialog.present();
            });

            imgBox.set_child(pic);
            imgBox.add_overlay(imgLabel);
            imgBox.add_overlay(deleteBtn);

            const refreshDetailImage = () => {
                if (edits.image_path && edits.image_path !== 'Alive' && edits.image_path !== 'Deceased') {
                    const fullPath = ImageHandler.getImagePath(edits.image_path);
                    console.log(`[LivestockView] Detail View Refreshing Image: ${fullPath}`);
                    pic.set_filename(fullPath);
                    pic.visible = true;
                    imgLabel.visible = false;
                    deleteBtn.visible = true;
                } else {
                    pic.set_filename(null);
                    pic.visible = false;
                    imgLabel.visible = true;
                    deleteBtn.visible = false;
                }
            };
            refreshDetailImage();

            // Set up click gesture for photo upload
            const imgClick = new Gtk.GestureClick();
            imgClick.connect('released', () => {
                const dialog = new Gtk.FileDialog({ title: 'Select Inhabitant Photo' });
                const filter = new Gtk.FileFilter();
                filter.add_mime_type('image/jpeg');
                filter.add_mime_type('image/png');
                filter.add_mime_type('image/webp');

                const filterList = Gio.ListStore.new(Gtk.FileFilter);
                filterList.append(filter);
                dialog.set_filters(filterList);

                dialog.open(this.get_root(), null, (source, res) => {
                    try {
                        console.log('[LivestockView] FileDialog finished, importing synchronously...');
                        const file = dialog.open_finish(res);
                        const newFilename = ImageHandler.importImage(file);
                        console.log(`[LivestockView] Image imported as: ${newFilename}`);
                        edits.image_path = newFilename;
                        console.log('[LivestockView] Refreshing Detail Image box...');
                        refreshDetailImage();
                        console.log('[LivestockView] Activating Save Button...');
                        onEdit();
                    } catch (e) {
                        if (!e.matches(Gtk.DialogError, Gtk.DialogError.DISMISSED)) {
                            console.error('[LivestockView] File open failed:', e);
                        }
                    }
                });
            });
            imgBox.add_controller(imgClick);

            mainBox.append(imgBox);

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
