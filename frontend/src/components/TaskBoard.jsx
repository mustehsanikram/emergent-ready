import { useState } from 'react';
import { api } from '../api';

const COLUMNS = [
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
];

const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High' };

export default function TaskBoard({ projectId, tasks, onTasksChanged, onError }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim() || !projectId) return;

    setSubmitting(true);
    try {
      await api.createTask({ project_id: projectId, title: title.trim(), priority });
      setTitle('');
      setPriority('medium');
      await onTasksChanged();
    } catch (err) {
      onError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (task, status) => {
    try {
      await api.updateTask(task.id, { status });
      await onTasksChanged();
    } catch (err) {
      onError(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteTask(id);
      await onTasksChanged();
    } catch (err) {
      onError(err.message);
    }
  };

  if (!projectId) {
    return (
      <main className="board">
        <p className="empty-hint">Select or create a project to see its tasks.</p>
      </main>
    );
  }

  return (
    <main className="board">
      <form className="new-task-form" onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="What needs to be done?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={submitting}
        />
        <select value={priority} onChange={(e) => setPriority(e.target.value)} disabled={submitting}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button type="submit" disabled={submitting || !title.trim()}>
          Add task
        </button>
      </form>

      <div className="board-columns">
        {COLUMNS.map((col) => (
          <div className="board-column" key={col.key}>
            <h3>
              {col.label} <span className="column-count">{tasks.filter((t) => t.status === col.key).length}</span>
            </h3>
            <div className="column-tasks">
              {tasks
                .filter((t) => t.status === col.key)
                .map((task) => (
                  <div className="task-card" key={task.id}>
                    <div className="task-card-top">
                      <span className={`priority-dot priority-${task.priority}`} title={PRIORITY_LABELS[task.priority]} />
                      <span className="task-title">{task.title}</span>
                      <button className="icon-btn" onClick={() => handleDelete(task.id)} title="Delete task">
                        ×
                      </button>
                    </div>
                    <div className="task-card-actions">
                      {COLUMNS.filter((c) => c.key !== task.status).map((c) => (
                        <button
                          key={c.key}
                          className="pill-btn"
                          onClick={() => handleStatusChange(task, c.key)}
                        >
                          → {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              {tasks.filter((t) => t.status === col.key).length === 0 && (
                <p className="empty-hint">Nothing here</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
