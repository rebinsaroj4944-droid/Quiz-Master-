// netlify/functions/users.js
const { getPool, ok, err, headers, verifyToken } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  const pool = getPool();
  const path = event.path.replace('/.netlify/functions/users', '').replace('/api/users', '');
  const body = event.body ? JSON.parse(event.body) : {};
  const parts = path.split('/').filter(Boolean);
  const qs = event.queryStringParameters || {};
  const decoded = verifyToken(event);
  if (!decoded) return err('Unauthorized', 401);

  // GET /users?school=X
  if (event.httpMethod === 'GET' && parts.length === 0) {
    try {
      const school = await pool.query('SELECT id FROM schools WHERE name=$1', [qs.school]);
      if (!school.rows.length) return ok([]);
      const r = await pool.query(`
        SELECT u.id,u.name,u.phone,u.status,c.name as class_name
        FROM users u LEFT JOIN classes c ON u.class_id=c.id
        WHERE u.school_id=$1 ORDER BY c.name,u.name
      `, [school.rows[0].id]);
      return ok(r.rows);
    } catch (e) { return err('Server error', 500); }
  }

  // PUT /users/:id/status
  if (event.httpMethod === 'PUT' && parts.length === 2 && parts[1] === 'status') {
    try {
      const { status } = body;
      if (!['approved', 'rejected', 'pending'].includes(status))
        return err('Invalid status');
      await pool.query('UPDATE users SET status=$1 WHERE id=$2', [status, parts[0]]);
      return ok({ ok: true });
    } catch (e) { return err('Server error', 500); }
  }

  return err('Not found', 404);
};

