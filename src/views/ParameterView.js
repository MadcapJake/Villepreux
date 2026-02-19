import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

export const ParameterView = GObject.registerClass(
    class ParameterView extends Adw.Bin {
        _init(tank) {
            super._init();
            this.tank = tank;

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



            // Charts Grid (Adaptive)
            // We'll use a FlowBox to adapt between single and multi-column
            const flowBox = new Gtk.FlowBox({
                valign: Gtk.Align.START,
                max_children_per_line: 2,
                min_children_per_line: 1,
                selection_mode: Gtk.SelectionMode.NONE,
                column_spacing: 12,
                row_spacing: 12,
            });

            // Enable sorting/filtering if needed, or just let it flow.
            // Responsive behavior: Adw.Clamp handles the width constraints.
            // FlowBox adjusts columns based on available width.

            // Add dummy charts
            ['pH', 'Temperature', 'Nitrate', 'Salinity'].forEach(param => {
                flowBox.append(this._createChartCard(param));
            });

            mainBox.append(flowBox);

            clamp.set_child(mainBox);
            scroll.set_child(clamp);
            this.set_child(scroll);
        }

        _createChartCard(title) {
            const card = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 12,
                css_classes: ['card', 'p-12'],
                height_request: 200, // Placeholder height for chart
            });

            const label = new Gtk.Label({
                label: title,
                css_classes: ['heading'],
                halign: Gtk.Align.START,
            });

            const placeholder = new Gtk.Label({
                label: '(Chart Placeholder)',
                css_classes: ['dim-label'],
                vexpand: true,
                valign: Gtk.Align.CENTER,
            });

            card.append(label);
            card.append(placeholder);
            return card;
        }
    }
);
