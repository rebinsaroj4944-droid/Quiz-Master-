// netlify/functions/scores.js
const { getPool, ok, err, headers, verifyToken } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  const pool = getPool();
  const path = event.path.replace('/.netlify/functions/scores', '').replace('/api/scores', '');
  const body = event.body ? JSON.parse(event.body) : {};
  const qs = event.queryStringParameters || {};

  // POST /scores — save score
  if (event.httpMethod === 'POST' && path === '') {
    const decoded = verifyToken(event);
    if (!decoded) return err('Unauthorized', 401);
    try {
      const { quiz_id, score, total, pct } = body;
      const user = await pool.query('SELECT school_id,class_id FROM users WHERE id=$1', [decoded.id]);
      if (!user.rows.length) return err('User not found', 404);
      const { school_id, class_id } = user.rows[0];
      await pool.query(`
        INSERT INTO quiz_scores(user_id,quiz_id,school_id,class_id,score,total,pct,attempted_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,NOW())
        ON CONFLICT(user_id,quiz_id) DO UPDATE SET
          score=CASE WHEN $7>quiz_scores.pct THEN $5 ELSE quiz_scores.score END,
          total=CASE WHEN $7>quiz_scores.pct THEN $6 ELSE quiz_scores.total END,
          pct=CASE WHEN $7>quiz_scores.pct THEN $7 ELSE quiz_scores.pct END,
          attempted_at=NOW()
      `, [decoded.id, quiz_id, school_id, class_id, score, total, pct]);
      return ok({ ok: true });
    } catch (e) { console.error(e); return err('Server error', 500); }
  }

  // GET /scores/leaderboard?school=X&class=Y
  if (event.httpMethod === 'GET' && path === '/leaderboard') {
    try {
      const school = await pool.query('SELECT id FROM schools WHERE name=$1', [qs.school]);
      if (!school.rows.length) return ok([]);
      const cls = await pool.query('SELECT id FROM classes WHERE school_id=$1 AND name=$2', [school.rows[0].id, qs.class]);
      if (!cls.rows.length) return ok([]);
      const r = await pool.query(`
        SELECT u.id,u.name,
          COUNT(qs.id) AS quiz_count,
          MAX(qs.pct) AS best_pct,
          ROUND(AVG(qs.pct)) AS avg_pct,
          ROUND(MAX(qs.pct)*2 + COUNT(qs.id)*15 + AVG(qs.pct)*0.5) AS points
        FROM users u
        LEFT JOIN quiz_scores qs ON u.id=qs.user_id AND qs.school_id=$1 AND qs.class_id=$2
        WHERE u.school_id=$1 AND u.class_id=$2 AND u.status='approved'
        GROUP BY u.id,u.name
        HAVING COUNT(qs.id)>0
        ORDER BY points DESC,best_pct DESC
      `, [school.rows[0].id, cls.rows[0].id]);
      return ok(r.rows);
    } catch (e) { return err('Server error', 500); }
  }

  return err('Not found', 404);
};

