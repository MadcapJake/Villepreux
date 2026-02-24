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
            console.log(`[DashboardView] Initializing for tank: ${tank.id}`);
            this.tank = tank;

            this._stack = new Adw.ViewStack();

            // Parameters Tab
            const paramView = new ParameterView(tank);
            this._stack.add_titled(paramView, 'parameters', 'Parameters');
            this._stack.get_page(paramView).set_icon_name('thermometer-symbolic');

            // Livestock Tab
            const livestockView = new LivestockView(tank);
            this._stack.add_titled(livestockView, 'livestock', 'Livestock');
            this._stack.get_page(livestockView).set_icon_name('fish-symbolic');

            // Tasks Tab
            const taskView = new TaskView(tank);
            this._stack.add_titled(taskView, 'tasks', 'Tasks');
            this._stack.get_page(taskView).set_icon_name('task-due-symbolic');

            this.set_child(this._stack);
        }

        get stack() {
            return this._stack;
        }
    }
);
