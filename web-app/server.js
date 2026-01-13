const express = require("express");
const path = require("path");
const createDatabase = require("../src/Database");

const app = express();
const db = createDatabase("./data");
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Initialize database with sample table
function initializeDB() {
  const tables = db.listTables();

  if (!tables.includes("tasks")) {
    console.log("Creating tasks table...");
    db.query(`
      CREATE TABLE tasks (
        id INTEGER PRIMARY KEY,
        title TEXT,
        description TEXT,
        status TEXT,
        created_at TEXT
      )
    `);

    // Insert sample data
    db.query(`INSERT INTO tasks (id, title, description, status, created_at) 
              VALUES (1, 'Build RDBMS', 'Complete the Pesapal challenge', 'in_progress', '2026-01-10')`);
    db.query(`INSERT INTO tasks (id, title, description, status, created_at) 
              VALUES (2, 'Write Documentation', 'Document the implementation', 'pending', '2026-01-10')`);

    console.log("Sample data inserted.");
  }
}

// API Routes

// Get all tasks
app.get("/api/tasks", (req, res) => {
  try {
    const result = db.query("SELECT * FROM tasks");

    if (result.success) {
      res.json({ success: true, data: result.rows });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single task
app.get("/api/tasks/:id", (req, res) => {
  try {
    const result = db.query(`SELECT * FROM tasks WHERE id = ${req.params.id}`);

    if (result.success && result.rows.length > 0) {
      res.json({ success: true, data: result.rows[0] });
    } else {
      res.status(404).json({ success: false, error: "Task not found" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new task
app.post("/api/tasks", (req, res) => {
  try {
    const { title, description, status } = req.body;

    if (!title) {
      return res
        .status(400)
        .json({ success: false, error: "Title is required" });
    }

    // Get max ID
    const maxResult = db.query("SELECT * FROM tasks");
    const maxId =
      maxResult.rows.length > 0
        ? Math.max(...maxResult.rows.map((r) => r.id))
        : 0;
    const newId = maxId + 1;

    const created_at = new Date().toISOString().split("T")[0];

    const result = db.query(`
      INSERT INTO tasks (id, title, description, status, created_at) 
      VALUES (${newId}, '${title}', '${description || ""}', '${
      status || "pending"
    }', '${created_at}')
    `);

    if (result.success) {
      const newTask = db.query(`SELECT * FROM tasks WHERE id = ${newId}`);
      res.status(201).json({ success: true, data: newTask.rows[0] });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update task
app.put("/api/tasks/:id", (req, res) => {
  try {
    const { title, description, status } = req.body;
    const id = req.params.id;

    // Build SET clause
    const updates = [];
    if (title !== undefined) updates.push(`title = '${title}'`);
    if (description !== undefined)
      updates.push(`description = '${description}'`);
    if (status !== undefined) updates.push(`status = '${status}'`);

    if (updates.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "No updates provided" });
    }

    const result = db.query(`
      UPDATE tasks 
      SET ${updates.join(", ")} 
      WHERE id = ${id}
    `);

    if (result.success) {
      const updated = db.query(`SELECT * FROM tasks WHERE id = ${id}`);
      res.json({ success: true, data: updated.rows[0] });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete task
app.delete("/api/tasks/:id", (req, res) => {
  try {
    const result = db.query(`DELETE FROM tasks WHERE id = ${req.params.id}`);

    if (result.success) {
      res.json({ success: true, message: "Task deleted" });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Execute raw SQL (for testing)
app.post("/api/query", (req, res) => {
  try {
    const { sql } = req.body;

    if (!sql) {
      return res
        .status(400)
        .json({ success: false, error: "SQL query required" });
    }

    const result = db.query(sql);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get database stats
app.get("/api/stats", (req, res) => {
  try {
    const stats = db.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
initializeDB();

app.listen(PORT, () => {
  console.log(`\n🚀 Web app running at http://localhost:${PORT}`);
  console.log(`📊 Database directory: ./data`);
  console.log(`\nAPI Endpoints:`);
  console.log(`  GET    /api/tasks       - List all tasks`);
  console.log(`  GET    /api/tasks/:id   - Get single task`);
  console.log(`  POST   /api/tasks       - Create task`);
  console.log(`  PUT    /api/tasks/:id   - Update task`);
  console.log(`  DELETE /api/tasks/:id   - Delete task`);
  console.log(`  POST   /api/query       - Execute raw SQL`);
  console.log(`  GET    /api/stats       - Database statistics`);
});

module.exports = app;
