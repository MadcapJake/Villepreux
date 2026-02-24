import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import * as DB from '../database.js';
import { LogSingleParameterDialog } from './LogSingleParameterDialog.js';
import { ChartWidget } from '../widgets/ChartWidget.js';
import { AnalyzeParametersDialog } from './AnalyzeParametersDialog.js';
import Gdk from 'gi://Gdk';

export const ParameterView = GObject.registerClass(
    {
        Properties: {
            'isMultiSelectMode': GObject.ParamSpec.boolean(
                'isMultiSelectMode',
                'Is Multi Select Mode',
                'Whether the view is in multi-select mode',
                GObject.ParamFlags.READABLE,
                false
            ),
        }
    },
    class ParameterView extends Adw.Bin {
        _init(tank) {
            super._init();
            this.tank = tank;

            if (!globalThis.villepreuxCustomCssLoaded) {
                const css = `
                    .selected-card {
                        box-shadow: inset 0 0 0 2px @accent_color;
                        background-color: alpha(@accent_color, 0.1);
                    }
                `;
                const provider = new Gtk.CssProvider();
                provider.load_from_string(css);
                Gtk.StyleContext.add_provider_for_display(Gdk.Display.get_default(), provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
                globalThis.villepreuxCustomCssLoaded = true;
            }

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

            // Multi-select state
            this._isMultiSelectMode = false;
            this._selectedParameters = new Set();

            this._refreshGrid();

            mainBox.append(this._flowBox);
            clamp.set_child(mainBox);
            scroll.set_child(clamp);
            rootPage.set_child(scroll);

            this._navView.add(rootPage);
            this.set_child(this._navView);
        }

        toggleMultiSelectMode() {
            this._isMultiSelectMode = !this._isMultiSelectMode;

            if (!this._isMultiSelectMode) {
                this._selectedParameters.clear();
            }

            // Redraw grid to show/hide checkboxes and "add parameter" card
            this._refreshGrid();
        }

        get selectedParameters() {
            return Array.from(this._selectedParameters);
        }

        get isMultiSelectMode() {
            return this._isMultiSelectMode;
        }

        openAnalysis() {
            if (this._selectedParameters.size === 0) return;
            console.log("Analyze clicked! Selected: ", Array.from(this._selectedParameters));
            const selectedDefs = DB.getParameterDefinitions(this.tank.id)
                .filter(d => this._selectedParameters.has(d.name));

            // Spawn AnalyzeParametersDialog
            const rootWindow = this.get_root();
            const dialog = new AnalyzeParametersDialog(rootWindow, this.tank, Array.from(this._selectedParameters));

            dialog.connect('close-request', () => {
                // Exit multi select on close
                if (this.isMultiSelectMode) {
                    this.toggleMultiSelectMode();
                }
            });

            dialog.present();
        }

        _refreshGrid() {
            console.log(`[ParameterView] Refreshing grid for tank: ${this.tank.id}, multiSelect: ${this._isMultiSelectMode}`);
            this._flowBox.remove_all();

            const defs = DB.getParameterDefinitions(this.tank.id);

            defs.forEach(def => {
                const card = this._createChartCard(def);
                this._flowBox.append(card);
            });

            // "Add Parameter" Card (Last item) - hidden in multi-select mode
            if (!this._isMultiSelectMode) {
                const addCard = this._createAddCard();
                this._flowBox.append(addCard);
            }

            // Fire an event so the window can update its header buttons
            this.notify('isMultiSelectMode');
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
                margin_start: 12,
                margin_end: 12,
                margin_top: 12,
                margin_bottom: 12,
                vexpand: true,
            });

            const history = DB.getParameterHistory(this.tank.id, def.name);

            // Mini-chart
            const chart = new ChartWidget({ mode: 'mini' });
            chart.setData(def, history);
            chart.height_request = 60;
            chart.margin_bottom = 12;

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
                margin_start: 12,
                margin_end: 12,
                margin_top: 12,
                margin_bottom: 12,
            });

            const rangeLabel = new Gtk.Label({
                label: `Acceptable Range: ${def.min_value} - ${def.max_value} ${def.unit}`,
                css_classes: ['caption', 'dim-label'],
                halign: Gtk.Align.START,
            });

            footerBox.append(rangeLabel);
            mainBox.append(footerBox);

            button.set_child(mainBox);

            if (this._selectedParameters.has(def.name)) {
                button.add_css_class('selected-card');
            }

            // Click behavior for multi-select (shift-click or multi-select mode)
            const clickController = new Gtk.GestureClick({
                button: 0, // all buttons
            });
            clickController.set_propagation_phase(Gtk.PropagationPhase.CAPTURE);

            clickController.connect('pressed', (gesture, n_press, x, y) => {
                const state = gesture.get_current_event_state();
                const shiftPressed = state && ((state & Gdk.ModifierType.SHIFT_MASK) !== 0);

                if (this._isMultiSelectMode || shiftPressed) {
                    gesture.set_state(Gtk.EventSequenceState.CLAIMED);
                }
            });

            clickController.connect('released', (gesture, n_press, x, y) => {
                const state = gesture.get_current_event_state();
                const shiftPressed = state && ((state & Gdk.ModifierType.SHIFT_MASK) !== 0);

                if (this._isMultiSelectMode || shiftPressed) {
                    if (this._selectedParameters.has(def.name)) {
                        this._selectedParameters.delete(def.name);
                        button.remove_css_class('selected-card');

                        // If no more parameters selected, exit multi-select mode
                        if (this._selectedParameters.size === 0 && this._isMultiSelectMode) {
                            this.toggleMultiSelectMode();
                        }
                    } else {
                        this._selectedParameters.add(def.name);
                        button.add_css_class('selected-card');

                        if (!this._isMultiSelectMode) {
                            this.toggleMultiSelectMode();
                        }
                    }
                }
            });
            button.add_controller(clickController);

            // Normal navigation
            button.connect('clicked', () => {
                if (!this._isMultiSelectMode) {
                    this._navigateToDetail(def);
                }
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
            const largeChart = new ChartWidget(def, []);
            chartFrame.set_child(largeChart);
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
            if (!edits.color) edits.color = '#3584e4'; // default blue

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

            // Graph Color
            const colorDialog = new Gtk.ColorDialog();
            const colorBtn = new Gtk.ColorDialogButton({
                dialog: colorDialog,
                valign: Gtk.Align.CENTER,
            });

            // Set initial color
            const initialColor = new Gdk.RGBA();
            initialColor.parse(edits.color);
            colorBtn.rgba = initialColor;

            colorBtn.connect('notify::rgba', () => {
                const rgba = colorBtn.rgba;
                // Convert back to hex string #RRGGBB
                const r = Math.round(rgba.red * 255).toString(16).padStart(2, '0');
                const g = Math.round(rgba.green * 255).toString(16).padStart(2, '0');
                const b = Math.round(rgba.blue * 255).toString(16).padStart(2, '0');
                edits.color = `#${r}${g}${b}`;
                onConfigChanged();
            });

            const colorRow = new Adw.ActionRow({
                title: 'Graph Color',
            });
            colorRow.add_suffix(colorBtn);
            colorRow.activatable_widget = colorBtn;
            configGroup.add(colorRow);

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

                    if (largeChart && typeof largeChart.setData === 'function') {
                        largeChart.setData(def, results);
                    }

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
