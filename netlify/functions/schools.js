// netlify/functions/schools.js
const { getPool, ok, err, headers, verifyToken } = require('./db');
const GLOBAL_PW = process.env.GLOBAL_ADMIN_PW || 'ReBi5409N@';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  const pool = getPool();
  const path = event.path.replace('/.netlify/functions/schools', '').replace('/api/schools', '');
  const body = event.body ? JSON.parse(event.body) : {};
  const parts = path.split('/').filter(Boolean);

  // GET /schools
  if (event.httpMethod === 'GET' && parts.length === 0) {
    try {
      const schools = await pool.query('SELECT * FROM schools ORDER BY name');
      const classes = await pool.query('SELECT * FROM classes ORDER BY name');
      const result = schools.rows.map(s => ({
        ...s,
        classes: classes.rows.filter(c => c.school_id === s.id)
      }));
      return ok(result);
    } catch (e) { return err('Server error', 500); }
  }

  // POST /schools (add school)
  if (event.httpMethod === 'POST' && parts.length === 0) {
    if (body.password !== GLOBAL_PW) return err('Wrong password', 403);
    try {
      const r = await pool.query('INSERT INTO schools(name) VALUES($1) ON CONFLICT(name) DO NOTHING RETURNING *', [body.name]);
      return ok(r.rows[0] || { name: body.name });
    } catch (e) { return err('Server error', 500); }
  }

  // DELETE /schools/:id
  if (event.httpMethod === 'DELETE' && parts.length === 1 && !isNaN(parts[0])) {
    if (body.password !== GLOBAL_PW) return err('Wrong password', 403);
    try {
      await pool.query('DELETE FROM schools WHERE id=$1', [parts[0]]);
      return ok({ ok: true });
    } catch (e) { return err('Server error', 500); }
  }

  // POST /schools/:id/classes
  if (event.httpMethod === 'POST' && parts.length === 2 && parts[1] === 'classes') {
    if (body.password !== GLOBAL_PW) return err('Wrong password', 403);
    try {
      const r = await pool.query(
        'INSERT INTO classes(school_id,name) VALUES($1,$2) ON CONFLICT(school_id,name) DO NOTHING RETURNING *',
        [parts[0], body.name]
      );
      return ok(r.rows[0] || { school_id: parts[0], name: body.name });
    } catch (e) { return err('Server error', 500); }
  }

  // PUT /schools/:schoolId/classes/:classId/password
  if (event.httpMethod === 'PUT' && parts.length === 4 && parts[1] === 'classes' && parts[3] === 'password') {
    if (body.password !== GLOBAL_PW) return err('Wrong password', 403);
    try {
      await pool.query('UPDATE classes SET admin_password=$1 WHERE id=$2 AND school_id=$3',
        [body.newPassword || null, parts[2], parts[0]]);
      return ok({ ok: true });
    } catch (e) { return err('Server error', 500); }
  }

  // DELETE /schools/:schoolId/classes/:classId
  if (event.httpMethod === 'DELETE' && parts.length === 3 && parts[1] === 'classes') {
    if (body.password !== GLOBAL_PW) return err('Wrong password', 403);
    try {
      await pool.query('DELETE FROM classes WHERE id=$1 AND school_id=$2', [parts[2], parts[0]]);
      return ok({ ok: true });
    } catch (e) { return err('Server error', 500); }
  }

  // POST /schools/verify-class-password
  if (event.httpMethod === 'POST' && path === '/verify-class-password') {
    try {
      const { school_name, class_name, password } = body;
      const r = await pool.query(
        `SELECT c.admin_password FROM classes c JOIN schools s ON c.school_id=s.id WHERE s.name=$1 AND c.name=$2`,
        [school_name, class_name]
      );
      if (!r.rows.length) return ok({ valid: true });
      const stored = r.rows[0].admin_password;
      if (!stored) return ok({ valid: true });
      return ok({ valid: stored === password });
    } catch (e) { return err('Server error', 500); }
  }

  return err('Not found', 404);
};
