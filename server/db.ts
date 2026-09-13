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

// Enable Write-Ahead Logging (WAL) and foreign keys support
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database schema with users, user_cycles, and user_cycle_phases tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_cycles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    cycle_start_date TEXT NOT NULL,
    cycle_length INTEGER NOT NULL,
    period_duration INTEGER NOT NULL,
    luteal_phase_length INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_cycle_phases (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    cycle_id TEXT NOT NULL,
    phase_name TEXT NOT NULL,
    phase_start TEXT NOT NULL,
    phase_end TEXT NOT NULL,
    phase_type TEXT NOT NULL CHECK(phase_type IN ('menstrual', 'follicular', 'ovulatory', 'luteal')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (cycle_id) REFERENCES user_cycles(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_user_cycles_user_id ON user_cycles(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_cycles_start_date ON user_cycles(cycle_start_date);
  CREATE INDEX IF NOT EXISTS idx_user_cycle_phases_cycle_id ON user_cycle_phases(cycle_id);
  CREATE INDEX IF NOT EXISTS idx_user_cycle_phases_user_id ON user_cycle_phases(user_id);
`);

export interface UserRecord {
  id: string;
  email: string;
  password: string;
  created_at: string;
}

export type SafeUser = Omit<UserRecord, 'password'>;

export type PhaseType = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';

export interface UserCycleRecord {
  id: string;
  user_id: string;
  cycle_start_date: string;
  cycle_length: number;
  period_duration: number;
  luteal_phase_length: number;
  created_at: string;
  updated_at: string;
}

export interface UserCyclePhaseRecord {
  id: string;
  user_id: string;
  cycle_id: string;
  phase_name: string;
  phase_start: string;
  phase_end: string;
  phase_type: PhaseType;
  created_at: string;
}

export interface UserCycleWithPhases extends UserCycleRecord {
  phases: UserCyclePhaseRecord[];
}

// User helper methods
export const findUserByEmail = (email: string): UserRecord | undefined => {
  const stmt = db.prepare('SELECT id, email, password, created_at FROM users WHERE email = ?');
  return stmt.get(email.trim().toLowerCase()) as UserRecord | undefined;
};

export const findUserById = (id: string): SafeUser | undefined => {
  const stmt = db.prepare('SELECT id, email, created_at FROM users WHERE id = ?');
  return stmt.get(id) as SafeUser | undefined;
};

export const createUser = (id: string, email: string, passwordHash: string): SafeUser => {
  const stmt = db.prepare('INSERT INTO users (id, email, password) VALUES (?, ?, ?)');
  stmt.run(id, email.trim().toLowerCase(), passwordHash);
  const created = findUserById(id);
  if (!created) {
    throw new Error('Gagal membuat data pengguna baru');
  }
  return created;
};

// Cycles helper methods
export const getUserPhasesByCycleId = (cycleId: string, userId: string): UserCyclePhaseRecord[] => {
  const stmt = db.prepare(`
    SELECT id, user_id, cycle_id, phase_name, phase_start, phase_end, phase_type, created_at
    FROM user_cycle_phases
    WHERE cycle_id = ? AND user_id = ?
    ORDER BY phase_start ASC
  `);
  return stmt.all(cycleId, userId) as UserCyclePhaseRecord[];
};

export const getUserCycles = (userId: string): UserCycleWithPhases[] => {
  const stmt = db.prepare(`
    SELECT id, user_id, cycle_start_date, cycle_length, period_duration, luteal_phase_length, created_at, updated_at
    FROM user_cycles
    WHERE user_id = ?
    ORDER BY created_at DESC
  `);
  const cycles = stmt.all(userId) as UserCycleRecord[];

  return cycles.map((c) => ({
    ...c,
    phases: getUserPhasesByCycleId(c.id, userId),
  }));
};

export const getUserCycleById = (cycleId: string, userId: string): UserCycleWithPhases | undefined => {
  const stmt = db.prepare(`
    SELECT id, user_id, cycle_start_date, cycle_length, period_duration, luteal_phase_length, created_at, updated_at
    FROM user_cycles
    WHERE id = ? AND user_id = ?
  `);
  const cycle = stmt.get(cycleId, userId) as UserCycleRecord | undefined;
  if (!cycle) return undefined;

  return {
    ...cycle,
    phases: getUserPhasesByCycleId(cycle.id, userId),
  };
};

export const getLatestUserCycle = (userId: string): UserCycleWithPhases | undefined => {
  const stmt = db.prepare(`
    SELECT id, user_id, cycle_start_date, cycle_length, period_duration, luteal_phase_length, created_at, updated_at
    FROM user_cycles
    WHERE user_id = ?
    ORDER BY cycle_start_date DESC, created_at DESC
    LIMIT 1
  `);
  const cycle = stmt.get(userId) as UserCycleRecord | undefined;
  if (!cycle) return undefined;

  return {
    ...cycle,
    phases: getUserPhasesByCycleId(cycle.id, userId),
  };
};

export const createUserCycleWithPhases = (
  cycle: {
    id: string;
    user_id: string;
    cycle_start_date: string;
    cycle_length: number;
    period_duration: number;
    luteal_phase_length: number;
  },
  phases: Array<{
    id: string;
    user_id: string;
    cycle_id: string;
    phase_name: string;
    phase_start: string;
    phase_end: string;
    phase_type: PhaseType;
  }>
): UserCycleWithPhases => {
  const insertCycle = db.prepare(`
    INSERT INTO user_cycles (
      id, user_id, cycle_start_date, cycle_length, period_duration, luteal_phase_length, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  const insertPhase = db.prepare(`
    INSERT INTO user_cycle_phases (
      id, user_id, cycle_id, phase_name, phase_start, phase_end, phase_type, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  const transaction = db.transaction(() => {
    insertCycle.run(
      cycle.id,
      cycle.user_id,
      cycle.cycle_start_date,
      cycle.cycle_length,
      cycle.period_duration,
      cycle.luteal_phase_length
    );

    for (const phase of phases) {
      insertPhase.run(
        phase.id,
        phase.user_id,
        phase.cycle_id,
        phase.phase_name,
        phase.phase_start,
        phase.phase_end,
        phase.phase_type
      );
    }
  });

  transaction();

  const created = getUserCycleById(cycle.id, cycle.user_id);
  if (!created) {
    throw new Error('Gagal menyimpan siklus menstruasi');
  }
  return created;
};

export const updateUserCycleWithPhases = (
  cycleId: string,
  userId: string,
  cycle: {
    cycle_start_date: string;
    cycle_length: number;
    period_duration: number;
    luteal_phase_length: number;
  },
  phases: Array<{
    id: string;
    user_id: string;
    cycle_id: string;
    phase_name: string;
    phase_start: string;
    phase_end: string;
    phase_type: PhaseType;
  }>
): UserCycleWithPhases | undefined => {
  const updateCycleStmt = db.prepare(`
    UPDATE user_cycles
    SET cycle_start_date = ?,
        cycle_length = ?,
        period_duration = ?,
        luteal_phase_length = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `);

  const deletePhasesStmt = db.prepare(`
    DELETE FROM user_cycle_phases
    WHERE cycle_id = ? AND user_id = ?
  `);

  const insertPhaseStmt = db.prepare(`
    INSERT INTO user_cycle_phases (
      id, user_id, cycle_id, phase_name, phase_start, phase_end, phase_type, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  const transaction = db.transaction(() => {
    const result = updateCycleStmt.run(
      cycle.cycle_start_date,
      cycle.cycle_length,
      cycle.period_duration,
      cycle.luteal_phase_length,
      cycleId,
      userId
    );

    if (result.changes === 0) {
      return false;
    }

    deletePhasesStmt.run(cycleId, userId);

    for (const phase of phases) {
      insertPhaseStmt.run(
        phase.id,
        phase.user_id,
        phase.cycle_id,
        phase.phase_name,
        phase.phase_start,
        phase.phase_end,
        phase.phase_type
      );
    }

    return true;
  });

  const updated = transaction();
  if (!updated) {
    return undefined;
  }

  return getUserCycleById(cycleId, userId);
};

export const deleteUserCycle = (cycleId: string, userId: string): boolean => {
  const deletePhases = db.prepare(`
    DELETE FROM user_cycle_phases
    WHERE cycle_id = ? AND user_id = ?
  `);

  const deleteCycle = db.prepare(`
    DELETE FROM user_cycles
    WHERE id = ? AND user_id = ?
  `);

  const transaction = db.transaction(() => {
    deletePhases.run(cycleId, userId);
    const res = deleteCycle.run(cycleId, userId);
    return res.changes > 0;
  });

  return transaction();
};

export default db;
