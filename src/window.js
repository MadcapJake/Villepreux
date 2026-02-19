import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import { AddTankDialog } from './views/AddTankDialog.js';

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
            // For now, we just implement the split view skeleton.

            // Sidebar (Navigation Rail)
            const sidebar = new Adw.NavigationPage({
                title: 'Tanks',
                child: new Adw.StatusPage({
                    title: 'Tanks',
                    description: 'Your aquariums will appear here',
                    icon_name: 'view-list-symbolic',
                }),
            });

            // Content Area (Main View) - Zero State
            const content = new Adw.NavigationPage({
                title: 'Welcome',
                child: new Adw.StatusPage({
                    title: 'Welcome to Villepreux',
                    description: "You haven't created a tank yet. Start tracking your ecosystem today.",
                    icon_name: 'aquarium-symbolic',
                    child: this._createZeroStateButton(),
                }),
            });

            const splitView = new Adw.NavigationSplitView({
                sidebar: sidebar,
                content: content,
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
        }

        _createZeroStateButton() {
            const btn = new Gtk.Button({
                label: 'Create First Tank',
                css_classes: ['suggested-action', 'pill'],
                halign: Gtk.Align.CENTER,
            });
            btn.connect('clicked', () => {
                const dialog = new AddTankDialog(this);
                dialog.present();
            });
            return btn;
        }
    }
);
