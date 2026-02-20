import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import * as DB from '../database.js';
import { LogSingleParameterDialog } from './LogSingleParameterDialog.js';

export const ParameterView = GObject.registerClass(
    class ParameterView extends Adw.Bin {
        _init(tank) {
            super._init();
            this.tank = tank;

            this._navView = new Adw.NavigationView();

            // --- Root Page (Grid) ---
            const rootPage = new Adw.NavigationPage({
                title: 'Parameters',
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

            // Charts Grid
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

        _refreshGrid() {
            console.log(`[ParameterView] Refreshing grid for tank: ${this.tank.id}`);
            this._flowBox.remove_all();

            const defs = DB.getParameterDefinitions(this.tank.id);

            defs.forEach(def => {
                const card = this._createChartCard(def);
                this._flowBox.append(card);
            });

            // "Add Parameter" Card (Last item)
            const addCard = this._createAddCard();
            this._flowBox.append(addCard);
        }

        get navigationView() {
            return this._navView;
        }

        _createChartCard(def) {
            const button = new Gtk.Button({
                css_classes: ['card'],
            });

            const mainBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 0,
            });

            // --- Body ---
            const bodyBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 6,
                css_classes: ['p-12'],
                vexpand: true,
            });

            // Placeholder mini-chart (using a LevelBar for now)
            const chart = new Gtk.LevelBar({
                value: 0.7,
                height_request: 60,
                margin_bottom: 12,
            });

            const nameLabel = new Gtk.Label({
                label: def.name || 'Unknown',
                css_classes: ['heading'],
                halign: Gtk.Align.START,
            });

            // Fetch latest result
            const latest = DB.getLatestParameterResult(this.tank.id, def.name);
            let resultText = 'Last Result: --';
            if (latest) {
                // Formatting date optionally to be shorter, but exact string is fine for now
                resultText = `Last Result: ${latest.value} ${def.unit} (${latest.date})`;
            }

            const resultLabel = new Gtk.Label({
                label: resultText,
                css_classes: ['body'],
                halign: Gtk.Align.START,
            });

            bodyBox.append(chart);
            bodyBox.append(nameLabel);
            bodyBox.append(resultLabel);

            // --- Separator ---
            mainBox.append(bodyBox);
            mainBox.append(new Gtk.Separator());

            // --- Footer ---
            const footerBox = new Gtk.Box({
                orientation: Gtk.Orientation.HORIZONTAL,
                spacing: 12,
                css_classes: ['p-12'],
            });

            const rangeLabel = new Gtk.Label({
                label: `Acceptable Range: ${def.min_value} - ${def.max_value} ${def.unit}`,
                css_classes: ['caption', 'dim-label'],
                halign: Gtk.Align.START,
            });

            footerBox.append(rangeLabel);
            mainBox.append(footerBox);

            button.set_child(mainBox);

            button.connect('clicked', () => {
                this._navigateToDetail(def);
            });

            return button;
        }

        _createAddCard() {
            const button = new Gtk.Button({
                css_classes: ['card'],
                height_request: 200,
                width_request: 260,
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
                valign: Gtk.Align.CENTER,
            });

            const label = new Gtk.Label({
                label: 'Add Parameter',
                css_classes: ['heading', 'dim-label'],
                halign: Gtk.Align.CENTER,
                valign: Gtk.Align.CENTER,
            });

            card.append(icon);
            card.append(label);
            button.set_child(card);

            button.connect('clicked', () => {
                // New definition template
                this._navigateToDetail({
                    tank_id: this.tank.id,
                    name: '',
                    min_value: 0,
                    max_value: 10,
                    unit: ''
                });
            });
            return button;
        }

        _navigateToDetail(def) {
            const isNew = !def.id;
            const detailPage = new Adw.NavigationPage({
                title: isNew ? 'New Parameter' : def.name,
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

            // 1. Large Chart Area
            const chartFrame = new Gtk.Frame({
                css_classes: ['view'],
                height_request: 300,
            });
            const chartLabel = new Gtk.Label({
                label: `Large Chart for ${def.name || 'New Parameter'}`,
                css_classes: ['title-2', 'dim-label'],
            });
            chartFrame.set_child(chartLabel);
            mainBox.append(chartFrame);

            // 2. Configuration Group
            const saveBtn = new Gtk.Button({
                label: 'Save',
                valign: Gtk.Align.CENTER,
                css_classes: ['flat'],
                visible: false,
            });

            // State for edits
            const edits = { ...def };

            saveBtn.connect('clicked', () => {
                // Validate (?)
                if (!edits.name) return;

                // Save to DB
                try {
                    DB.upsertParameterDefinition(edits);
                    this._refreshGrid(); // Refresh main grid
                    this._navView.pop();
                } catch (e) {
                    console.error("Save failed", e);
                }
            });

            const configGroup = new Adw.PreferencesGroup({
                title: 'Configuration',
                header_suffix: saveBtn,
            });

            const onConfigChanged = () => {
                saveBtn.visible = true;
            };

            // Parameter Name
            const nameRow = new Adw.EntryRow({
                title: 'Parameter Name',
                text: def.name || '',
            });
            nameRow.connect('notify::text', () => {
                edits.name = nameRow.text;
                onConfigChanged();
            });
            configGroup.add(nameRow);

            // Acceptable Range (Min/Max) - Simplified as one string for now?? 
            // DB expects min_value and max_value (REAL).
            // Let's use two rows or split the string? 
            // Let's use two distinct rows for Min and Max.

            const minRow = new Adw.EntryRow({
                title: 'Min Value',
                text: String(def.min_value || 0),
                input_purpose: Gtk.InputPurpose.NUMBER,
            });
            minRow.connect('notify::text', () => {
                edits.min_value = parseFloat(minRow.text) || 0;
                onConfigChanged();
            });
            configGroup.add(minRow);

            const maxRow = new Adw.EntryRow({
                title: 'Max Value',
                text: String(def.max_value || 10),
                input_purpose: Gtk.InputPurpose.NUMBER,
            });
            maxRow.connect('notify::text', () => {
                edits.max_value = parseFloat(maxRow.text) || 10;
                onConfigChanged();
            });
            configGroup.add(maxRow);

            // Unit of Measurement
            const unitRow = new Adw.EntryRow({
                title: 'Unit',
                text: def.unit || '',
            });
            unitRow.connect('notify::text', () => {
                edits.unit = unitRow.text;
                onConfigChanged();
            });
            configGroup.add(unitRow);

            mainBox.append(configGroup);

            // 3. History List (Only if not new)
            if (!isNew) {
                const historyContainer = new Gtk.Box({
                    orientation: Gtk.Orientation.VERTICAL
                });

                const refreshHistory = () => {
                    let child = historyContainer.get_first_child();
                    while (child) {
                        historyContainer.remove(child);
                        child = historyContainer.get_first_child();
                    }

                    const historyGroup = new Adw.PreferencesGroup({
                        title: 'Recent Results',
                    });

                    const headerSuffix = new Gtk.Button({
                        icon_name: 'list-add-symbolic',
                        valign: Gtk.Align.CENTER,
                        css_classes: ['flat'],
                        tooltip_text: 'Log Result',
                    });
                    headerSuffix.connect('clicked', () => {
                        const rootWindow = this.get_root();
                        const dialog = new LogSingleParameterDialog(rootWindow, this.tank, def);
                        dialog.connect('parameter-logged', () => {
                            refreshHistory();
                            this._refreshGrid(); // Update the card on the root page
                        });
                        dialog.present();
                    });
                    historyGroup.header_suffix = headerSuffix;

                    const results = DB.getParameterHistory(this.tank.id, def.name);

                    if (results.length === 0) {
                        const emptyRow = new Adw.ActionRow({
                            title: 'No results logged',
                            subtitle: 'Click + to log the first result.',
                        });
                        historyGroup.add(emptyRow);
                    }

                    results.forEach(res => {
                        const unitStr = def.unit ? ` ${def.unit}` : '';
                        const row = new Adw.ActionRow({
                            title: `${res.value}${unitStr}`,
                            subtitle: res.date,
                        });

                        const delBtn = new Gtk.Button({
                            icon_name: 'user-trash-symbolic',
                            css_classes: ['flat', 'destructive-action'],
                            valign: Gtk.Align.CENTER,
                            tooltip_text: 'Delete Result',
                        });
                        delBtn.connect('clicked', () => {
                            DB.deleteParameterRecord(res.id);
                            refreshHistory();
                            this._refreshGrid();
                        });
                        row.add_suffix(delBtn);

                        historyGroup.add(row);
                    });

                    historyContainer.append(historyGroup);
                };

                refreshHistory();
                mainBox.append(historyContainer);

                // Delete Parameter Button
                const dangerGroup = new Adw.PreferencesGroup();
                const deleteBtn = new Gtk.Button({
                    label: 'Delete Parameter',
                    css_classes: ['destructive-action'],
                });
                deleteBtn.connect('clicked', () => {
                    DB.deleteParameterDefinition(def.id);
                    this._refreshGrid();
                    this._navView.pop();
                });
                dangerGroup.add(deleteBtn);
                mainBox.append(dangerGroup);
            }

            clamp.set_child(mainBox);
            scroll.set_child(clamp);
            detailPage.set_child(scroll);

            this._navView.push(detailPage);
        }
    }
);
