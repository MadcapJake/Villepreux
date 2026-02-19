import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

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
            const flowBox = new Gtk.FlowBox({
                valign: Gtk.Align.START,
                min_children_per_line: 1,
                max_children_per_line: 10,
                selection_mode: Gtk.SelectionMode.NONE,
                column_spacing: 12,
                row_spacing: 12,
            });

            // Dummy charts
            ['pH', 'Temperature', 'Nitrate', 'Salinity'].forEach(param => {
                const card = this._createChartCard(param);
                flowBox.append(card);
            });

            // "Add Parameter" Card (Last item)
            const addCard = this._createAddCard();
            flowBox.append(addCard);

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

        _createChartCard(title) {
            // We wrap the card content in a Button to make it clickable
            const button = new Gtk.Button({
                css_classes: ['card', 'flat'], // flat to avoid double borders details
            });

            const card = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 12,
                css_classes: ['p-12'], // padding applied to inner box
                height_request: 200,
                width_request: 260,
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
            button.set_child(card);

            button.connect('clicked', () => {
                this._navigateToDetail(title);
            });

            return button;
        }

        _createAddCard() {
            const button = new Gtk.Button({
                css_classes: ['card', 'flat'],
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

            // Connect to action (e.g., show dialog)
            // button.connect('clicked', ...)
            return button;
        }

        _navigateToDetail(paramName) {
            const detailPage = new Adw.NavigationPage({
                title: paramName,
                tag: 'detail',
            });

            const content = new Gtk.Label({
                label: `Detail View for ${paramName}`,
                css_classes: ['title-1'],
            });

            detailPage.set_child(content);
            this._navView.push(detailPage);
        }
    }
);
