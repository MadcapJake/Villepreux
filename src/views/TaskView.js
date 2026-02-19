import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

export const TaskView = GObject.registerClass(
    class TaskView extends Adw.Bin {
        _init(tank) {
            super._init();
            this.tank = tank;

            const scroll = new Gtk.ScrolledWindow({
                hscrollbar_policy: Gtk.PolicyType.NEVER,
            });

            const clamp = new Adw.Clamp({
                maximum_size: 800,
                margin_top: 24,
                margin_bottom: 24,
                margin_start: 12,
                margin_end: 12,
            });

            const mainBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 24,
            });

            // Tasks List
            const tasksGroup = new Adw.PreferencesGroup();

            // Dummy Tasks
            ['Water Change', 'Test Parameters', 'Clean Glass'].forEach(task => {
                const row = new Adw.ActionRow({
                    title: task,
                    subtitle: 'Due: Tomorrow',
                });

                const check = new Gtk.CheckButton({
                    valign: Gtk.Align.CENTER,
                });
                row.add_prefix(check);
                tasksGroup.add(row);
            });

            mainBox.append(tasksGroup);

            clamp.set_child(mainBox);
            scroll.set_child(clamp);
            this.set_child(scroll);
        }
    }
);
