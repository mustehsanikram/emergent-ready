import { useEffect, useState, useCallback } from 'react';
import { api } from './api';
import ProjectSidebar from './components/ProjectSidebar';
import TaskBoard from './components/TaskBoard';
import './App.css';

export default function App() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProjects = useCallback(async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
      setSelectedProjectId((current) => {
        if (current !== null) return current;
        return data.length > 0 ? data[0].id : null;
      });
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const loadTasks = useCallback(async (projectId) => {
    if (!projectId) {
      setTasks([]);
      return;
    }
    try {
      const data = await api.getTasks({ project_id: projectId });
      setTasks(data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadProjects();
      setLoading(false);
    })();
  }, [loadProjects]);

  useEffect(() => {
    loadTasks(selectedProjectId);
  }, [selectedProjectId, loadTasks]);

  const refreshAll = async () => {
    await loadProjects();
    await loadTasks(selectedProjectId);
  };

  if (loading) {
    return <div className="app-status">Loading TaskFlow…</div>;
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>TaskFlow</h1>
        <p className="app-subtitle">A small project &amp; task manager</p>
      </header>

      {error && (
        <div className="banner banner-error" onClick={() => setError(null)}>
          {error} <span className="banner-dismiss">(dismiss)</span>
        </div>
      )}

      <div className="app-body">
        <ProjectSidebar
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelect={setSelectedProjectId}
          onProjectsChanged={refreshAll}
          onError={setError}
        />
        <TaskBoard
          projectId={selectedProjectId}
          tasks={tasks}
          onTasksChanged={() => loadTasks(selectedProjectId)}
          onError={setError}
        />
      </div>
    </div>
  );
}
