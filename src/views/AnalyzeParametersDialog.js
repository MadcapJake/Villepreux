import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import * as DB from '../database.js';
import { MultiChartWidget } from '../widgets/MultiChartWidget.js';

export const AnalyzeParametersDialog = GObject.registerClass(
    class AnalyzeParametersDialog extends Adw.Window {
        _init(parent, tank, selectedParameterNames) {
            super._init({
                transient_for: parent,
                modal: true,
                title: 'Analyze Parameters',
                default_width: 800,
                default_height: 600,
                hide_on_close: true,
            });

            this.tank = tank;
            this.selectedParameterNames = selectedParameterNames;

            // Map names to definitions
            this.defs = DB.getParameterDefinitions(this.tank.id)
                .filter(d => this.selectedParameterNames.includes(d.name));

            this._setupUI();
        }

        _setupUI() {
            const toolbarView = new Adw.ToolbarView();

            const headerBar = new Adw.HeaderBar({
                title_widget: new Gtk.Label({ label: 'Analysis', css_classes: ['title'] })
            });

            // Removed custom close button to use the default one provided by Adw.HeaderBar

            // Date Range Dropdown
            const model = Gtk.StringList.new(['Last Week', 'Last Month', 'Last Quarter', 'Last Year']);
            this.dateRangeDropdown = new Gtk.DropDown({
                model: model,
                valign: Gtk.Align.CENTER
            });
            // Default to 'Last Month'
            this.dateRangeDropdown.set_selected(1);

            this.dateRangeDropdown.connect('notify::selected', () => {
                this._refreshData();
            });

            headerBar.pack_end(this.dateRangeDropdown);
            toolbarView.add_top_bar(headerBar);

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

            // 1. Chart Area
            const chartFrame = new Gtk.Frame({
                css_classes: ['view'],
                height_request: 300,
            });

            this.chartWidget = new MultiChartWidget(this.tank, this.defs, this._getDateRangeString());
            chartFrame.set_child(this.chartWidget);
            mainBox.append(chartFrame);

            // 2. Events List
            this.eventsContainer = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });
            mainBox.append(this.eventsContainer);

            clamp.set_child(mainBox);
            scroll.set_child(clamp);
            toolbarView.set_content(scroll);

            this.set_content(toolbarView);

            this._refreshData();
        }

        _getDateRangeString() {
            const selected = this.dateRangeDropdown.get_selected();
            const now = new Date();
            let cutoff = new Date();

            // 0: Last Week, 1: Last Month, 2: Last Quarter, 3: Last Year
            if (selected === 0) {
                cutoff.setDate(now.getDate() - 7);
            } else if (selected === 1) {
                cutoff.setMonth(now.getMonth() - 1);
            } else if (selected === 2) {
                cutoff.setMonth(now.getMonth() - 3);
            } else if (selected === 3) {
                cutoff.setFullYear(now.getFullYear() - 1);
            }

            return cutoff.toISOString().split('T')[0];
        }

        _refreshData() {
            const cutoffDateStr = this._getDateRangeString();
            console.log('[AnalyzeParametersDialog] Refreshing data for cutoff: ', cutoffDateStr);

            // 1. Fetch data for multi-chart
            this.chartWidget.updateData(cutoffDateStr);

            // 2. Fetch events (Tasks completed + Livestock Introduced/Purchased)
            // Note: Our DB methods getTasksByDate only grab exact days. To do a range, we'll
            // have to use a custom query or pull all and filter.
            // For now, let's fetch all tasks and livestock and filter in memory since
            // local DB data scale is small initially, or add a DB function. I'll add a DB call.

            const events = DB.getEventsInRange(this.tank.id, cutoffDateStr);

            this.chartWidget.updateEvents(events);

            let child = this.eventsContainer.get_first_child();
            while (child) {
                this.eventsContainer.remove(child);
                child = this.eventsContainer.get_first_child();
            }

            const eventsGroup = new Adw.PreferencesGroup({
                title: 'Events in Timeframe',
            });
            this.eventsContainer.append(eventsGroup);

            if (events.length === 0) {
                const placeholder = new Adw.ActionRow({
                    title: 'No events found in this timeframe.',
                });
                eventsGroup.add(placeholder);
            } else {
                events.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(ev => {
                    const row = new Adw.ActionRow({
                        title: ev.label,
                        subtitle: ev.date,
                    });

                    const icon = new Gtk.Image({
                        icon_name: ev.type === 'task' ? 'task-due-symbolic' : 'fish-symbolic',
                        valign: Gtk.Align.CENTER
                    });
                    row.add_prefix(icon);

                    eventsGroup.add(row);
                });
            }
        }
    }
);
