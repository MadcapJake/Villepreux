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
            // Main layout container: NavigationSplitView

            // Sidebar (Navigation Rail / List)
            this._tanksList = new Gtk.ListBox({
                css_classes: ['navigation-sidebar'],
            });

            const sidebarContent = new Adw.ToolbarView();
            const sidebarHeader = new Adw.HeaderBar({ title_widget: new Gtk.Label({ label: 'Tanks', css_classes: ['title'] }) });
            sidebarContent.add_top_bar(sidebarHeader);
            sidebarContent.set_content(this._tanksList);

            const sidebarPage = new Adw.NavigationPage({
                title: 'Tanks',
                child: sidebarContent,
                tag: 'sidebar',
            });

            // Content Area (Main View) - Zero State initially
            this._contentView = new Adw.ToolbarView();
            const contentHeader = new Adw.HeaderBar();
            this._contentView.add_top_bar(contentHeader);

            this._statusPage = new Adw.StatusPage({
                title: 'Welcome to Villepreux',
                description: "You haven't created a tank yet. Start tracking your ecosystem today.",
                icon_name: 'aquarium-symbolic',
                child: this._createZeroStateButton(),
            });

            this._contentView.set_content(this._statusPage);

            const contentPage = new Adw.NavigationPage({
                title: 'Welcome',
                child: this._contentView,
                tag: 'content',
            });

            const splitView = new Adw.NavigationSplitView({
                sidebar: sidebarPage,
                content: contentPage,
            });

            const breakpoint = new Adw.Breakpoint({
                condition: Adw.BreakpointCondition.new_length(
                    Adw.BreakpointConditionLengthType.MAX_WIDTH,
                    600,
                    Adw.LengthUnit.PX
                ),
            });

            breakpoint.add_setter(splitView, 'collapsed', true);
            this.add_breakpoint(breakpoint);

            this.content = splitView;

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
                    this._tanksList.append(row);
                });

                // Update content view to show dashboard (placeholder for now)
                if (this._contentView.content === this._statusPage) {
                    const dashboardLabel = new Gtk.Label({
                        label: `Dashboard for ${tanks[0].name}`,
                        halign: Gtk.Align.CENTER,
                        valign: Gtk.Align.CENTER
                    });
                    this._contentView.set_content(dashboardLabel);
                }
            } else {
                // Ensure zero state
                if (this._contentView.content !== this._statusPage) {
                    this._contentView.set_content(this._statusPage);
                }
            }
        }
    }
);
