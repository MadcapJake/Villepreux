import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

export const LivestockView = GObject.registerClass(
    class LivestockView extends Adw.Bin {
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

            // Header
            // Removed as per request (Add button moved to header bar)

            // Livestock Grid (FlowBox for adaptive layout)
            const flowBox = new Gtk.FlowBox({
                valign: Gtk.Align.START,
                max_children_per_line: 3,
                min_children_per_line: 1,
                selection_mode: Gtk.SelectionMode.NONE,
                column_spacing: 12,
                row_spacing: 12,
            });

            // Placeholder Data
            ['Clownfish', 'Blenny', 'Tang', 'Snail'].forEach(fish => {
                flowBox.append(this._createFishCard(fish));
            });

            mainBox.append(flowBox);

            clamp.set_child(mainBox);
            scroll.set_child(clamp);
            this.set_child(scroll);
        }

        _createFishCard(name) {
            const card = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 6,
                css_classes: ['card', 'p-12'],
            });

            const icon = new Gtk.Image({
                icon_name: 'fish-symbolic', // Placeholder icon
                pixel_size: 48,
                halign: Gtk.Align.CENTER,
            });

            const label = new Gtk.Label({
                label: name,
                css_classes: ['heading'],
                halign: Gtk.Align.CENTER,
            });

            card.append(icon);
            card.append(label);
            return card;
        }
    }
);
