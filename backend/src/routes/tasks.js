const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const db = require('../db');

const router = express.Router();

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

const STATUSES = ['todo', 'in_progress', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];

// GET /api/tasks - list tasks, optionally filtered by project_id / status
router.get(
  '/',
  [
    query('project_id').optional().isInt(),
    query('status').optional().isIn(STATUSES),
  ],
  handleValidation,
  (req, res) => {
    const { project_id, status } = req.query;
    let sql = 'SELECT * FROM tasks WHERE 1=1';
    const params = [];

    if (project_id) {
      sql += ' AND project_id = ?';
      params.push(project_id);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    sql += " ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, created_at DESC";

    const tasks = db.prepare(sql).all(...params);
    res.json(tasks);
  }
);

// GET /api/tasks/:id
router.get('/:id', [param('id').isInt()], handleValidation, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

// POST /api/tasks
router.post(
  '/',
  [
    body('project_id').isInt().withMessage('project_id is required'),
    body('title').trim().notEmpty().withMessage('title is required').isLength({ max: 300 }),
    body('notes').optional().trim().isLength({ max: 5000 }),
    body('status').optional().isIn(STATUSES),
    body('priority').optional().isIn(PRIORITIES),
    body('due_date').optional().isISO8601(),
  ],
  handleValidation,
  (req, res) => {
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.body.project_id);
    if (!project) return res.status(400).json({ error: 'project_id does not reference an existing project' });

    const {
      project_id,
      title,
      notes = '',
      status = 'todo',
      priority = 'medium',
      due_date = null,
    } = req.body;

    const result = db
      .prepare(
        `INSERT INTO tasks (project_id, title, notes, status, priority, due_date)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(project_id, title, notes, status, priority, due_date);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(task);
  }
);

// PUT /api/tasks/:id
router.put(
  '/:id',
  [
    param('id').isInt(),
    body('title').optional().trim().notEmpty().isLength({ max: 300 }),
    body('notes').optional().trim().isLength({ max: 5000 }),
    body('status').optional().isIn(STATUSES),
    body('priority').optional().isIn(PRIORITIES),
    body('due_date').optional({ nullable: true }).isISO8601(),
  ],
  handleValidation,
  (req, res) => {
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    const title = req.body.title ?? existing.title;
    const notes = req.body.notes ?? existing.notes;
    const status = req.body.status ?? existing.status;
    const priority = req.body.priority ?? existing.priority;
    const due_date = req.body.due_date !== undefined ? req.body.due_date : existing.due_date;

    db.prepare(
      `UPDATE tasks SET title = ?, notes = ?, status = ?, priority = ?, due_date = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(title, notes, status, priority, due_date, req.params.id);

    const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    res.json(updated);
  }
);

// DELETE /api/tasks/:id
router.delete('/:id', [param('id').isInt()], handleValidation, (req, res) => {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

module.exports = router;
