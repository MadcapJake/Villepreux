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
        `CREATE TABLE IF NOT EXISTS parameter_definitions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tank_id INTEGER,
            name TEXT,
            min_value REAL,
            max_value REAL,
            unit TEXT,
            FOREIGN KEY(tank_id) REFERENCES tanks(id)
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
            _connection.execute_non_select_command(query);
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
    const sql = `INSERT INTO tanks (name, volume, type, setup_date) VALUES ('${tankData.name}', ${tankData.volume}, '${tankData.type}', '${tankData.setupDate}')`;
    try {
        _connection.execute_non_select_command(sql);
        console.log('Tank created');
    } catch (e) {
        console.error('Failed to create tank:', e);
    }
}

export function getTanks() {
    if (!_connection) return [];
    try {
        const dm = _connection.execute_select_command('SELECT * FROM tanks ORDER BY id DESC');
        const numRows = dm.get_n_rows();
        const tanks = [];
        for (let i = 0; i < numRows; i++) {
            tanks.push({
                id: dm.get_value_at(0, i),
                name: dm.get_value_at(1, i),
                volume: dm.get_value_at(2, i),
                type: dm.get_value_at(3, i),
                setupDate: dm.get_value_at(4, i),
                imagePath: dm.get_value_at(5, i)
            });
        }
        return tanks;
    } catch (e) {
        console.error('Failed to get tanks:', e);
        return [];
    }
}

export function getParameterDefinitions(tankId) {
    if (!_connection) return [];
    try {
        const sql = `SELECT * FROM parameter_definitions WHERE tank_id = ${tankId} ORDER BY name ASC`;
        const dm = _connection.execute_select_command(sql);
        const numRows = dm.get_n_rows();
        const defs = [];
        for (let i = 0; i < numRows; i++) {
            defs.push({
                id: dm.get_value_at(0, i),
                tank_id: dm.get_value_at(1, i),
                name: dm.get_value_at(2, i),
                min_value: dm.get_value_at(3, i),
                max_value: dm.get_value_at(4, i),
                unit: dm.get_value_at(5, i)
            });
        }
        return defs;
    } catch (e) {
        console.error('Failed to get parameter definitions:', e);
        return [];
    }
}

export function upsertParameterDefinition(def) {
    if (!_connection) return null;
    try {
        let sql;
        if (def.id) {
            // Update
            sql = `UPDATE parameter_definitions SET name='${def.name}', min_value=${def.min_value}, max_value=${def.max_value}, unit='${def.unit}' WHERE id=${def.id}`;
        } else {
            // Insert
            sql = `INSERT INTO parameter_definitions (tank_id, name, min_value, max_value, unit) VALUES (${def.tank_id}, '${def.name}', ${def.min_value}, ${def.max_value}, '${def.unit}')`;
        }
        _connection.execute_non_select_command(sql);

        // Return latest id if insert? 
        // Simplest to just return;
    } catch (e) {
        console.error('Failed to upsert parameter definition:', e);
        throw e;
    }
}

export function deleteParameterDefinition(id) {
    if (!_connection) return;
    try {
        const sql = `DELETE FROM parameter_definitions WHERE id=${id}`;
        _connection.execute_non_select_command(sql);
    } catch (e) {
        console.error('Failed to delete parameter definition:', e);
    }
}
