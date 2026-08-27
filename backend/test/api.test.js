const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Use an isolated temp DB for tests so we don't touch dev data
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taskflow-test-'));
process.env.DATA_DIR = tmpDir;
process.env.DB_PATH = path.join(tmpDir, 'test.db');

const createApp = require('../src/app');
const app = createApp();

// Minimal request helper using Node's built-in http via supertest-free approach
const http = require('http');

function request(server, method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: server.address().port,
        path: urlPath,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let chunks = '';
        res.on('data', (c) => (chunks += c));
        res.on('end', () => {
          let parsed;
          try {
            parsed = chunks ? JSON.parse(chunks) : null;
          } catch {
            parsed = chunks;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

test('health check responds ok', async () => {
  const server = app.listen(0);
  try {
    const res = await request(server, 'GET', '/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
  } finally {
    server.close();
  }
});

test('project CRUD lifecycle', async () => {
  const server = app.listen(0);
  try {
    const created = await request(server, 'POST', '/api/projects', {
      name: 'Test Project',
      description: 'A project for testing',
    });
    assert.strictEqual(created.status, 201);
    assert.strictEqual(created.body.name, 'Test Project');
    const id = created.body.id;

    const fetched = await request(server, 'GET', `/api/projects/${id}`);
    assert.strictEqual(fetched.status, 200);
    assert.strictEqual(fetched.body.id, id);

    const updated = await request(server, 'PUT', `/api/projects/${id}`, { name: 'Renamed' });
    assert.strictEqual(updated.status, 200);
    assert.strictEqual(updated.body.name, 'Renamed');

    const deleted = await request(server, 'DELETE', `/api/projects/${id}`);
    assert.strictEqual(deleted.status, 204);

    const notFound = await request(server, 'GET', `/api/projects/${id}`);
    assert.strictEqual(notFound.status, 404);
  } finally {
    server.close();
  }
});

test('project creation requires a name', async () => {
  const server = app.listen(0);
  try {
    const res = await request(server, 'POST', '/api/projects', { description: 'no name' });
    assert.strictEqual(res.status, 400);
  } finally {
    server.close();
  }
});

test('task CRUD lifecycle and project linkage', async () => {
  const server = app.listen(0);
  try {
    const project = await request(server, 'POST', '/api/projects', { name: 'Task Project' });
    const projectId = project.body.id;

    const created = await request(server, 'POST', '/api/tasks', {
      project_id: projectId,
      title: 'Write tests',
      priority: 'high',
    });
    assert.strictEqual(created.status, 201);
    assert.strictEqual(created.body.status, 'todo');
    const taskId = created.body.id;

    const listed = await request(server, 'GET', `/api/tasks?project_id=${projectId}`);
    assert.strictEqual(listed.status, 200);
    assert.strictEqual(listed.body.length, 1);

    const updated = await request(server, 'PUT', `/api/tasks/${taskId}`, { status: 'done' });
    assert.strictEqual(updated.status, 200);
    assert.strictEqual(updated.body.status, 'done');

    const deleted = await request(server, 'DELETE', `/api/tasks/${taskId}`);
    assert.strictEqual(deleted.status, 204);
  } finally {
    server.close();
  }
});

test('task creation rejects invalid project_id', async () => {
  const server = app.listen(0);
  try {
    const res = await request(server, 'POST', '/api/tasks', {
      project_id: 999999,
      title: 'Orphan task',
    });
    assert.strictEqual(res.status, 400);
  } finally {
    server.close();
  }
});
