import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import { AddTankDialog } from './views/AddTankDialog.js';
import { DashboardView } from './views/DashboardView.js';
import { GlobalDashboardView } from './views/GlobalDashboardView.js';
import { LogParameterDialog } from './views/LogParameterDialog.js';
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

            // Home Button (Sidebar Start)
            const homeBtn = new Gtk.Button({
                icon_name: 'go-home-symbolic',
                tooltip_text: 'Global Dashboard',
                css_classes: ['flat']
            });
            homeBtn.connect('clicked', () => {
                this._showGlobalDashboard();
                this._tanksList.unselect_all();
            });
            sidebarHeader.pack_start(homeBtn);

            // Add Tank Button (Sidebar End)
            const addTankBtn = new Gtk.Button({
                icon_name: 'list-add-symbolic',
                tooltip_text: 'Add Tank',
                css_classes: ['flat']
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
                selection_mode: Gtk.SelectionMode.SINGLE,
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
            this._contentHeader = new Adw.HeaderBar();

            // Sidebar Toggle Button (Content)
            const toggleSidebarBtn = new Gtk.Button({
                icon_name: 'sidebar-show-symbolic',
                tooltip_text: 'Toggle Sidebar'
            });
            // Bind button visibility/action to split view state
            toggleSidebarBtn.connect('clicked', () => {
                this._splitView.set_show_sidebar(!this._splitView.show_sidebar);
            });

            this._contentHeader.pack_start(toggleSidebarBtn);
            this._contentView.add_top_bar(this._contentHeader);

            this._statusPage = new Adw.StatusPage({
                title: 'Welcome to Villepreux',
                description: "You haven't created a tank yet. Start tracking your ecosystem today.",
                icon_name: 'folder-new-symbolic',
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
                        activatable: true,
                    });

                    row.connect('activated', () => {
                        this._onTankSelected(tank);
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
                    // Remove bottom bar if present
                    if (this._viewSwitcherBar) {
                        this._contentView.remove(this._viewSwitcherBar);
                        this._viewSwitcherBar = null;
                        this._updateHeaderButtons(null);
                    }
                    this._contentView.set_content(this._statusPage);
                }
            }
        }

        _showGlobalDashboard() {
            console.log('[Window] Showing Global Dashboard');
            const dashboard = new GlobalDashboardView();
            this._contentView.set_content(dashboard);

            // Remove view switcher if present
            if (this._viewSwitcherBar) {
                this._contentView.remove(this._viewSwitcherBar);
                this._viewSwitcherBar = null;
            }

            // Clear existing buttons
            this._updateHeaderButtons(null);

            // Add calendar button to header
            if (dashboard.headerButton) {
                this._contentHeader.pack_end(dashboard.headerButton);
                // Don't track it in _activeHeaderButton so _updateHeaderButtons(null)
                // from a subsequent tank click can safely clear whatever it finds
                // actually we DO need to track it so we can clear it when switching BACK to a tank!
                this._activeHeaderButton = dashboard.headerButton;
            }

            if (this._splitView.collapsed) {
                this._splitView.show_sidebar = false;
            }
        }

        _onTankSelected(tank) {
            console.log(`[Window] Selected Tank: ${tank.name} (ID: ${tank.id})`);
            this._currentTank = tank;

            // Remember current tab if we are already showing a dashboard
            let currentTab = null;
            if (this._contentView.content && this._contentView.content.stack) {
                currentTab = this._contentView.content.stack.get_visible_child_name();
            }

            // Update content view with Dashboard for 'tank'
            const dashboard = new DashboardView(tank);

            if (currentTab) {
                dashboard.stack.set_visible_child_name(currentTab);
            }

            this._contentView.set_content(dashboard);

            // Setup Bottom View Switcher
            if (this._viewSwitcherBar) {
                this._contentView.remove(this._viewSwitcherBar);
            }

            this._viewSwitcherBar = new Adw.ViewSwitcherBar({
                stack: dashboard.stack,
                reveal: true,
            });
            this._contentView.add_bottom_bar(this._viewSwitcherBar);

            // Connect signal for dynamic header buttons
            dashboard.stack.connect('notify::visible-child', () => {
                this._updateHeaderButtons(dashboard.stack);
            });

            // Initial button update
            this._updateHeaderButtons(dashboard.stack);

            // If on mobile (collapsed), hide sidebar automatically
            if (this._splitView.collapsed) {
                this._splitView.show_sidebar = false;
            }
        }

        _updateHeaderButtons(stack) {
            console.log(`[Window] _updateHeaderButtons called with stack: ${!!stack}`);
            // -- Clear existing end buttons --
            // Note: In GTK4/Adw there isn't a direct "clear_end" method conveniently exposed without iterating.
            // We'll rely on keeping a reference to the active button and removing it.

            if (this._activeHeaderButton) {
                console.log(`[Window] Removing active header button:`, this._activeHeaderButton);
                this._contentHeader.remove(this._activeHeaderButton);
                this._activeHeaderButton = null;
            }
            // -- Clear existing back button (start) --
            if (this._backButton) {
                console.log(`[Window] Removing back button`);
                this._contentHeader.remove(this._backButton);
                this._backButton = null;
            }

            if (!stack) return;

            const visibleChild = stack.visible_child;
            const visibleName = stack.get_visible_child_name();

            // -- Add Action Button --
            let btn = null;

            if (visibleName === 'parameters') {
                btn = new Gtk.Button({
                    label: 'Add Test Result',
                    css_classes: ['suggested-action'],
                });
                btn.connect('clicked', () => {
                    const dialog = new LogParameterDialog(this, this._currentTank);
                    dialog.connect('parameters-logged', () => {
                        if (visibleChild && typeof visibleChild._refreshGrid === 'function') {
                            visibleChild._refreshGrid();
                        }
                    });
                    dialog.present();
                });
            } else if (visibleName === 'livestock') {
                btn = new Gtk.Button({
                    label: 'Add Inhabitant',
                    css_classes: ['suggested-action'],
                });
                // btn.connect('clicked', ...)
            } else if (visibleName === 'tasks') {
                btn = new Gtk.Button({
                    label: 'Add Task',
                    css_classes: ['suggested-action'],
                });
                // btn.connect('clicked', ...)
            }

            if (btn) {
                this._contentHeader.pack_end(btn);
                this._activeHeaderButton = btn;
            }

            // -- Handle Back Button for NavigationView --
            // Refactored to check for composition pattern (views exposing .navigationView)

            if (visibleChild.navigationView) {
                const navView = visibleChild.navigationView;

                // Create Back Button
                const backBtn = new Gtk.Button({
                    icon_name: 'go-previous-symbolic',
                    tooltip_text: 'Back',
                });

                // Visibility Logic
                const updateBackBtn = () => {
                    if (navView.visible_page && navView.visible_page.tag !== 'root') {
                        backBtn.visible = true;
                    } else {
                        backBtn.visible = false;
                    }
                };

                backBtn.connect('clicked', () => {
                    navView.pop();
                });

                // Signals
                const sig1 = navView.connect('pushed', updateBackBtn);
                const sig2 = navView.connect('popped', updateBackBtn);
                // Also update immediately
                updateBackBtn();

                this._contentHeader.pack_start(backBtn);
                this._backButton = backBtn;
            }
        }
    }
);
