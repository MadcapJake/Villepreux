import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import * as DB from '../database.js';

export const GlobalDashboardView = GObject.registerClass(
    class GlobalDashboardView extends Adw.Bin {
        _init() {
            super._init();

            this._navView = new Adw.NavigationView();

            const rootPage = new Adw.NavigationPage({
                title: 'Global Dashboard',
                tag: 'root',
            });

            const scroll = new Gtk.ScrolledWindow({
                hscrollbar_policy: Gtk.PolicyType.NEVER,
            });

            const clamp = new Adw.Clamp({
                maximum_size: 600, // Narrower for single column
                margin_top: 24,
                margin_bottom: 24,
                margin_start: 12,
                margin_end: 12,
            });

            const mainBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 24,
            });

            // --- Header ---
            const headerBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 6,
                css_classes: ['p-12'],
            });
            const titleLabel = new Gtk.Label({
                label: 'Aquarium Calendar',
                css_classes: ['title-1'],
                halign: Gtk.Align.START,
            });
            const subtitleLabel = new Gtk.Label({
                label: 'Overview of all tanks, tasks, and test results.',
                css_classes: ['body', 'dim-label'],
                halign: Gtk.Align.START,
            });
            headerBox.append(titleLabel);
            headerBox.append(subtitleLabel);
            mainBox.append(headerBox);


            // --- Calendar Button (for HeaderBar) ---
            this._calendar = new Gtk.Calendar({
                show_week_numbers: false,
                show_day_names: true,
                show_heading: true,
            });
            this._calendar.connect('day-selected', () => {
                this._onDaySelected();
            });

            const calendarPopover = new Gtk.Popover({
                child: this._calendar,
            });

            this._calendarButton = new Gtk.MenuButton({
                icon_name: 'x-office-calendar-symbolic',
                tooltip_text: 'Select Date',
                popover: calendarPopover,
                css_classes: ['flat'],
                visible: true,
            });

            // --- Day Details View ---
            this._detailsBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 12,
                hexpand: true,
                valign: Gtk.Align.START,
            });
            this._updateDetailsPlaceholder();

            mainBox.append(this._detailsBox);

            clamp.set_child(mainBox);
            scroll.set_child(clamp);
            rootPage.set_child(scroll);

            this._navView.add(rootPage);
            this.set_child(this._navView);

            // Initial load for today
            this._onDaySelected();
        }

        get navigationView() {
            return this._navView;
        }

        get headerButton() {
            return this._calendarButton;
        }

        _onDaySelected() {
            const date = this._calendar.get_date();
            // In GTK4, get_date returns a GLib.DateTime
            const formattedDate = date.format('%Y-%m-%d');

            console.log(`[GlobalDashboard] Selected Date: ${formattedDate}`);

            this._refreshDetails(formattedDate);
        }

        _updateDetailsPlaceholder() {
            let child = this._detailsBox.get_first_child();
            while (child) {
                this._detailsBox.remove(child);
                child = this._detailsBox.get_first_child();
            }
            const placeholder = new Adw.StatusPage({
                title: 'No Events',
                description: 'Select a day to view tasks and test results.',
                icon_name: 'calendar-symbolic',
            });
            this._detailsBox.append(placeholder);
        }

        _refreshDetails(dateStr) {
            let child = this._detailsBox.get_first_child();
            while (child) {
                this._detailsBox.remove(child);
                child = this._detailsBox.get_first_child();
            }

            // --- Title ---
            const title = new Gtk.Label({
                label: `Events for ${dateStr}`,
                css_classes: ['title-3'],
                halign: Gtk.Align.START,
                margin_bottom: 12,
            });
            this._detailsBox.append(title);

            const parameters = DB.getParametersByDate(dateStr);
            const tasks = DB.getTasksByDate(dateStr);
            const livestockEvents = DB.getLivestockEventsByDate(dateStr);

            let hasData = false;

            if (parameters.length > 0) {
                hasData = true;
                const paramGroup = new Adw.PreferencesGroup({ title: 'Test Results' });
                parameters.forEach(p => {
                    const unit = p.unit ? ` ${p.unit}` : '';
                    const row = new Adw.ActionRow({
                        title: `${p.type}: ${p.value}${unit}`,
                        subtitle: `Tank: ${p.tank_name}`,
                        icon_name: 'water-drop-symbolic',
                    });
                    paramGroup.add(row);
                });
                this._detailsBox.append(paramGroup);
            }

            if (tasks.due.length > 0) {
                hasData = true;
                const dueGroup = new Adw.PreferencesGroup({ title: 'Tasks Due' });
                tasks.due.forEach(t => {
                    const row = new Adw.ActionRow({
                        title: t.title,
                        subtitle: `Tank: ${t.tank_name}`,
                        icon_name: 'task-due-symbolic',
                    });
                    dueGroup.add(row);
                });
                this._detailsBox.append(dueGroup);
            }

            if (tasks.completed.length > 0) {
                hasData = true;
                const completedGroup = new Adw.PreferencesGroup({ title: 'Tasks Completed' });
                tasks.completed.forEach(t => {
                    const row = new Adw.ActionRow({
                        title: t.title,
                        subtitle: `Tank: ${t.tank_name}`,
                        icon_name: 'emblem-ok-symbolic',
                    });
                    completedGroup.add(row);
                });
                this._detailsBox.append(completedGroup);
            }

            if (livestockEvents.purchased.length > 0) {
                hasData = true;
                const purGroup = new Adw.PreferencesGroup({ title: 'Livestock Purchased' });
                livestockEvents.purchased.forEach(l => {
                    const row = new Adw.ActionRow({
                        title: l.name || 'Unnamed',
                        subtitle: `Tank: ${l.tank_name}`,
                        icon_name: 'list-add-symbolic',
                    });
                    purGroup.add(row);
                });
                this._detailsBox.append(purGroup);
            }

            if (livestockEvents.introduced.length > 0) {
                hasData = true;
                const intGroup = new Adw.PreferencesGroup({ title: 'Livestock Introduced' });
                livestockEvents.introduced.forEach(l => {
                    const row = new Adw.ActionRow({
                        title: l.name || 'Unnamed',
                        subtitle: `Tank: ${l.tank_name}`,
                        icon_name: 'go-down-symbolic',
                    });
                    intGroup.add(row);
                });
                this._detailsBox.append(intGroup);
            }

            if (!hasData) {
                const group = new Adw.PreferencesGroup();
                const emptyRow = new Adw.ActionRow({
                    title: 'No Data',
                    subtitle: 'No tests or tasks recorded for this date.',
                });
                group.add(emptyRow);
                this._detailsBox.append(group);
            }
        }
    }
);
