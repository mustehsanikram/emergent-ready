import { useState } from 'react';
import { api } from '../api';

export default function ProjectSidebar({
  projects,
  selectedProjectId,
  onSelect,
  onProjectsChanged,
  onError,
}) {
  const [newName, setNewName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;

    setSubmitting(true);
    try {
      const project = await api.createProject({ name });
      setNewName('');
      await onProjectsChanged();
      onSelect(project.id);
    } catch (err) {
      onError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this project and all its tasks?')) return;
    try {
      await api.deleteProject(id);
      if (selectedProjectId === id) onSelect(null);
      await onProjectsChanged();
    } catch (err) {
      onError(err.message);
    }
  };

  return (
    <aside className="sidebar">
      <h2 className="sidebar-title">Projects</h2>
      <ul className="project-list">
        {projects.map((p) => (
          <li
            key={p.id}
            className={`project-item ${p.id === selectedProjectId ? 'active' : ''}`}
            onClick={() => onSelect(p.id)}
          >
            <div className="project-item-main">
              <span className="project-name">{p.name}</span>
              <span className="project-progress">
                {p.done_count}/{p.task_count}
              </span>
            </div>
            <button
              className="icon-btn"
              title="Delete project"
              onClick={(e) => handleDelete(p.id, e)}
            >
              ×
            </button>
          </li>
        ))}
        {projects.length === 0 && <li className="empty-hint">No projects yet</li>}
      </ul>

      <form className="new-project-form" onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="New project name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          disabled={submitting}
        />
        <button type="submit" disabled={submitting || !newName.trim()}>
          Add
        </button>
      </form>
    </aside>
  );
}
