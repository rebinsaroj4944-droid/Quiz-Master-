// netlify/functions/site.js
const { getPool, ok, err, headers } = require('./db');
const GLOBAL_PW = process.env.GLOBAL_ADMIN_PW || 'ReBi5409N@';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  const pool = getPool();
  const path = event.path.replace('/.netlify/functions/site', '').replace('/api/site', '');
  const body = event.body ? JSON.parse(event.body) : {};

  // GET /site/settings
  if (event.httpMethod === 'GET' && path === '/settings') {
    try {
      const r = await pool.query('SELECT key,value FROM site_settings');
      const s = {};
      r.rows.forEach(row => { try { s[row.key] = JSON.parse(row.value); } catch { s[row.key] = row.value; } });
      return ok(s);
    } catch (e) { return err('Server error', 500); }
  }

  // POST /site/settings
  if (event.httpMethod === 'POST' && path === '/settings') {
    if (body.password !== GLOBAL_PW) return err('Wrong password', 403);
    try {
      for (const [key, value] of Object.entries(body.settings || {})) {
        const val = typeof value === 'string' ? value : JSON.stringify(value);
        await pool.query(
          'INSERT INTO site_settings(key,value,updated_at) VALUES($1,$2,NOW()) ON CONFLICT(key) DO UPDATE SET value=$2,updated_at=NOW()',
          [key, val]
        );
      }
      return ok({ ok: true });
    } catch (e) { return err('Server error', 500); }
  }

  // GET /site/school/:name
  if (event.httpMethod === 'GET' && path.startsWith('/school/')) {
    const name = decodeURIComponent(path.replace('/school/', ''));
    try {
      const school = await pool.query('SELECT id FROM schools WHERE name=$1', [name]);
      if (!school.rows.length) return ok({});
      const r = await pool.query('SELECT * FROM school_settings WHERE school_id=$1', [school.rows[0].id]);
      if (!r.rows.length) return ok({});
      const s = r.rows[0];
      return ok({ title: s.title, tagline: s.tagline, shayari: s.shayari, ctaBtn: s.cta_btn, about: s.about, content: s.content, bannerPhoto: s.banner_photo, colors: s.colors, bodyFont: s.body_font, headingFont: s.heading_font, boxes: s.boxes });
    } catch (e) { return err('Server error', 500); }
  }

  // POST /site/school/:name
  if (event.httpMethod === 'POST' && path.startsWith('/school/')) {
    const name = decodeURIComponent(path.replace('/school/', ''));
    try {
      const school = await pool.query('SELECT id FROM schools WHERE name=$1', [name]);
      if (!school.rows.length) return err('School नहीं मिली', 404);
      const d = body.data || {};
      await pool.query(`
        INSERT INTO school_settings(school_id,title,tagline,shayari,cta_btn,about,content,banner_photo,colors,body_font,heading_font,boxes,updated_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
        ON CONFLICT(school_id) DO UPDATE SET title=$2,tagline=$3,shayari=$4,cta_btn=$5,about=$6,content=$7,banner_photo=$8,colors=$9,body_font=$10,heading_font=$11,boxes=$12,updated_at=NOW()
      `, [school.rows[0].id, d.title, d.tagline, d.shayari, d.ctaBtn, d.about, d.content, d.bannerPhoto, JSON.stringify(d.colors), d.bodyFont, d.headingFont, JSON.stringify(d.boxes)]);
      return ok({ ok: true });
    } catch (e) { return err('Server error', 500); }
  }

  return err('Not found', 404);
};
