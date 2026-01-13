// Global state
let editingTaskId = null;

// Load tasks on page load
document.addEventListener("DOMContentLoaded", () => {
  loadTasks();
});

// Load all tasks
async function loadTasks() {
  try {
    const response = await fetch("/api/tasks");
    const result = await response.json();

    const container = document.getElementById("tasks-container");

    if (result.success && result.data.length > 0) {
      container.innerHTML = result.data
        .map(
          (task) => `
                <div class="task-item">
                    <div class="task-content">
                        <div class="task-title">${escapeHtml(task.title)}</div>
                        <div class="task-description">${escapeHtml(
                          task.description || "No description"
                        )}</div>
                        <div class="task-meta">
                            <span class="status-badge status-${
                              task.status
                            }">${task.status.replace("_", " ")}</span>
                            <span>Created: ${task.created_at}</span>
                            <span>ID: ${task.id}</span>
                        </div>
                    </div>
                    <div class="task-actions">
                        <button class="btn btn-edit" onclick="editTask(${
                          task.id
                        })">Edit</button>
                        <button class="btn btn-danger" onclick="deleteTask(${
                          task.id
                        })">Delete</button>
                    </div>
                </div>
            `
        )
        .join("");
    } else {
      container.innerHTML =
        '<div class="empty-state">No tasks found. Create your first task!</div>';
    }
  } catch (error) {
    console.error("Error loading tasks:", error);
    document.getElementById("tasks-container").innerHTML =
      '<div class="empty-state">Error loading tasks</div>';
  }
}

// Create or update task
document.getElementById("task-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("title").value;
  const description = document.getElementById("description").value;
  const status = document.getElementById("status").value;

  try {
    const taskData = { title, description, status };

    let response;
    if (editingTaskId) {
      response = await fetch(`/api/tasks/${editingTaskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      });
    } else {
      response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      });
    }

    const result = await response.json();

    if (result.success) {
      resetForm();
      loadTasks();
    } else {
      alert("Error: " + result.error);
    }
  } catch (error) {
    console.error("Error saving task:", error);
    alert("Error saving task");
  }
});

// Edit task
async function editTask(id) {
  try {
    const response = await fetch(`/api/tasks/${id}`);
    const result = await response.json();

    if (result.success) {
      const task = result.data;
      editingTaskId = id;

      document.getElementById("task-id").value = id;
      document.getElementById("title").value = task.title;
      document.getElementById("description").value = task.description || "";
      document.getElementById("status").value = task.status;

      document.getElementById("form-title").textContent = "Edit Task";
      document.getElementById("submit-btn").textContent = "Update Task";
      document.getElementById("cancel-btn").style.display = "inline-block";
    }
  } catch (error) {
    console.error("Error loading task:", error);
  }
}

// Delete task
async function deleteTask(id) {
  if (!confirm("Are you sure you want to delete this task?")) {
    return;
  }

  try {
    const response = await fetch(`/api/tasks/${id}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (result.success) {
      loadTasks();
    } else {
      alert("Error: " + result.error);
    }
  } catch (error) {
    console.error("Error deleting task:", error);
    alert("Error deleting task");
  }
}

// Cancel edit
document.getElementById("cancel-btn").addEventListener("click", resetForm);

function resetForm() {
  editingTaskId = null;
  document.getElementById("task-form").reset();
  document.getElementById("task-id").value = "";
  document.getElementById("form-title").textContent = "Create New Task";
  document.getElementById("submit-btn").textContent = "Create Task";
  document.getElementById("cancel-btn").style.display = "none";
}

// Execute SQL
document.getElementById("execute-sql").addEventListener("click", async () => {
  const sql = document.getElementById("sql-input").value;

  if (!sql.trim()) {
    alert("Please enter a SQL query");
    return;
  }

  try {
    const response = await fetch("/api/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql }),
    });

    const result = await response.json();

    const resultDiv = document.getElementById("sql-result");
    resultDiv.className = "sql-result";
    resultDiv.innerHTML = `<pre>${JSON.stringify(result, null, 2)}</pre>`;

    // Reload tasks if it was a mutation query
    if (
      sql.trim().toUpperCase().startsWith("INSERT") ||
      sql.trim().toUpperCase().startsWith("UPDATE") ||
      sql.trim().toUpperCase().startsWith("DELETE")
    ) {
      loadTasks();
    }
  } catch (error) {
    console.error("Error executing SQL:", error);
    document.getElementById(
      "sql-result"
    ).innerHTML = `<pre>Error: ${error.message}</pre>`;
  }
});

// Utility function to escape HTML
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
