import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import { ParameterView } from './ParameterView.js';
import { LivestockView } from './LivestockView.js';
import { TaskView } from './TaskView.js';

export const DashboardView = GObject.registerClass(
    class DashboardView extends Adw.Bin {
        _init(tank) {
            super._init();
            this.tank = tank;

            const box = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
            });

            // View Switcher Bar (we'll place it at the top or bottom depending on layout preferences,
            // but standard Adwaita pattern often puts it in the HeaderBar. 
            // However, since we are inside a content view, a separate ViewSwitcherBar or 
            // just a ViewSwitcher in a box is appropriate.

            // Let's us use a ViewSwitcher directly in the UI for now, possibly at the top.

            const stack = new Adw.ViewStack();

            // Parameters Tab
            const paramView = new ParameterView(tank);
            stack.add_titled(paramView, 'parameters', 'Parameters');
            // Check icon availability or use text
            stack.get_page(paramView).set_icon_name('water-drop-symbolic'); // assuming standard icon or custom

            // Livestock Tab
            const livestockView = new LivestockView(tank);
            stack.add_titled(livestockView, 'livestock', 'Livestock');
            stack.get_page(livestockView).set_icon_name('fish-symbolic'); // fallback if needed

            // Tasks Tab
            const taskView = new TaskView(tank);
            stack.add_titled(taskView, 'tasks', 'Tasks');
            stack.get_page(taskView).set_icon_name('task-due-symbolic');

            const switcher = new Adw.ViewSwitcher({
                stack: stack,
                policy: Adw.ViewSwitcherPolicy.WIDE,
            });

            // Wrap switcher in a box or just append
            // Usually headerbar handles switcher title, but here we are inside the window content.
            // We can place the switcher at the top of this view.

            box.append(switcher);
            box.append(stack);

            // Make stack expand
            stack.vexpand = true;

            this.set_child(box);
        }
    }
);
