import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'database.sqlite');
export const db = new Database(dbPath);

// Enable Write-Ahead Logging (WAL) for concurrency & performance
db.pragma('journal_mode = WAL');

// Initialize database schema with users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export interface UserRecord {
  id: string;
  email: string;
  password: string;
  created_at: string;
}

export type SafeUser = Omit<UserRecord, 'password'>;

// Parameterized query: find user by email
export const findUserByEmail = (email: string): UserRecord | undefined => {
  const stmt = db.prepare('SELECT id, email, password, created_at FROM users WHERE email = ?');
  return stmt.get(email.trim().toLowerCase()) as UserRecord | undefined;
};

// Parameterized query: find user by id
export const findUserById = (id: string): SafeUser | undefined => {
  const stmt = db.prepare('SELECT id, email, created_at FROM users WHERE id = ?');
  return stmt.get(id) as SafeUser | undefined;
};

// Parameterized query: insert new user
export const createUser = (id: string, email: string, passwordHash: string): SafeUser => {
  const stmt = db.prepare('INSERT INTO users (id, email, password) VALUES (?, ?, ?)');
  stmt.run(id, email.trim().toLowerCase(), passwordHash);
  const created = findUserById(id);
  if (!created) {
    throw new Error('Gagal membuat data pengguna baru');
  }
  return created;
};

export default db;
