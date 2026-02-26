import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import { EditTankDialog } from './views/EditTankDialog.js';
import { DashboardView } from './views/DashboardView.js';
import { GlobalDashboardView } from './views/GlobalDashboardView.js';
import { LogParameterDialog } from './views/LogParameterDialog.js';
import { ThemeDialog, DateTimeFormatDialog } from './views/SettingsDialogs.js';
import { DuplicateTankDialog } from './views/DuplicateTankDialog.js';
import { getTanks, getSetting, setSetting, resetDatabase, deleteTank } from './database.js';

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
            this._toastOverlay = new Adw.ToastOverlay();

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
                const dialog = new EditTankDialog(this);
                dialog.connect('tank-saved', () => {
                    this._refreshTankList();
                });
                dialog.present(this);
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

            this._toastOverlay.set_child(this._splitView);
            this.content = this._toastOverlay;

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
                const dialog = new EditTankDialog(this);
                dialog.connect('tank-saved', () => {
                    this._refreshTankList();
                });
                dialog.present(this);
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
                    this.set_title('Villepreux');
                    this._contentHeader.set_title_widget(null);
                    this._contentView.set_content(this._statusPage);
                }
            }
        }

        _showGlobalDashboard() {
            console.log('[Window] Showing Global Dashboard');
            const dashboard = new GlobalDashboardView();

            this.set_title('Villepreux');

            // Custom Title Widget Menu
            const titleButton = new Gtk.MenuButton({
                css_classes: ['flat'],
            });
            const btnContent = new Adw.ButtonContent({
                label: 'Villepreux',
                icon_name: 'pan-down-symbolic',
            });
            titleButton.set_child(btnContent);

            const popover = new Gtk.Popover();
            popover.add_css_class('menu');
            const popBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin_top: 6, margin_bottom: 6 });

            const createMenuBtn = (label, actionCb, isDestructive = false) => {
                const btn = new Gtk.Button({ css_classes: ['flat'], halign: Gtk.Align.FILL });
                const lbl = new Gtk.Label({ label: label, halign: Gtk.Align.START, margin_start: 12, margin_end: 12, margin_top: 6, margin_bottom: 6 });
                btn.set_child(lbl);
                if (isDestructive) {
                    btn.add_css_class('error');
                    lbl.add_css_class('error');
                }
                btn.connect('clicked', () => {
                    popover.popdown();
                    actionCb();
                });
                return btn;
            };

            popBox.append(createMenuBtn('Date & Time Format', () => {
                const dfDialog = new DateTimeFormatDialog(this);
                dfDialog.present(this);
            }));

            popBox.append(createMenuBtn('Theme', () => {
                const thDialog = new ThemeDialog(this);
                thDialog.present(this);
            }));

            popBox.append(new Gtk.Separator({ margin_top: 6, margin_bottom: 6 }));

            popBox.append(createMenuBtn('Reset Database', () => {
                const dialog = new Adw.MessageDialog({
                    heading: 'Reset Database',
                    body: 'Are you sure you want to delete all data?',
                });
                dialog.add_response('cancel', 'Cancel');
                dialog.add_response('reset', 'Reset');
                dialog.set_response_appearance('reset', Adw.ResponseAppearance.DESTRUCTIVE);
                dialog.connect('response', (_, response) => {
                    if (response === 'reset') {
                        resetDatabase();
                        this._refreshTankList();
                    }
                });
                dialog.present(this);
            }, true));

            popover.set_child(popBox);
            titleButton.set_popover(popover);

            this._contentHeader.set_title_widget(titleButton);

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

            this.set_title(tank.name);

            const titleButton = new Gtk.MenuButton({
                css_classes: ['flat'],
            });
            const btnContent = new Adw.ButtonContent({
                label: tank.name,
                icon_name: 'pan-down-symbolic',
            });
            titleButton.set_child(btnContent);

            const popover = new Gtk.Popover();
            popover.add_css_class('menu');
            const popBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin_top: 6, margin_bottom: 6 });

            const createMenuBtn = (label, actionCb, isDestructive = false) => {
                const btn = new Gtk.Button({ css_classes: ['flat'], halign: Gtk.Align.FILL });
                const lbl = new Gtk.Label({ label: label, halign: Gtk.Align.START, margin_start: 12, margin_end: 12, margin_top: 6, margin_bottom: 6 });
                btn.set_child(lbl);
                if (isDestructive) {
                    btn.add_css_class('error');
                    lbl.add_css_class('error');
                }
                btn.connect('clicked', () => {
                    popover.popdown();
                    actionCb();
                });
                return btn;
            };

            popBox.append(createMenuBtn('Edit Tank', () => {
                const editDialog = new EditTankDialog(this, tank);
                editDialog.connect('tank-saved', () => {
                    this._refreshTankList();
                });
                editDialog.present(this);
            }));

            popBox.append(createMenuBtn('Duplicate Tank', () => {
                const dupDialog = new DuplicateTankDialog(this, tank);
                dupDialog.connect('tank-duplicated', () => {
                    this._refreshTankList();
                });
                dupDialog.present(this);
            }));

            popBox.append(new Gtk.Separator({ margin_top: 6, margin_bottom: 6 }));

            popBox.append(createMenuBtn('Delete Tank', () => {
                const dialog = new Adw.MessageDialog({
                    heading: 'Delete Tank',
                    body: 'Are you sure you want all the associated parameters, livestock, livestock updates, tasks, and task activities to be deleted?',
                });
                dialog.add_response('cancel', 'Cancel');
                dialog.add_response('delete', 'Delete');
                dialog.set_response_appearance('delete', Adw.ResponseAppearance.DESTRUCTIVE);
                dialog.connect('response', (_, response) => {
                    if (response === 'delete') {
                        deleteTank(tank.id);
                        this._refreshTankList();
                    }
                });
                dialog.present(this);
            }, true));

            popover.set_child(popBox);
            titleButton.set_popover(popover);

            this._contentHeader.set_title_widget(titleButton);

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

            // Connect signal for multi-select mode on parameter view
            const paramView = dashboard.stack.get_child_by_name('parameters');
            if (paramView) {
                paramView.connect('notify::isMultiSelectMode', () => {
                    this._updateHeaderButtons(dashboard.stack);
                });
            }

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
            // -- Clear existing back button, toggle mode buttons (start) --
            if (this._backButton) {
                console.log(`[Window] Removing back button`);
                this._contentHeader.remove(this._backButton);
                this._backButton = null;
            }
            if (this._multiSelectButton) {
                this._contentHeader.remove(this._multiSelectButton);
                this._multiSelectButton = null;
            }

            if (!stack) return;

            const visibleChild = stack.visible_child;
            const visibleName = stack.get_visible_child_name();

            // -- Add Action Button (End) --
            let btn = null;

            if (visibleName === 'parameters') {
                if (visibleChild && visibleChild.isMultiSelectMode) {
                    btn = new Gtk.Button({
                        label: 'Analyze',
                        css_classes: ['suggested-action'],
                    });
                    btn.connect('clicked', () => {
                        visibleChild.openAnalysis();
                    });
                } else {
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
                        dialog.present(this);
                    });
                }
            } else if (visibleName === 'livestock') {
                btn = new Gtk.Button({
                    label: 'Add Inhabitant',
                    css_classes: ['suggested-action'],
                });
                btn.connect('clicked', () => {
                    if (visibleChild && typeof visibleChild.openAddLivestock === 'function') {
                        visibleChild.openAddLivestock();
                    }
                });
            } else if (visibleName === 'tasks') {
                btn = new Gtk.Button({
                    label: 'Add Task',
                    css_classes: ['suggested-action'],
                });
                btn.connect('clicked', () => {
                    if (visibleChild && typeof visibleChild.openCreateTaskDialog === 'function') {
                        visibleChild.openCreateTaskDialog();
                    }
                });
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
                        if (this._multiSelectButton) this._multiSelectButton.visible = false;
                    } else {
                        backBtn.visible = false;
                        if (this._multiSelectButton) this._multiSelectButton.visible = true;
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

            // -- Add Multi Select Button (Start) --
            if (visibleName === 'parameters') {
                const multiBtn = new Gtk.Button({
                    icon_name: 'object-select-symbolic',
                    tooltip_text: 'Select Parameters for Analyzing'
                });

                // Add an active class if currently toggled
                if (visibleChild && visibleChild.isMultiSelectMode) {
                    multiBtn.add_css_class('suggested-action');
                }

                multiBtn.connect('clicked', () => {
                    if (visibleChild && typeof visibleChild.toggleMultiSelectMode === 'function') {
                        visibleChild.toggleMultiSelectMode();
                    }
                });

                // Only visible when on the root page
                if (visibleChild && visibleChild.navigationView) {
                    const navView = visibleChild.navigationView;
                    if (navView.visible_page && navView.visible_page.tag !== 'root') {
                        multiBtn.visible = false;
                    }
                }

                this._contentHeader.pack_start(multiBtn);
                this._multiSelectButton = multiBtn;
            }
        }

        addToast(toast) {
            this._toastOverlay.add_toast(toast);
        }
    }
);
