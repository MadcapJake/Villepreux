import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import { AddTankDialog } from './views/AddTankDialog.js';
import { getTanks } from './database.js';

export const VillepreuxWindow = GObject.registerClass(
    class VillepreuxWindow extends Adw.ApplicationWindow {
        _init(app) {
            super._init({
                application: app,
                title: 'Villepreux',
                default_width: 800,
                default_height: 600,
            });

            this._setupUI();
        }

        _setupUI() {
            // Main layout container: OverlaySplitView (Better for collapsible sidebar)
            this._splitView = new Adw.OverlaySplitView({
                min_sidebar_width: 250,
                max_sidebar_width: 300,
                sidebar_position: Gtk.PackType.START,
            });

            // --- Sidebar Setup ---
            const sidebarContent = new Adw.ToolbarView();

            // Sidebar Header
            const sidebarHeader = new Adw.HeaderBar({
                title_widget: new Gtk.Label({ label: 'Tanks', css_classes: ['title'] }),
                show_end_title_buttons: false, // Clean look for sidebar
                show_start_title_buttons: false
            });

            // Add Tank Button (Sidebar)
            const addTankBtn = new Gtk.Button({
                icon_name: 'list-add-symbolic',
                tooltip_text: 'Add Tank'
            });
            addTankBtn.connect('clicked', () => {
                const dialog = new AddTankDialog(this);
                dialog.connect('tank-added', () => {
                    this._refreshTankList();
                });
                dialog.present();
            });
            sidebarHeader.pack_end(addTankBtn);

            sidebarContent.add_top_bar(sidebarHeader);

            // Tank List
            this._tanksList = new Gtk.ListBox({
                css_classes: ['navigation-sidebar'],
            });
            this._tanksList.connect('row-activated', (box, row) => {
                this._onTankSelected(row.tank);
            });

            // Wrap list in ScrolledWindow
            const scrolledList = new Gtk.ScrolledWindow({
                hscrollbar_policy: Gtk.PolicyType.NEVER,
                child: this._tanksList
            });
            sidebarContent.set_content(scrolledList);

            this._splitView.set_sidebar(sidebarContent);


            // --- Content Setup ---
            this._contentView = new Adw.ToolbarView();

            // Content Header
            const contentHeader = new Adw.HeaderBar();

            // Sidebar Toggle Button (Content)
            const toggleSidebarBtn = new Gtk.Button({
                icon_name: 'sidebar-show-symbolic',
                tooltip_text: 'Toggle Sidebar'
            });
            // Bind button visibility/action to split view state
            toggleSidebarBtn.connect('clicked', () => {
                this._splitView.set_show_sidebar(!this._splitView.show_sidebar);
            });

            // Only show toggle button when collapsed (optional, but good UX)
            // Or always show it if we want desktop collapse. 
            // For now, let's keep it simple: always visible if we allow desktop collapse, 
            // but standard 'Libadwaita' mostly shows it when collapsed.
            // Let's bind it to behave like a standard overlay toggle.

            contentHeader.pack_start(toggleSidebarBtn);
            this._contentView.add_top_bar(contentHeader);

            this._statusPage = new Adw.StatusPage({
                title: 'Welcome to Villepreux',
                description: "You haven't created a tank yet. Start tracking your ecosystem today.",
                icon_name: 'aquarium-symbolic',
                child: this._createZeroStateButton(),
            });

            this._contentView.set_content(this._statusPage);
            this._splitView.set_content(this._contentView);

            // --- Breakpoints (Responsive) ---
            const breakpoint = new Adw.Breakpoint({
                condition: Adw.BreakpointCondition.new_length(
                    Adw.BreakpointConditionLengthType.MAX_WIDTH,
                    700,
                    Adw.LengthUnit.PX
                ),
            });

            // When narrow, enable collapsing behavior automatically handled by OverlaySplitView?
            // OverlaySplitView has 'collapsed' property.
            breakpoint.add_setter(this._splitView, 'collapsed', true);
            this.add_breakpoint(breakpoint);

            this.content = this._splitView;

            // Initial load
            this._refreshTankList();
        }

        _createZeroStateButton() {
            const btn = new Gtk.Button({
                label: 'Create First Tank',
                css_classes: ['suggested-action', 'pill'],
                halign: Gtk.Align.CENTER,
            });
            btn.connect('clicked', () => {
                const dialog = new AddTankDialog(this);
                dialog.connect('tank-added', () => {
                    this._refreshTankList();
                });
                dialog.present();
            });
            return btn;
        }

        _refreshTankList() {
            const tanks = getTanks();

            // Clear list
            let child = this._tanksList.get_first_child();
            while (child) {
                this._tanksList.remove(child);
                child = this._tanksList.get_first_child();
            }

            if (tanks.length > 0) {
                // Populate list
                tanks.forEach(tank => {
                    const row = new Adw.ActionRow({
                        title: tank.name,
                        subtitle: `${tank.volume}L - ${tank.type}`,
                    });
                    // Store tank data on the row for retrieval on click
                    row.tank = tank;
                    this._tanksList.append(row);
                });

                // If currently showing status page, switch to dashboard of first tank
                if (this._contentView.content === this._statusPage) {
                    this._onTankSelected(tanks[0]);
                }
            } else {
                // Ensure zero state
                if (this._contentView.content !== this._statusPage) {
                    this._contentView.set_content(this._statusPage);
                }
            }
        }

        _onTankSelected(tank) {
            // Update content view with Dashboard for 'tank'
            const dashboardLabel = new Gtk.Label({
                label: `Dashboard for ${tank.name}\nVolume: ${tank.volume}L`,
                halign: Gtk.Align.CENTER,
                valign: Gtk.Align.CENTER,
                css_classes: ['title-1']
            });

            this._contentView.set_content(dashboardLabel);

            // If on mobile (collapsed), hide sidebar automatically
            if (this._splitView.collapsed) {
                this._splitView.show_sidebar = false;
            }
        }
    }
);
