import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import Gda from 'gi://Gda';

let _connection = null;

export function initDatabase() {
    try {
        const dataDir = GLib.get_user_data_dir();
        const dbDir = GLib.build_filenamev([dataDir, 'villepreux']);
        const dbPath = GLib.build_filenamev([dbDir, 'aquarium.db']);

        if (!GLib.file_test(dbDir, GLib.FileTest.IS_DIR)) {
            GLib.mkdir_with_parents(dbDir, 0o755);
        }

        const dsn = `SQLite://DB_DIR=${dbDir};DB_NAME=aquarium`;
        // Gda 6.0 usage:
        // open_from_string (provider, connection_string, auth_string, options)
        // Or connection_open_from_string
        // Simple file based: 'SQLite:DB_DIR=...;DB_NAME=...'

        // Note: Gda might require provider to be loaded. setup via provider object?
        // Let's us try standard connection string.

        _connection = new Gda.Connection({
            provider: Gda.Config.get_provider('SQLite'),
            cnc_string: `DB_DIR=${dbDir};DB_NAME=aquarium`
        });

        _connection.open();

        console.log(`Database connected at ${dbPath}`);

        _createTables();
    } catch (e) {
        console.error('Failed to initialize database:', e);
        // Fallback or error handling
    }
}

function _createTables() {
    if (!_connection) return;

    const queries = [
        `CREATE TABLE IF NOT EXISTS tanks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            volume REAL,
            type TEXT,
            setup_date TEXT,
            image_path TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS parameters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tank_id INTEGER,
            type TEXT,
            value REAL,
            date_logged TEXT,
            notes TEXT,
            FOREIGN KEY(tank_id) REFERENCES tanks(id)
        )`,
        `CREATE TABLE IF NOT EXISTS species_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            common_name TEXT,
            scientific_name TEXT,
            max_size_cm REAL,
            temp_min REAL,
            temp_max REAL,
            ph_min REAL,
            ph_max REAL,
            api_source_id INTEGER
        )`,
        `CREATE TABLE IF NOT EXISTS livestock (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tank_id INTEGER,
            species_id INTEGER,
            nickname TEXT,
            purchase_date TEXT,
            status TEXT,
            FOREIGN KEY(tank_id) REFERENCES tanks(id),
            FOREIGN KEY(species_id) REFERENCES species_cache(id)
        )`,
        `CREATE TABLE IF NOT EXISTS livestock_timeline (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            livestock_id INTEGER,
            date TEXT,
            image_path TEXT,
            length_cm REAL,
            note TEXT,
            FOREIGN KEY(livestock_id) REFERENCES livestock(id)
        )`,
        `CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tank_id INTEGER,
            title TEXT,
            recurrence_days INTEGER,
            last_completed TEXT,
            next_due TEXT,
            FOREIGN KEY(tank_id) REFERENCES tanks(id)
        )`
    ];

    queries.forEach(query => {
        try {
            _connection.execute_non_select_command(query, null);
        } catch (e) {
            console.error('Error creating table:', e);
        }
    });
}

export function createTank(tankData) {
    if (!_connection) {
        console.error('Database not initialized');
        return;
    }

    // tankData: { name, volume, type, setupDate }
    // Prepared statement usage in Gda is verbose. Using builder or simple string construction for MVP carefully.
    // For MVP/Proto, we'll simple execute.
    // WARNING: SQL Injection risk if not sanitized. Using quick string interpolation for prototype ONLY.
    // TODO: Use Gda.Statement/Builder.

    const sql = `INSERT INTO tanks (name, volume, type, setup_date) VALUES ('${tankData.name}', ${tankData.volume}, '${tankData.type}', '${tankData.setupDate}')`;

    try {
        _connection.execute_non_select_command(sql, null);
        console.log('Tank created');
    } catch (e) {
        console.error('Failed to create tank:', e);
    }
}
