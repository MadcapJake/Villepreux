import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gdk from 'gi://Gdk';
import GdkPixbuf from 'gi://GdkPixbuf';
import Pango from 'gi://Pango';

import * as DB from '../database.js';
import { ImageHandler } from '../utils/image_handler.js';
import { getLivestockCategoryIcon } from '../utils/icons.js';
import { LivestockUpdateDialog } from './LivestockUpdateDialog.js';
import { MoveLivestockDialog } from './MoveLivestockDialog.js';
import { LivestockUpdateDetailDialog } from './LivestockUpdateDetailDialog.js';

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

            this.mainBox = mainBox;
            this.flowBoxes = [];

            this._refreshGrid();
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
            this.flowBoxes = [];

            // To ensure cards in different categories have exactly the same size
            this.cardSizeGroup = new Gtk.SizeGroup({
                mode: Gtk.SizeGroupMode.BOTH
            });

            let child = this.mainBox.get_first_child();
            while (child) {
                this.mainBox.remove(child);
                child = this.mainBox.get_first_child();
            }

            const items = DB.getLivestock(this.tank.id);

            const activeItems = items.filter(i => i.status === 'Alive');
            const inactiveItems = items.filter(i => i.status !== 'Alive');

            const itemsByType = {
                'Fish': [],
                'Invertebrates': [],
                'Corals & Anemones': [],
                'Plants & Macroalgae': [],
                'Amphibians & Reptiles': []
            };

            activeItems.forEach(item => {
                const t = item.type;
                if (itemsByType[t] !== undefined) {
                    itemsByType[t].push(item);
                } else {
                    if (!itemsByType['Other']) {
                        itemsByType['Other'] = [];
                    }
                    itemsByType['Other'].push(item);
                }
            });

            const typeOptions = [
                'Fish',
                'Invertebrates',
                'Corals & Anemones',
                'Plants & Macroalgae',
                'Amphibians & Reptiles',
                'Other'
            ];

            typeOptions.forEach(typeId => {
                const typeItems = itemsByType[typeId];
                if (!typeItems || typeItems.length === 0) return;

                // For 'Other', if we have dynamically added custom categories?
                // we treat them as 'Other' in terms of visual fallback, but display 'Other'
                const displayTitle = typeId.replace(/&/g, '&amp;');

                const group = new Adw.PreferencesGroup({
                    title: displayTitle,
                });

                const iconResource = getLivestockCategoryIcon(typeId);
                if (iconResource) {
                    const headerIcon = new Gtk.Image({
                        resource: iconResource,
                        css_classes: ['dim-label'],
                        margin_bottom: 12
                    });
                    group.set_header_suffix(headerIcon);
                }

                const flowBox = new Gtk.FlowBox({
                    valign: Gtk.Align.START,
                    halign: Gtk.Align.FILL,
                    min_children_per_line: 1,
                    max_children_per_line: 6,
                    selection_mode: Gtk.SelectionMode.NONE,
                    column_spacing: 12,
                    row_spacing: 12,
                    homogeneous: true,
                });
                this.flowBoxes.push(flowBox);

                typeItems.forEach(item => {
                    flowBox.append(this._createFishCard(item));
                });

                group.add(flowBox);
                this.mainBox.append(group);
            });

            if (inactiveItems.length > 0) {
                const inactiveGroup = new Adw.PreferencesGroup({
                    margin_top: 24,
                });

                const inactiveExpander = new Adw.ExpanderRow({
                    title: 'Deceased / Rehomed',
                    icon_name: 'skull-symbolic',
                });

                inactiveGroup.add(inactiveExpander);

                const inactiveFlowBox = new Gtk.FlowBox({
                    valign: Gtk.Align.START,
                    halign: Gtk.Align.FILL,
                    min_children_per_line: 1,
                    max_children_per_line: 6,
                    selection_mode: Gtk.SelectionMode.NONE,
                    column_spacing: 12,
                    row_spacing: 12,
                    homogeneous: true,
                    margin_top: 12,
                    margin_bottom: 12,
                    margin_start: 12,
                    margin_end: 12,
                });

                this.flowBoxes.push(inactiveFlowBox);

                inactiveItems.forEach(item => {
                    inactiveFlowBox.append(this._createFishCard(item));
                });

                inactiveExpander.add_row(inactiveFlowBox);
                this.mainBox.append(inactiveGroup);
            }
        }

        _createFishCard(item) {
            const button = new Gtk.Button({
                css_classes: ['card'],
                width_request: 160,
                height_request: 200,
                valign: Gtk.Align.START,
                halign: Gtk.Align.FILL,
                hexpand: true, // Allow expansion
            });

            this.cardSizeGroup.add_widget(button);

            const card = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 0,
            });

            // Image Area
            let imageArea;
            if (item.image_path && item.image_path !== 'Alive' && item.image_path !== 'Deceased') {
                const fullPath = ImageHandler.getImagePath(item.image_path);
                try {
                    // Create a pixbuf scaled to max boundaries to control natural size
                    const pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(fullPath, 160, 120, false);
                    const texture = Gdk.Texture.new_for_pixbuf(pixbuf);
                    imageArea = Gtk.Picture.new_for_paintable(texture);
                } catch (e) {
                    imageArea = Gtk.Picture.new_for_filename(fullPath);
                }

                imageArea.set_content_fit(Gtk.ContentFit.COVER);
                imageArea.can_shrink = true;
                imageArea.height_request = 120;
                imageArea.width_request = 160;
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

        openAddLivestock() {
            this._navigateToAdd({
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
                status: 'Alive',
                measurable1_label: '',
                measurable1_unit: '',
                measurable2_label: '',
                measurable2_unit: ''
            });
        }

        _navigateToDetail(item) {
            if (!item.id) {
                return this._navigateToAdd(item);
            }

            const detailPage = new Adw.NavigationPage({
                title: item.name,
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

            // --- A. The Identity Header ---
            const headerBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 12,
                halign: Gtk.Align.CENTER
            });

            const heroImg = Gtk.Picture.new();
            heroImg.set_content_fit(Gtk.ContentFit.COVER);
            heroImg.can_shrink = true;
            heroImg.height_request = 160;
            heroImg.width_request = 160;
            heroImg.css_classes = ['card'];
            // Rounded corners on the hero image? We can use an avatar or just styling

            if (item.image_path && item.image_path !== 'Alive' && item.image_path !== 'Deceased') {
                const fullPath = ImageHandler.getImagePath(item.image_path);
                heroImg.set_filename(fullPath);
            } else {
                heroImg.set_filename(null);
                // Fallback can be an icon, but picture works ok empty, maybe add fallback icon
            }

            const commonNameLabel = new Gtk.Label({
                label: item.name || 'Unnamed',
                css_classes: ['title-1'],
                halign: Gtk.Align.CENTER,
            });

            const scientificNameLabel = new Gtk.Label({
                label: item.scientific_name || item.type || 'Unknown Species',
                css_classes: ['dim-label'],
                halign: Gtk.Align.CENTER,
            });

            headerBox.append(heroImg);
            headerBox.append(commonNameLabel);
            headerBox.append(scientificNameLabel);
            mainBox.append(headerBox);

            // --- B. The Quick Actions Bar ---
            const quickActionsBox = new Gtk.Box({
                orientation: Gtk.Orientation.HORIZONTAL,
                spacing: 12,
                halign: Gtk.Align.CENTER
            });

            if (item.status === 'Alive') {
                const editBtn = new Gtk.Button({
                    label: 'Edit',
                    css_classes: ['pill'],
                });
                editBtn.connect('clicked', () => {
                    this._navigateToAdd(item);
                });

                const moveBtn = new Gtk.Button({
                    label: 'Move Tank',
                    css_classes: ['pill'],
                });
                moveBtn.connect('clicked', () => {
                    const dialog = new MoveLivestockDialog(this.get_root(), item);
                    dialog.transient_for = this.get_root();
                    dialog.connect('livestock-moved', () => {
                        this._refreshGrid();
                        this._navView.pop();
                    });
                    dialog.present(this.get_root());
                });

                const deceasedBtn = new Gtk.Button({
                    label: 'Mark Deceased / Rehome',
                    css_classes: ['pill'],
                });
                deceasedBtn.connect('clicked', () => {
                    const dialog = new Adw.MessageDialog({
                        heading: 'Update Status',
                        body: 'Are you sure you want to mark this entity as no longer present in any of your tanks?',
                    });
                    if (this.get_root()) dialog.transient_for = this.get_root();
                    dialog.add_response('cancel', 'Cancel');
                    dialog.add_response('deceased', 'Deceased');
                    dialog.add_response('rehomed', 'Rehomed');
                    dialog.set_response_appearance('deceased', Adw.ResponseAppearance.DESTRUCTIVE);

                    dialog.connect('response', (dlg, response) => {
                        if (response === 'deceased' || response === 'rehomed') {
                            item.status = response === 'deceased' ? 'Deceased' : 'Rehomed';
                            DB.upsertLivestock(item);
                            this._refreshGrid();
                            this._navView.pop();
                        }
                    });
                    dialog.present(this.get_root());
                });

                quickActionsBox.append(editBtn);
                quickActionsBox.append(moveBtn);
                quickActionsBox.append(deceasedBtn);
                mainBox.append(quickActionsBox);
            } else {
                const banner = new Adw.Banner({
                    title: `Status: ${item.status}`,
                    button_label: '',
                    revealed: true
                });
                mainBox.append(banner);
            }

            // --- C. Core Details ---
            const coreGroup = new Adw.PreferencesGroup({ title: 'Core Details' });

            const categoryRow = new Adw.ActionRow({
                title: 'Category',
                subtitle: item.type || 'Unknown',
            });
            coreGroup.add(categoryRow);

            const quantityRow = new Adw.ActionRow({
                title: 'Quantity',
                subtitle: String(item.quantity || 1),
            });
            coreGroup.add(quantityRow);

            const acquisitionRow = new Adw.ExpanderRow({
                title: 'Acquisition Details',
            });

            const introRow = new Adw.ActionRow({ title: 'Introduced On', subtitle: item.introduced_date || 'Unknown' });
            acquisitionRow.add_row(introRow);

            const sourceRow = new Adw.ActionRow({ title: 'Purchased From', subtitle: item.source || 'Unknown' });
            acquisitionRow.add_row(sourceRow);

            const purchasedRow = new Adw.ActionRow({ title: 'Purchased On', subtitle: item.purchase_date || 'Unknown' });
            acquisitionRow.add_row(purchasedRow);

            const costRow = new Adw.ActionRow({ title: 'Cost', subtitle: `$${(item.cost || 0).toFixed(2)}` });
            acquisitionRow.add_row(costRow);

            coreGroup.add(acquisitionRow);
            mainBox.append(coreGroup);

            // --- D. The Timeline Feed ---
            const feedGroup = new Adw.PreferencesGroup({ title: 'Timeline' });

            const addUpdateBtn = new Gtk.Button({
                label: 'Add Update',
                css_classes: ['suggested-action'],
                margin_bottom: 12
            });
            feedGroup.set_header_suffix(addUpdateBtn);

            let feedRows = [];

            const refreshFeed = () => {
                feedRows.forEach(r => feedGroup.remove(r));
                feedRows = [];

                const updates = DB.getLivestockUpdates(item.id);
                if (updates.length === 0) {
                    const emptyRow = new Adw.ActionRow({
                        title: 'No updates yet. Log growth or observations over time.',
                    });
                    emptyRow.set_activatable(false);
                    feedGroup.add(emptyRow);
                    feedRows.push(emptyRow);
                    return;
                }

                updates.forEach(upd => {
                    const noteText = upd.note ? upd.note.replace(/\n+/g, ' ') : 'No notes';
                    const row = new Adw.ActionRow({
                        title: upd.log_date,
                        subtitle: noteText,
                        subtitle_lines: 2,
                        activatable: true,
                    });

                    // Measurements
                    let measureText = '';
                    if (upd.measurable1 !== null && item.measurable1_label) {
                        measureText += `${upd.measurable1} ${item.measurable1_unit || ''} `;
                    }
                    if (upd.measurable2 !== null && item.measurable2_label) {
                        measureText += `${upd.measurable2} ${item.measurable2_unit || ''}`;
                    }
                    if (measureText.trim().length > 0) {
                        const measureLbl = new Gtk.Label({
                            label: measureText.trim(),
                            css_classes: ['numeric', 'dim-label'],
                            margin_end: 12
                        });
                        row.add_suffix(measureLbl);
                    }

                    if (upd.image_filename) {
                        const fullPath = ImageHandler.getImagePath(upd.image_filename);
                        const pic = Gtk.Picture.new();
                        pic.set_content_fit(Gtk.ContentFit.COVER);
                        pic.height_request = 48;
                        pic.width_request = 48;
                        pic.can_shrink = true;
                        pic.set_filename(fullPath);
                        pic.css_classes = ['card'];
                        row.add_suffix(pic);
                    }

                    row.connect('activated', () => {
                        const dialog = new LivestockUpdateDetailDialog(this.get_root(), item, upd);
                        dialog.connect('update-deleted', () => refreshFeed());
                        dialog.present(this.get_root());
                    });

                    feedGroup.add(row);
                    feedRows.push(row);
                });
            };

            refreshFeed();

            addUpdateBtn.connect('clicked', () => {
                const dialog = new LivestockUpdateDialog(item);
                dialog.transient_for = this.get_root();
                dialog.connect('update-logged', () => {
                    refreshFeed();
                });
                dialog.present(this.get_root());
            });

            mainBox.append(feedGroup);

            clamp.set_child(mainBox);
            scroll.set_child(clamp);
            detailPage.set_child(scroll);

            this._navView.push(detailPage);
        }

        _navigateToAdd(item) {
            const isNew = !item.id;
            const detailPage = new Adw.NavigationPage({
                title: isNew ? 'New Inhabitant' : 'Edit ' + item.name,
                tag: 'edit-' + (item.id || 'new'),
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

                dialog.present(this.get_root());
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
                    this._navView.pop(); // Pop the edit page

                    // If it was an edit, we also need to close the stale detail page and push a fresh one
                    if (!isNew) {
                        // Determine if the previous page was actually the detail page for this item
                        const currentPage = this._navView.get_visible_page();
                        if (currentPage && currentPage.tag === 'detail') {
                            this._navView.pop();
                        }

                        // Re-fetch the modified item from the DB or just pass edits
                        // We'll trust our edits object, but best to re-fetch if possible.
                        // since we just saved, we can just push detail using the edits object (which now has the DB updates)
                        this._navigateToDetail(edits);
                    }
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

            const typeOptions = [
                'Fish',
                'Invertebrates',
                'Corals & Anemones',
                'Plants & Macroalgae',
                'Amphibians & Reptiles'
            ];
            const typeModel = Gtk.StringList.new(typeOptions);
            const typeRow = new Adw.ComboRow({
                title: 'Type',
                model: typeModel,
            });

            let selectedIndex = 0;
            if (edits.type) {
                const idx = typeOptions.indexOf(edits.type);
                if (idx >= 0) {
                    selectedIndex = idx;
                }
            } else {
                edits.type = typeOptions[0]; // Set default
            }
            typeRow.selected = selectedIndex;

            typeRow.connect('notify::selected-item', () => {
                const selectedItem = typeRow.selected_item;
                if (selectedItem) {
                    edits.type = selectedItem.get_string();
                    onEdit();
                }
            });
            infoGroup.add(typeRow);
            addDateEntry('Introduced On', 'introduced_date');
            addEntry('Quantity', 'quantity', Gtk.InputPurpose.NUMBER);
            addEntry('Purchased From', 'source');
            addDateEntry('Purchased On', 'purchase_date');
            addEntry('Cost', 'cost', Gtk.InputPurpose.NUMBER);
            addEntry('Notes', 'notes');
            addEntry('Measurable 1 Label (e.g. Length)', 'measurable1_label');
            addEntry('Measurable 1 Unit (e.g. cm)', 'measurable1_unit');
            addEntry('Measurable 2 Label (e.g. Weight)', 'measurable2_label');
            addEntry('Measurable 2 Unit (e.g. g)', 'measurable2_unit');

            mainBox.append(infoGroup);

            const dangerGroup = new Adw.PreferencesGroup();

            if (!isNew) {
                const delBtn = new Gtk.Button({
                    label: 'Delete Inhabitant',
                    css_classes: ['destructive-action'],
                });
                delBtn.connect('clicked', () => {
                    const dialog = new Adw.MessageDialog({
                        heading: 'Delete Inhabitant',
                        body: 'Are you sure you want to permanently delete this inhabitant? This action cannot be undone.',
                    });
                    if (this.get_root()) dialog.transient_for = this.get_root();
                    dialog.add_response('cancel', 'Cancel');
                    dialog.add_response('delete', 'Delete');
                    dialog.set_response_appearance('delete', Adw.ResponseAppearance.DESTRUCTIVE);

                    dialog.connect('response', (dlg, response) => {
                        if (response === 'delete') {
                            DB.deleteLivestock(item.id);
                            this._refreshGrid();
                            // Pop out of edit
                            this._navView.pop();
                            // Identify if we need to pop again from detail profile (we do if it is an edit because we opened _navigateToDetail, then _navigateToAdd)
                            if (this._navView.get_visible_page().tag === 'detail') {
                                this._navView.pop();
                            }
                        }
                    });
                    dialog.present(this.get_root());
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
