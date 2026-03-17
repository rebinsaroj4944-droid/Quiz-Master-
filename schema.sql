CREATE TABLE IF NOT EXISTS site_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schools (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classes (
  id SERIAL PRIMARY KEY,
  school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  admin_password VARCHAR(200),
  UNIQUE(school_id, name)
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(200) NOT NULL,
  school_id INTEGER REFERENCES schools(id),
  class_id INTEGER REFERENCES classes(id),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS school_settings (
  school_id INTEGER PRIMARY KEY REFERENCES schools(id) ON DELETE CASCADE,
  title VARCHAR(200),
  tagline TEXT,
  shayari TEXT,
  cta_btn VARCHAR(100),
  about TEXT,
  content TEXT,
  banner_photo TEXT,
  colors JSONB,
  body_font VARCHAR(100),
  heading_font VARCHAR(100),
  boxes JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  icon VARCHAR(10) DEFAULT '📖',
  name VARCHAR(200) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS chapters (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS quizzes (
  id SERIAL PRIMARY KEY,
  chapter_id INTEGER REFERENCES chapters(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  quiz_file_data TEXT,
  quiz_file_name VARCHAR(300),
  questions JSONB DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS quiz_scores (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
  school_id INTEGER REFERENCES schools(id),
  class_id INTEGER REFERENCES classes(id),
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  pct INTEGER NOT NULL,
  attempted_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, quiz_id)
);
