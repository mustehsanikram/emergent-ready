const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = data?.error || data?.errors?.[0]?.msg || `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data;
}

export const api = {
  // Projects
  getProjects: () => request('/projects'),
  getProject: (id) => request(`/projects/${id}`),
  createProject: (payload) =>
    request('/projects', { method: 'POST', body: JSON.stringify(payload) }),
  updateProject: (id, payload) =>
    request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),

  // Tasks
  getTasks: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/tasks${qs ? `?${qs}` : ''}`);
  },
  createTask: (payload) => request('/tasks', { method: 'POST', body: JSON.stringify(payload) }),
  updateTask: (id, payload) =>
    request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
};
