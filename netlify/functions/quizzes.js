// netlify/functions/quizzes.js
const { getPool, ok, err, headers, verifyToken } = require('./db');

function injectPostMsg(html) {
  const pm = `\nif(window.parent!==window){var _g=typeof pct!=='undefined'?(pct>=90?'A+':pct>=75?'A':pct>=60?'B':pct>=45?'C':'D'):'?';window.parent.postMessage({type:'quizScore',score:typeof correct!=='undefined'?correct:0,total:typeof questions!=='undefined'?questions.length:0,pct:typeof pct!=='undefined'?pct:0,grade:_g},'*');}`;
  const idx = html.lastIndexOf('</script>');
  return idx !== -1 ? html.slice(0, idx) + pm + html.slice(idx) : html;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  const pool = getPool();
  const path = event.path.replace('/.netlify/functions/quizzes', '').replace('/api/quizzes', '');
  const body = event.body ? JSON.parse(event.body) : {};
  const parts = path.split('/').filter(Boolean);

  // GET /quizzes/file/:id — serve quiz HTML
  if (event.httpMethod === 'GET' && parts.length === 2 && parts[0] === 'file') {
    try {
      const r = await pool.query('SELECT quiz_file_data FROM quizzes WHERE id=$1', [parts[1]]);
      if (!r.rows.length || !r.rows[0].quiz_file_data)
        return { statusCode: 404, headers: { ...headers, 'Content-Type': 'text/html' }, body: '<h1>Quiz not found</h1>' };
      return { statusCode: 200, headers: { ...headers, 'Content-Type': 'text/html' }, body: r.rows[0].quiz_file_data };
    } catch (e) { return err('Server error', 500); }
  }

  // POST /quizzes — add quiz
  if (event.httpMethod === 'POST' && parts.length === 0) {
    try {
      const { chapter_id, name, quiz_file_data, quiz_file_name, questions } = body;
      if (!chapter_id || !name) return err('chapter_id and name required');
      let fileData = quiz_file_data || null;
      if (fileData && !fileData.includes("type:'quizScore'") && !fileData.includes('type:"quizScore"'))
        fileData = injectPostMsg(fileData);
      const r = await pool.query(
        'INSERT INTO quizzes(chapter_id,name,quiz_file_data,quiz_file_name,questions) VALUES($1,$2,$3,$4,$5) RETURNING id,name,quiz_file_name',
        [chapter_id, name, fileData, quiz_file_name || null, JSON.stringify(questions || [])]
      );
      return ok({ ...r.rows[0], hasFile: !!quiz_file_name });
    } catch (e) { console.error(e); return err('Server error', 500); }
  }

  // DELETE /quizzes/:id
  if (event.httpMethod === 'DELETE' && parts.length === 1 && !isNaN(parts[0])) {
    try {
      await pool.query('DELETE FROM quizzes WHERE id=$1', [parts[0]]);
      return ok({ ok: true });
    } catch (e) { return err('Server error', 500); }
  }

  return err('Not found', 404);
};

