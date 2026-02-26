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

        const imageDir = GLib.build_filenamev([dbDir, 'images']);
        if (!GLib.file_test(imageDir, GLib.FileTest.IS_DIR)) {
            GLib.mkdir_with_parents(imageDir, 0o755);
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
            name TEXT,
            scientific_name TEXT,
            type TEXT,
            introduced_date TEXT,
            quantity INTEGER,
            source TEXT,
            purchase_date TEXT,
            cost REAL,
            notes TEXT,
            image_path TEXT,
            status TEXT,
            FOREIGN KEY(tank_id) REFERENCES tanks(id)
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
        `CREATE TABLE IF NOT EXISTS livestock_updates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            livestock_id INTEGER,
            log_date TEXT,
            note TEXT,
            measurable1 REAL,
            measurable2 REAL,
            image_filename TEXT,
            FOREIGN KEY(livestock_id) REFERENCES livestock(id)
        )`,
        `CREATE TABLE IF NOT EXISTS parameter_definitions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tank_id INTEGER,
            name TEXT,
            min_value REAL,
            max_value REAL,
            unit TEXT,
            color TEXT DEFAULT '#3584e4',
            FOREIGN KEY(tank_id) REFERENCES tanks(id)
        )`,
        `CREATE TABLE IF NOT EXISTS task_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tank_id INTEGER,
            equipment_id INTEGER,
            category TEXT,
            title TEXT,
            instructions TEXT,
            schedule_type TEXT,
            interval_value INTEGER,
            next_due_date TEXT,
            notification_time TEXT,
            status TEXT DEFAULT 'Active',
            FOREIGN KEY(tank_id) REFERENCES tanks(id)
        )`,
        `CREATE TABLE IF NOT EXISTS task_activities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_template_id INTEGER,
            execution_date TEXT,
            action_taken TEXT,
            notes TEXT,
            FOREIGN KEY(task_template_id) REFERENCES task_templates(id)
        )`
    ];

    queries.forEach(query => {
        try {
            _connection.execute_non_select_command(query);
        } catch (e) {
            console.error('Error creating table:', e);
        }
    });

    // Migrate existing tables
    try {
        _connection.execute_non_select_command(`ALTER TABLE task_templates ADD COLUMN notification_time TEXT`);
    } catch (e) {
        // Ignore duplicate column errors if it already exists
    }

    try {
        _connection.execute_non_select_command(`ALTER TABLE livestock ADD COLUMN image_path TEXT`);
    } catch (e) {
        // Ignore duplicate column errors if it already exists
    }

    try {
        _connection.execute_non_select_command(`ALTER TABLE livestock ADD COLUMN measurable1_label TEXT`);
    } catch (e) { }
    try {
        _connection.execute_non_select_command(`ALTER TABLE livestock ADD COLUMN measurable1_unit TEXT`);
    } catch (e) { }
    try {
        _connection.execute_non_select_command(`ALTER TABLE livestock ADD COLUMN measurable2_label TEXT`);
    } catch (e) { }
    try {
        _connection.execute_non_select_command(`ALTER TABLE livestock ADD COLUMN measurable2_unit TEXT`);
    } catch (e) { }
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
        console.log(`[DB] getParameterDefinitions SQL: ${sql}`);
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
                unit: dm.get_value_at(5, i),
                color: dm.get_value_at(6, i) || '#3584e4'
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
        const color = def.color || '#3584e4';
        if (def.id) {
            // Update
            sql = `UPDATE parameter_definitions SET name='${def.name}', min_value=${def.min_value}, max_value=${def.max_value}, unit='${def.unit}', color='${color}' WHERE id=${def.id}`;
        } else {
            // Insert
            sql = `INSERT INTO parameter_definitions (tank_id, name, min_value, max_value, unit, color) VALUES (${def.tank_id}, '${def.name}', ${def.min_value}, ${def.max_value}, '${def.unit}', '${color}')`;
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

export function getLivestock(tankId) {
    if (!_connection) return [];
    try {
        const sql = `SELECT id, tank_id, name, scientific_name, type, introduced_date, quantity, source, purchase_date, cost, notes, image_path, status, measurable1_label, measurable1_unit, measurable2_label, measurable2_unit FROM livestock WHERE tank_id = ${tankId} ORDER BY name ASC`;
        console.log(`[DB] getLivestock SQL: ${sql}`);
        const dm = _connection.execute_select_command(sql);
        const numRows = dm.get_n_rows();
        const items = [];
        for (let i = 0; i < numRows; i++) {
            items.push({
                id: dm.get_value_at(0, i),
                tank_id: dm.get_value_at(1, i),
                name: dm.get_value_at(2, i),
                scientific_name: dm.get_value_at(3, i),
                type: dm.get_value_at(4, i),
                introduced_date: dm.get_value_at(5, i),
                quantity: dm.get_value_at(6, i),
                source: dm.get_value_at(7, i),
                purchase_date: dm.get_value_at(8, i),
                cost: dm.get_value_at(9, i),
                notes: dm.get_value_at(10, i),
                image_path: dm.get_value_at(11, i),
                status: dm.get_value_at(12, i),
                measurable1_label: dm.get_value_at(13, i),
                measurable1_unit: dm.get_value_at(14, i),
                measurable2_label: dm.get_value_at(15, i),
                measurable2_unit: dm.get_value_at(16, i)
            });
        }
        return items;
    } catch (e) {
        console.error('Failed to get livestock:', e);
        return [];
    }
}

export function upsertLivestock(item) {
    if (!_connection) return null;
    try {
        let sql;
        // Sanitize? For prototype we use direct interpolation but strictly this is unsafe.
        // We assume trusted input for now.
        const name = item.name || '';
        const scientific_name = item.scientific_name || '';
        const type = item.type || '';
        const introduced_date = item.introduced_date || '';
        const quantity = item.quantity || 1;
        const source = item.source || '';
        const purchase_date = item.purchase_date || '';
        const cost = item.cost || 0.0;
        const notes = item.notes || '';
        const image_path = item.image_path || '';
        const status = item.status || 'Alive';
        const measurable1_label = item.measurable1_label ? item.measurable1_label.replace(/'/g, "''") : '';
        const measurable1_unit = item.measurable1_unit ? item.measurable1_unit.replace(/'/g, "''") : '';
        const measurable2_label = item.measurable2_label ? item.measurable2_label.replace(/'/g, "''") : '';
        const measurable2_unit = item.measurable2_unit ? item.measurable2_unit.replace(/'/g, "''") : '';

        if (item.id) {
            // Update
            sql = `UPDATE livestock SET 
                name='${name}', 
                scientific_name='${scientific_name}', 
                type='${type}', 
                introduced_date='${introduced_date}', 
                quantity=${quantity}, 
                source='${source}', 
                purchase_date='${purchase_date}', 
                cost=${cost}, 
                notes='${notes}', 
                image_path='${image_path}', 
                status='${status}',
                measurable1_label='${measurable1_label}',
                measurable1_unit='${measurable1_unit}',
                measurable2_label='${measurable2_label}',
                measurable2_unit='${measurable2_unit}'
                WHERE id=${item.id}`;
        } else {
            // Insert
            sql = `INSERT INTO livestock (tank_id, name, scientific_name, type, introduced_date, quantity, source, purchase_date, cost, notes, image_path, status, measurable1_label, measurable1_unit, measurable2_label, measurable2_unit) 
                VALUES (${item.tank_id}, '${name}', '${scientific_name}', '${type}', '${introduced_date}', ${quantity}, '${source}', '${purchase_date}', ${cost}, '${notes}', '${image_path}', '${status}', '${measurable1_label}', '${measurable1_unit}', '${measurable2_label}', '${measurable2_unit}')`;
        }
        _connection.execute_non_select_command(sql);
    } catch (e) {
        console.error('Failed to upsert livestock:', e);
        throw e;
    }
}

export function deleteLivestock(id) {
    if (!_connection) return;
    try {
        const sql = `DELETE FROM livestock WHERE id=${id}`;
        _connection.execute_non_select_command(sql);
    } catch (e) {
        console.error('Failed to delete livestock:', e);
    }
}

export function getLivestockUpdates(livestockId) {
    if (!_connection) return [];
    try {
        const sql = `SELECT id, livestock_id, log_date, note, measurable1, measurable2, image_filename FROM livestock_updates WHERE livestock_id = ${livestockId} ORDER BY log_date DESC, id DESC`;
        const dm = _connection.execute_select_command(sql);
        const numRows = dm.get_n_rows();
        const items = [];
        for (let i = 0; i < numRows; i++) {
            items.push({
                id: dm.get_value_at(0, i),
                livestock_id: dm.get_value_at(1, i),
                log_date: dm.get_value_at(2, i),
                note: dm.get_value_at(3, i),
                measurable1: dm.get_value_at(4, i),
                measurable2: dm.get_value_at(5, i),
                image_filename: dm.get_value_at(6, i)
            });
        }
        return items;
    } catch (e) {
        console.error('Failed to get livestock updates:', e);
        return [];
    }
}

export function insertLivestockUpdate(data) {
    if (!_connection) return null;
    try {
        const note = data.note ? data.note.replace(/'/g, "''") : '';
        const img = data.image_filename ? `'${data.image_filename}'` : 'NULL';
        const m1 = typeof data.measurable1 === 'number' ? data.measurable1 : 'NULL';
        const m2 = typeof data.measurable2 === 'number' ? data.measurable2 : 'NULL';
        const logDate = data.log_date || new Date().toISOString().split('T')[0];

        const sql = `INSERT INTO livestock_updates (livestock_id, log_date, note, measurable1, measurable2, image_filename) 
                     VALUES (${data.livestock_id}, '${logDate}', '${note}', ${m1}, ${m2}, ${img})`;
        _connection.execute_non_select_command(sql);
        return true;
    } catch (e) {
        console.error('Failed to insert livestock update:', e);
        return false;
    }
}

export function deleteLivestockUpdate(id) {
    if (!_connection) return;
    try {
        const sql = `DELETE FROM livestock_updates WHERE id=${id}`;
        _connection.execute_non_select_command(sql);
    } catch (e) {
        console.error('Failed to delete livestock update:', e);
    }
}

export function insertParameter(tankId, type, value, dateLogged, notes = '') {
    if (!_connection) return;
    try {
        const sql = `INSERT INTO parameters (tank_id, type, value, date_logged, notes) VALUES (${tankId}, '${type}', ${value}, '${dateLogged}', '${notes}')`;
        _connection.execute_non_select_command(sql);
    } catch (e) {
        console.error('Failed to insert parameter:', e);
        throw e;
    }
}

export function getParametersByDate(dateStr) {
    if (!_connection) return [];
    try {
        const sql = `
            SELECT p.id, p.tank_id, t.name as tank_name, p.type, p.value, pd.unit
            FROM parameters p
            JOIN tanks t ON p.tank_id = t.id
            LEFT JOIN parameter_definitions pd ON p.tank_id = pd.tank_id AND p.type = pd.name
            WHERE p.date_logged LIKE '${dateStr}%'
            ORDER BY t.name ASC, p.type ASC
        `;
        const dm = _connection.execute_select_command(sql);
        const numRows = dm.get_n_rows();
        const results = [];
        for (let i = 0; i < numRows; i++) {
            results.push({
                id: dm.get_value_at(0, i),
                tank_id: dm.get_value_at(1, i),
                tank_name: dm.get_value_at(2, i),
                type: dm.get_value_at(3, i),
                value: dm.get_value_at(4, i),
                unit: dm.get_value_at(5, i)
            });
        }
        return results;
    } catch (e) {
        console.error('Failed to get parameters by date:', e);
        return [];
    }
}

export function getLatestParameterResult(tankId, paramName) {
    if (!_connection) return null;
    try {
        const sql = `
            SELECT value, date_logged
            FROM parameters
            WHERE tank_id = ${tankId} AND type = '${paramName}'
            ORDER BY date_logged DESC, id DESC
            LIMIT 1
        `;
        const dm = _connection.execute_select_command(sql);
        if (dm.get_n_rows() > 0) {
            return {
                value: dm.get_value_at(0, 0),
                date: dm.get_value_at(1, 0)
            };
        }
        return null;
    } catch (e) {
        console.error('Failed to get latest parameter result:', e);
        return null;
    }
}

export function getParameterHistory(tankId, type) {
    if (!_connection) return [];
    try {
        const sql = `
            SELECT id, value, date_logged
            FROM parameters
            WHERE tank_id = ${tankId} AND type = '${type}'
            ORDER BY date_logged DESC, id DESC
        `;
        const dm = _connection.execute_select_command(sql);
        const numRows = dm.get_n_rows();
        const results = [];
        for (let i = 0; i < numRows; i++) {
            results.push({
                id: dm.get_value_at(0, i),
                value: dm.get_value_at(1, i),
                date: dm.get_value_at(2, i)
            });
        }
        return results;
    } catch (e) {
        console.error('Failed to get parameter history:', e);
        return [];
    }
}

export function deleteParameterRecord(id) {
    if (!_connection) return;
    try {
        const sql = `DELETE FROM parameters WHERE id=${id}`;
        _connection.execute_non_select_command(sql);
    } catch (e) {
        console.error('Failed to delete parameter record:', e);
    }
}

export function getTasksByDate(dateStr) {
    if (!_connection) return { due: [], activities: [] };
    try {
        const dueSql = `
            SELECT t.id, tk.id as tank_id, tk.name as tank_name, t.title, t.next_due_date, t.notification_time, t.category
            FROM task_templates t
            JOIN tanks tk ON t.tank_id = tk.id
            WHERE t.next_due_date LIKE '${dateStr}%' AND t.status != 'Archived'
        `;
        let dm = _connection.execute_select_command(dueSql);
        let numRows = dm.get_n_rows();
        const due = [];
        for (let i = 0; i < numRows; i++) {
            due.push({
                id: dm.get_value_at(0, i),
                tank_id: dm.get_value_at(1, i),
                tank_name: dm.get_value_at(2, i),
                title: dm.get_value_at(3, i),
                next_due_date: dm.get_value_at(4, i),
                notification_time: dm.get_value_at(5, i),
                category: dm.get_value_at(6, i)
            });
        }

        const actSql = `
            SELECT a.id, tk.id as tank_id, tk.name as tank_name, t.title, a.action_taken, a.notes, t.category
            FROM task_activities a
            JOIN task_templates t ON a.task_template_id = t.id
            JOIN tanks tk ON t.tank_id = tk.id
            WHERE a.execution_date LIKE '${dateStr}%'
        `;
        dm = _connection.execute_select_command(actSql);
        numRows = dm.get_n_rows();
        const activities = [];
        for (let i = 0; i < numRows; i++) {
            activities.push({
                id: dm.get_value_at(0, i),
                tank_id: dm.get_value_at(1, i),
                tank_name: dm.get_value_at(2, i),
                title: dm.get_value_at(3, i),
                action_taken: dm.get_value_at(4, i),
                notes: dm.get_value_at(5, i),
                category: dm.get_value_at(6, i)
            });
        }

        return { due, activities };
    } catch (e) {
        console.error('Failed to get tasks by date:', e);
        return { due: [], activities: [] };
    }
}

export function getLivestockEventsByDate(dateStr) {
    if (!_connection) return { purchased: [], introduced: [] };
    try {
        const sql = `
            SELECT l.id, t.name as tank_name, l.name, l.purchase_date, l.introduced_date
            FROM livestock l
            JOIN tanks t ON l.tank_id = t.id
            WHERE l.purchase_date LIKE '${dateStr}%' OR l.introduced_date LIKE '${dateStr}%'
        `;
        const dm = _connection.execute_select_command(sql);
        const numRows = dm.get_n_rows();
        const purchased = [];
        const introduced = [];
        for (let i = 0; i < numRows; i++) {
            const purchaseStr = dm.get_value_at(3, i) || '';
            const intStr = dm.get_value_at(4, i) || '';
            const item = {
                id: dm.get_value_at(0, i),
                tank_name: dm.get_value_at(1, i),
                name: dm.get_value_at(2, i)
            };
            if (purchaseStr.startsWith(dateStr)) purchased.push(item);
            if (intStr.startsWith(dateStr)) introduced.push(item);
        }
        return { purchased, introduced };
    } catch (e) {
        console.error('Failed to get livestock events by date:', e);
        return { purchased: [], introduced: [] };
    }
}

export function getEventsInRange(tankId, startDate) {
    if (!_connection) return [];

    // Returns a unified list of events: { date: 'YYYY-MM-DD', label: '...', type: 'task|livestock' }
    const events = [];

    try {
        // 1. Tasks Completed
        const taskSql = `
            SELECT tt.title, ta.execution_date, ta.action_taken
            FROM task_activities ta
            JOIN task_templates tt ON ta.task_template_id = tt.id
            WHERE tt.tank_id = ${tankId} 
              AND ta.execution_date >= '${startDate}' 
        `;
        const taskDm = _connection.execute_select_command(taskSql);
        for (let i = 0; i < taskDm.get_n_rows(); i++) {
            events.push({
                type: 'task',
                label: `${taskDm.get_value_at(2, i)} Task: ${taskDm.get_value_at(0, i)}`,
                date: taskDm.get_value_at(1, i).split('T')[0] // normalize
            });
        }

        // 2. Livestock Introduced
        const lsSql = `
            SELECT name, introduced_date
            FROM livestock
            WHERE tank_id = ${tankId}
              AND introduced_date >= '${startDate}'
              AND introduced_date IS NOT NULL AND introduced_date != ''
        `;
        const lsDm = _connection.execute_select_command(lsSql);
        for (let i = 0; i < lsDm.get_n_rows(); i++) {
            events.push({
                type: 'livestock',
                label: `Introduced Livestock: ${lsDm.get_value_at(0, i)}`,
                date: lsDm.get_value_at(1, i).split('T')[0]
            });
        }

        // 3. Livestock Purchased (if different from introduced?)
        // Skip for now to avoid duplicates if they are the same date.

    } catch (e) {
        console.error('Failed to get events in range:', e);
    }

    return events;
}

// ==========================================
// Task Scheduler DAO
// ==========================================

export function getTaskTemplates(tankId) {
    if (!_connection) return [];
    try {
        const sql = `SELECT id, tank_id, equipment_id, category, title, instructions, schedule_type, interval_value, next_due_date, notification_time, status FROM task_templates WHERE tank_id = ${tankId} AND status = 'Active' ORDER BY category ASC, next_due_date ASC`;
        const dm = _connection.execute_select_command(sql);
        const numRows = dm.get_n_rows();
        const results = [];
        for (let i = 0; i < numRows; i++) {
            results.push({
                id: dm.get_value_at(0, i),
                tank_id: dm.get_value_at(1, i),
                equipment_id: dm.get_value_at(2, i),
                category: dm.get_value_at(3, i),
                title: dm.get_value_at(4, i),
                instructions: dm.get_value_at(5, i),
                schedule_type: dm.get_value_at(6, i),
                interval_value: dm.get_value_at(7, i),
                next_due_date: dm.get_value_at(8, i),
                notification_time: dm.get_value_at(9, i),
                status: dm.get_value_at(10, i)
            });
        }
        return results;
    } catch (e) {
        console.error('Failed to get task templates:', e);
        return [];
    }
}

export function getArchivedTaskTemplates(tankId) {
    if (!_connection) return [];
    try {
        const sql = `SELECT id, tank_id, equipment_id, category, title, instructions, schedule_type, interval_value, next_due_date, notification_time, status FROM task_templates WHERE tank_id = ${tankId} AND status = 'Archived' ORDER BY category ASC, next_due_date ASC`;
        const dm = _connection.execute_select_command(sql);
        const numRows = dm.get_n_rows();
        const results = [];
        for (let i = 0; i < numRows; i++) {
            results.push({
                id: dm.get_value_at(0, i),
                tank_id: dm.get_value_at(1, i),
                equipment_id: dm.get_value_at(2, i),
                category: dm.get_value_at(3, i),
                title: dm.get_value_at(4, i),
                instructions: dm.get_value_at(5, i),
                schedule_type: dm.get_value_at(6, i),
                interval_value: dm.get_value_at(7, i),
                next_due_date: dm.get_value_at(8, i),
                notification_time: dm.get_value_at(9, i),
                status: dm.get_value_at(10, i)
            });
        }
        return results;
    } catch (e) {
        console.error('Failed to get archived task templates:', e);
        return [];
    }
}

export function upsertTaskTemplate(task) {
    if (!_connection) return;
    try {
        const title = task.title ? task.title.replace(/'/g, "''") : '';
        const ins = task.instructions ? task.instructions.replace(/'/g, "''") : '';
        const eqId = task.equipment_id || 'NULL';
        const intVal = task.interval_value || 'NULL';
        const notifTime = task.notification_time ? `'${task.notification_time}'` : 'NULL';
        let sql;

        if (task.id) {
            sql = `UPDATE task_templates SET 
                equipment_id=${eqId}, category='${task.category}', title='${title}', instructions='${ins}', 
                schedule_type='${task.schedule_type}', interval_value=${intVal}, next_due_date='${task.next_due_date}',
                notification_time=${notifTime}
                WHERE id=${task.id}`;
        } else {
            sql = `INSERT INTO task_templates (tank_id, equipment_id, category, title, instructions, schedule_type, interval_value, next_due_date, notification_time, status) 
                   VALUES (${task.tank_id}, ${eqId}, '${task.category}', '${title}', '${ins}', '${task.schedule_type}', ${intVal}, '${task.next_due_date}', ${notifTime}, 'Active')`;
        }
        _connection.execute_non_select_command(sql);
    } catch (e) {
        console.error('Failed to upsert task template:', e);
    }
}

export function archiveTaskTemplate(templateId) {
    if (!_connection) return;
    try {
        const sql = `UPDATE task_templates SET status='Archived' WHERE id=${templateId}`;
        _connection.execute_non_select_command(sql);
    } catch (e) {
        console.error('Failed to archive task template:', e);
    }
}

export function copyTaskTemplate(templateId, targetTankId) {
    if (!_connection) return;
    try {
        const fetchSql = `SELECT category, title, instructions, schedule_type, interval_value, next_due_date FROM task_templates WHERE id=${templateId}`;
        const dm = _connection.execute_select_command(fetchSql);
        if (dm.get_n_rows() > 0) {
            const cat = dm.get_value_at(0, 0);
            const title = dm.get_value_at(1, 0).replace(/'/g, "''");
            const inst = (dm.get_value_at(2, 0) || '').replace(/'/g, "''");
            const type = dm.get_value_at(3, 0);
            const val = dm.get_value_at(4, 0);
            const next = dm.get_value_at(5, 0);

            const insertSql = `INSERT INTO task_templates (tank_id, category, title, instructions, schedule_type, interval_value, next_due_date, status)
                               VALUES (${targetTankId}, '${cat}', '${title}', '${inst}', '${type}', ${val}, '${next}', 'Active')`;
            _connection.execute_non_select_command(insertSql);
        }
    } catch (e) {
        console.error('Failed to copy task template:', e);
    }
}

export function restoreTaskTemplate(id) {
    if (!_connection) return;
    try {
        const sql = `UPDATE task_templates SET status='Active' WHERE id=${id}`;
        _connection.execute_non_select_command(sql);
    } catch (e) {
        console.error('Failed to restore task template:', e);
    }
}

export function permanentlyDeleteTaskTemplate(id) {
    if (!_connection) return;
    try {
        const sqlActs = `DELETE FROM task_activities WHERE task_template_id=${id}`;
        _connection.execute_non_select_command(sqlActs);

        const sql = `DELETE FROM task_templates WHERE id=${id}`;
        _connection.execute_non_select_command(sql);
    } catch (e) {
        console.error('Failed to hard delete task template:', e);
    }
}

export function logTaskActivity(templateId, actionTaken, notes, executionDateStr, nextDueDateStr) {
    if (!_connection) return;
    try {
        const safeNotes = notes ? notes.replace(/'/g, "''") : '';

        // 1. Insert the log entry
        const sqlLog = `INSERT INTO task_activities (task_template_id, execution_date, action_taken, notes) 
                        VALUES (${templateId}, '${executionDateStr}', '${actionTaken}', '${safeNotes}')`;
        _connection.execute_non_select_command(sqlLog);

        // 2. Update the template's next_due_date
        if (nextDueDateStr) {
            const sqlUpdate = `UPDATE task_templates SET next_due_date='${nextDueDateStr}' WHERE id=${templateId}`;
            _connection.execute_non_select_command(sqlUpdate);
        }
    } catch (e) {
        console.error('Failed to log task activity:', e);
    }
}

export function getTaskActivities(templateId) {
    if (!_connection) return [];
    try {
        const sql = `SELECT * FROM task_activities WHERE task_template_id=${templateId} ORDER BY execution_date DESC`;
        const dm = _connection.execute_select_command(sql);
        const numRows = dm.get_n_rows();
        const results = [];
        for (let i = 0; i < numRows; i++) {
            results.push({
                id: dm.get_value_at(0, i),
                task_template_id: dm.get_value_at(1, i),
                execution_date: dm.get_value_at(2, i),
                action_taken: dm.get_value_at(3, i),
                notes: dm.get_value_at(4, i)
            });
        }
        return results;
    } catch (e) {
        console.error('Failed to get task activities:', e);
        return [];
    }
}

export function deleteTaskActivity(activityId) {
    if (!_connection) return;
    try {
        const sql = `DELETE FROM task_activities WHERE id=${activityId}`;
        _connection.execute_non_select_command(sql);
    } catch (e) {
        console.error('Failed to delete task activity:', e);
    }
}
