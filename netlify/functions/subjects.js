// netlify/functions/subjects.js
const { getPool, ok, err, headers, verifyToken } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  const pool = getPool();
  const path = event.path.replace('/.netlify/functions/subjects', '').replace('/api/subjects', '');
  const body = event.body ? JSON.parse(event.body) : {};
  const parts = path.split('/').filter(Boolean);
  const qs = event.queryStringParameters || {};

  // GET /subjects?school=X&class=Y
  if (event.httpMethod === 'GET' && parts.length === 0) {
    try {
      const school = await pool.query('SELECT id FROM schools WHERE name=$1', [qs.school]);
      if (!school.rows.length) return ok([]);
      const cls = await pool.query('SELECT id FROM classes WHERE school_id=$1 AND name=$2', [school.rows[0].id, qs.class]);
      if (!cls.rows.length) return ok([]);
      const subjects = await pool.query('SELECT * FROM subjects WHERE school_id=$1 AND class_id=$2 ORDER BY sort_order,id', [school.rows[0].id, cls.rows[0].id]);
      const result = [];
      for (const sub of subjects.rows) {
        const chapters = await pool.query('SELECT * FROM chapters WHERE subject_id=$1 ORDER BY sort_order,id', [sub.id]);
        const chaps = [];
        for (const ch of chapters.rows) {
          const quizzes = await pool.query('SELECT id,name,quiz_file_name,questions FROM quizzes WHERE chapter_id=$1 ORDER BY id', [ch.id]);
          chaps.push({ ...ch, quizzes: quizzes.rows.map(q => ({ ...q, hasFile: !!q.quiz_file_name })) });
        }
        result.push({ ...sub, chapters: chaps });
      }
      return ok(result);
    } catch (e) { console.error(e); return err('Server error', 500); }
  }

  // POST /subjects
  if (event.httpMethod === 'POST' && parts.length === 0) {
    try {
      const { school_name, class_name, icon, name, description } = body;
      const school = await pool.query('SELECT id FROM schools WHERE name=$1', [school_name]);
      if (!school.rows.length) return err('School рдирд╣реАрдВ рдорд┐рд▓реА', 404);
      const cls = await pool.query('SELECT id FROM classes WHERE school_id=$1 AND name=$2', [school.rows[0].id, class_name]);
      if (!cls.rows.length) return err('Class рдирд╣реАрдВ рдорд┐рд▓реА', 404);
      const r = await pool.query('INSERT INTO subjects(school_id,class_id,icon,name,description) VALUES($1,$2,$3,$4,$5) RETURNING *',
        [school.rows[0].id, cls.rows[0].id, icon || 'ЁЯУЦ', name, description || '']);
      return ok(r.rows[0]);
    } catch (e) { return err('Server error', 500); }
  }

  // PUT /subjects/:id
  if (event.httpMethod === 'PUT' && parts.length === 1 && !isNaN(parts[0])) {
    try {
      // Get current first
      const cur = await pool.query('SELECT * FROM subjects WHERE id=$1', [parts[0]]);
      if (!cur.rows.length) return err('Not found', 404);
      const s = cur.rows[0];
      await pool.query('UPDATE subjects SET icon=$1,name=$2,description=$3 WHERE id=$4',
        [body.icon ?? s.icon, body.name ?? s.name, body.description ?? s.description, parts[0]]);
      return ok({ ok: true });
    } catch (e) { return err('Server error', 500); }
  }

  // DELETE /subjects/:id
  if (event.httpMethod === 'DELETE' && parts.length === 1 && !isNaN(parts[0])) {
    try {
      await pool.query('DELETE FROM subjects WHERE id=$1', [parts[0]]);
      return ok({ ok: true });
    } catch (e) { return err('Server error', 500); }
  }

  // POST /subjects/:id/chapters
  if (event.httpMethod === 'POST' && parts.length === 2 && parts[1] === 'chapters') {
    try {
      const r = await pool.query('INSERT INTO chapters(subject_id,name,description) VALUES($1,$2,$3) RETURNING *',
        [parts[0], body.name, body.description || '']);
      return ok(r.rows[0]);
    } catch (e) { return err('Server error', 500); }
  }

  // DELETE /subjects/chapters/:id
  if (event.httpMethod === 'DELETE' && parts.length === 2 && parts[0] === 'chapters') {
    try {
      await pool.query('DELETE FROM chapters WHERE id=$1', [parts[1]]);
      return ok({ ok: true });
    } catch (e) { return err('Server error', 500); }
  }

  return err('Not found', 404);
};

