import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

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
            const flowBox = new Gtk.FlowBox({
                valign: Gtk.Align.START,
                min_children_per_line: 1,
                max_children_per_line: 10,
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
            rootPage.set_child(scroll);

            this._navView.add(rootPage);
            this.set_child(this._navView);
        }

        get navigationView() {
            return this._navView;
        }

        _createFishCard(name) {
            const button = new Gtk.Button({
                css_classes: ['card', 'flat'],
            });

            const card = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 6,
                css_classes: ['p-12'],
                width_request: 175,
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
            button.set_child(card);

            button.connect('clicked', () => {
                this._navigateToDetail(name);
            });
            return button;
        }

        _navigateToDetail(name) {
            const detailPage = new Adw.NavigationPage({
                title: name,
                tag: 'detail',
            });

            const content = new Gtk.Label({
                label: `Livestock Detail: ${name}`,
                css_classes: ['title-1'],
            });

            detailPage.set_child(content);
            this._navView.push(detailPage);
        }
    }
);
