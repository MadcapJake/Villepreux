import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import { VillepreuxWindow } from './window.js';
import { initDatabase } from './database.js';

export const VillepreuxApp = GObject.registerClass(
    class VillepreuxApp extends Adw.Application {
        _init() {
            super._init({
                application_id: 'com.github.madcapjake.Villepreux',
                flags: Gio.ApplicationFlags.FLAGS_NONE,
            });
        }

        vfunc_activate() {
            let window = this.active_window;

            if (!window) {
                window = new VillepreuxWindow(this);
            }

            window.present();
        }

        vfunc_startup() {
            super.vfunc_startup();
            console.log('Villepreux starting up...');

            // Initialize database
            initDatabase();
        }
    }
);

export function main(argv) {
    const app = new VillepreuxApp();
    return app.run(argv);
}
