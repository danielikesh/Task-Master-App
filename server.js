require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const compression = require('compression');
const db = require('./database');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(compression());
app.use(bodyParser.json());
app.use(express.static('public'));

// ============= TASK ROUTES =============

app.get('/api/tasks', (req, res) => {
    const { status, priority, category, search } = req.query;
    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params = [];

    if (status) {
        query += ' AND status = ?';
        params.push(status);
    }
    if (priority) {
        query += ' AND priority = ?';
        params.push(priority);
    }
    if (category) {
        query += ' AND category = ?';
        params.push(category);
    }
    if (search) {
        query += ' AND (title LIKE ? OR description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.get('/api/tasks/:id', (req, res) => {
    db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(row);
    });
});

app.post('/api/tasks', (req, res) => {
    const { title, description, status, priority, tags, due_date, category } = req.body;

    db.run(
        `INSERT INTO tasks (title, description, status, priority, tags, due_date, category) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`, [title, description, status || 'todo', priority || 'medium', tags || '', due_date, category || 'general'],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            // Log activity
            logActivity('create', 'task', this.lastID, `Created task: ${title}`);

            res.json({ id: this.lastID, message: 'Task created successfully' });
        }
    );
});

app.put('/api/tasks/:id', (req, res) => {
    const { title, description, status, priority, tags, due_date, category, time_spent } = req.body;

    db.run(
        `UPDATE tasks 
     SET title = ?, description = ?, status = ?, priority = ?, tags = ?, 
         due_date = ?, category = ?, time_spent = ?, updated_at = CURRENT_TIMESTAMP 
     WHERE id = ?`, [title, description, status, priority, tags, due_date, category, time_spent || 0, req.params.id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            logActivity('update', 'task', req.params.id, `Updated task: ${title}`);
            res.json({ message: 'Task updated successfully' });
        }
    );
});

app.patch('/api/tasks/:id/status', (req, res) => {
    const { status } = req.body;

    const completedAt = status === 'done' ? 'CURRENT_TIMESTAMP' : 'NULL';

    db.run(
        `UPDATE tasks 
     SET status = ?, completed_at = ${completedAt}, updated_at = CURRENT_TIMESTAMP 
     WHERE id = ?`, [status, req.params.id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            if (status === 'done') {
                logActivity('complete', 'task', req.params.id, 'Completed task');
            }

            res.json({ message: 'Status updated successfully' });
        }
    );
});

app.delete('/api/tasks/:id', (req, res) => {
    db.run('DELETE FROM tasks WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        logActivity('delete', 'task', req.params.id, 'Deleted task');
        res.json({ message: 'Task deleted successfully' });
    });
});

// ============= NOTES ROUTES =============

app.get('/api/notes', (req, res) => {
    const { search, category } = req.query;
    let query = 'SELECT * FROM notes WHERE 1=1';
    const params = [];

    if (category) {
        query += ' AND category = ?';
        params.push(category);
    }
    if (search) {
        query += ' AND (title LIKE ? OR content LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY is_pinned DESC, created_at DESC';

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/notes', (req, res) => {
    const { title, content, color, category, is_pinned } = req.body;

    db.run(
        'INSERT INTO notes (title, content, color, category, is_pinned) VALUES (?, ?, ?, ?, ?)', [title, content, color || '#ffd700', category || 'general', is_pinned || 0],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            logActivity('create', 'note', this.lastID, `Created note: ${title}`);
            res.json({ id: this.lastID, message: 'Note created successfully' });
        }
    );
});

app.put('/api/notes/:id', (req, res) => {
    const { title, content, color, category, is_pinned } = req.body;

    db.run(
        `UPDATE notes 
     SET title = ?, content = ?, color = ?, category = ?, is_pinned = ?, updated_at = CURRENT_TIMESTAMP 
     WHERE id = ?`, [title, content, color, category, is_pinned, req.params.id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ message: 'Note updated successfully' });
        }
    );
});

app.patch('/api/notes/:id/pin', (req, res) => {
    const { is_pinned } = req.body;

    db.run(
        'UPDATE notes SET is_pinned = ? WHERE id = ?', [is_pinned, req.params.id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ message: 'Note pin status updated' });
        }
    );
});

app.delete('/api/notes/:id', (req, res) => {
    db.run('DELETE FROM notes WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        logActivity('delete', 'note', req.params.id, 'Deleted note');
        res.json({ message: 'Note deleted successfully' });
    });
});

// ============= STATISTICS ROUTES =============

app.get('/api/statistics', (req, res) => {
    const stats = {};

    // Get task statistics
    db.get(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) as todo,
      SUM(time_spent) as total_time
    FROM tasks
  `, [], (err, taskStats) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        stats.tasks = taskStats;

        // Get notes count
        db.get('SELECT COUNT(*) as total FROM notes', [], (err, noteStats) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            stats.notes = noteStats;

            // Get priority breakdown
            db.all(`
        SELECT priority, COUNT(*) as count 
        FROM tasks 
        GROUP BY priority
      `, [], (err, priorityStats) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }

                stats.priority = priorityStats;

                // Get category breakdown
                db.all(`
          SELECT category, COUNT(*) as count 
          FROM tasks 
          GROUP BY category
        `, [], (err, categoryStats) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }

                    stats.categories = categoryStats;

                    // Get tasks completed today
                    db.get(`
            SELECT COUNT(*) as count 
            FROM tasks 
            WHERE DATE(completed_at) = DATE('now')
          `, [], (err, todayStats) => {
                        if (err) {
                            res.status(500).json({ error: err.message });
                            return;
                        }

                        stats.completedToday = todayStats.count;

                        res.json(stats);
                    });
                });
            });
        });
    });
});

// ============= ACTIVITY LOG ROUTES =============

app.get('/api/activity', (req, res) => {
    db.all(
        'SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 50', [],
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows);
        }
    );
});

// ============= POMODORO ROUTES =============

app.post('/api/pomodoro', (req, res) => {
    const { task_id, duration, completed } = req.body;

    db.run(
        'INSERT INTO pomodoro_sessions (task_id, duration, completed) VALUES (?, ?, ?)', [task_id, duration, completed || 0],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID, message: 'Pomodoro session saved' });
        }
    );
});

// ============= SETTINGS ROUTES =============

app.get('/api/settings', (req, res) => {
    db.all('SELECT * FROM settings', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        const settings = {};
        rows.forEach(row => {
            settings[row.key] = row.value;
        });

        res.json(settings);
    });
});

app.put('/api/settings/:key', (req, res) => {
    const { value } = req.body;

    db.run(
        'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)', [req.params.key, value],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ message: 'Setting updated successfully' });
        }
    );
});

// ============= EXPORT/IMPORT ROUTES =============

app.get('/api/export', (req, res) => {
    const exportData = {};

    db.all('SELECT * FROM tasks', [], (err, tasks) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        exportData.tasks = tasks;

        db.all('SELECT * FROM notes', [], (err, notes) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            exportData.notes = notes;
            exportData.exportDate = new Date().toISOString();

            res.json(exportData);
        });
    });
});

// ============= HELPER FUNCTIONS =============

function logActivity(actionType, itemType, itemId, description) {
    db.run(
        'INSERT INTO activity_log (action_type, item_type, item_id, description) VALUES (?, ?, ?, ?)', [actionType, itemType, itemId, description],
        (err) => {
            if (err) console.error('Error logging activity:', err);
        }
    );
}

// ============= START SERVER =============

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   🚀 TaskMaster Pro Enhanced Edition   ║
║                                        ║
║   Server: http://localhost:${PORT}       ║
║   Status: ✅ Running                    ║
║   Database: ✅ Connected                ║
╚════════════════════════════════════════╝
  `);
});