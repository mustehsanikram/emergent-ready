const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../db');

const router = express.Router();

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

// GET /api/projects - list all projects with task counts
router.get('/', (req, res) => {
  const projects = db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) AS task_count,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') AS done_count
    FROM projects p
    ORDER BY p.created_at DESC
  `).all();
  res.json(projects);
});

// GET /api/projects/:id
router.get('/:id', [param('id').isInt()], handleValidation, (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

// POST /api/projects
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('name is required').isLength({ max: 200 }),
    body('description').optional().trim().isLength({ max: 2000 }),
  ],
  handleValidation,
  (req, res) => {
    const { name, description = '' } = req.body;
    const result = db
      .prepare('INSERT INTO projects (name, description) VALUES (?, ?)')
      .run(name, description);
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(project);
  }
);

// PUT /api/projects/:id
router.put(
  '/:id',
  [
    param('id').isInt(),
    body('name').optional().trim().notEmpty().isLength({ max: 200 }),
    body('description').optional().trim().isLength({ max: 2000 }),
  ],
  handleValidation,
  (req, res) => {
    const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Project not found' });

    const name = req.body.name ?? existing.name;
    const description = req.body.description ?? existing.description;

    db.prepare(
      `UPDATE projects SET name = ?, description = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(name, description, req.params.id);

    const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    res.json(updated);
  }
);

// DELETE /api/projects/:id
router.delete('/:id', [param('id').isInt()], handleValidation, (req, res) => {
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Project not found' });

  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

module.exports = router;
