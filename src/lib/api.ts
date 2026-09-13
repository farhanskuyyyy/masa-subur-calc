export interface User {
  id: string;
  email: string;
  created_at?: string;
  user_metadata?: {
    name?: string;
  };
}

export interface AuthResponse {
  message?: string;
  token?: string;
  user: User;
}

export type PhaseType = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';

export interface UserCyclePhase {
  id: string;
  user_id: string;
  cycle_id: string;
  phase_name: string;
  phase_start: string;
  phase_end: string;
  phase_type: PhaseType;
  created_at: string;
}

export interface UserCycle {
  id: string;
  user_id: string;
  cycle_start_date: string;
  cycle_length: number;
  period_duration: number;
  luteal_phase_length: number;
  created_at: string;
  updated_at: string;
  phases: UserCyclePhase[];
  ovulation_date?: string;
  fertile_window?: {
    start: string;
    end: string;
  };
  next_cycle_start?: string;
  cycle_end?: string;
  projections?: Array<{
    cycleNumber: number;
    cycleStart: string;
    cycleEnd: string;
    ovulationDate: string;
    fertileWindow: { start: string; end: string };
  }>;
}

export interface CycleTodayStatus {
  has_cycle: boolean;
  today?: string;
  cycle_id?: string;
  cycle_start_date?: string;
  cycle_length?: number;
  period_duration?: number;
  luteal_phase_length?: number;
  cycle_day?: number;
  days_remaining?: number;
  is_late?: boolean;
  days_late?: number;
  current_phase?: UserCyclePhase;
  is_fertile?: boolean;
  is_ovulation_day?: boolean;
  ovulation_date?: string;
  fertile_window?: {
    start: string;
    end: string;
  };
  next_period_date?: string;
  chance?: {
    level: string;
    name: string;
    pct: string;
    desc: string;
  };
  phases?: UserCyclePhase[];
}

const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) {
    return '';
  }
  return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
};

const BASE_URL = getApiBaseUrl();

async function handleResponse<T>(res: Response): Promise<T> {
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // If response is not JSON
    data = null;
  }

  if (!res.ok) {
    const errorMsg = data?.error || data?.message || `Permintaan gagal dengan status ${res.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

// Demo helper calculations in case user is in demo mode
const DEMO_CYCLES_KEY = 'luna_demo_saved_cycles';

function getDemoCycles(): UserCycle[] {
  try {
    const stored = localStorage.getItem(DEMO_CYCLES_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

function saveDemoCycles(cycles: UserCycle[]): void {
  try {
    localStorage.setItem(DEMO_CYCLES_KEY, JSON.stringify(cycles));
  } catch {
    // Ignore storage quota
  }
}

function computeDemoPhases(
  cycleId: string,
  startDateStr: string,
  cycleLength: number,
  periodDuration: number,
  lutealPhaseLength: number
): {
  phases: UserCyclePhase[];
  ovulationDate: string;
  fertileWindow: { start: string; end: string };
  nextCycleStart: string;
  cycleEnd: string;
} {
  const [y, m, d] = startDateStr.split('-').map(Number);
  const start = new Date(y, m - 1, d, 12, 0, 0);

  const addDays = (base: Date, days: number) => {
    const res = new Date(base.getTime());
    res.setDate(res.getDate() + days);
    return res;
  };

  const fmt = (date: Date) => {
    const yStr = date.getFullYear();
    const mStr = String(date.getMonth() + 1).padStart(2, '0');
    const dStr = String(date.getDate()).padStart(2, '0');
    return `${yStr}-${mStr}-${dStr}`;
  };

  const menstrualStart = start;
  const menstrualEnd = addDays(start, periodDuration - 1);
  const ovulationDate = addDays(start, cycleLength - lutealPhaseLength);
  const follicularStart = addDays(menstrualEnd, 1);
  const follicularEnd = addDays(ovulationDate, -1);
  const lutealStart = addDays(ovulationDate, 1);
  const cycleEnd = addDays(start, cycleLength - 1);
  const nextCycleStart = addDays(start, cycleLength);
  const fertileStart = addDays(ovulationDate, -5);
  const fertileEnd = addDays(ovulationDate, 1);

  const phases: UserCyclePhase[] = [
    {
      id: `phase-${Date.now()}-1`,
      user_id: 'demo-user-12345',
      cycle_id: cycleId,
      phase_name: 'Fase Menstruasi',
      phase_start: fmt(menstrualStart),
      phase_end: fmt(menstrualEnd),
      phase_type: 'menstrual',
      created_at: new Date().toISOString(),
    },
    {
      id: `phase-${Date.now()}-2`,
      user_id: 'demo-user-12345',
      cycle_id: cycleId,
      phase_name: 'Fase Folikular',
      phase_start: fmt(follicularStart <= follicularEnd ? follicularStart : follicularEnd),
      phase_end: fmt(follicularEnd),
      phase_type: 'follicular',
      created_at: new Date().toISOString(),
    },
    {
      id: `phase-${Date.now()}-3`,
      user_id: 'demo-user-12345',
      cycle_id: cycleId,
      phase_name: 'Fase Ovulasi',
      phase_start: fmt(ovulationDate),
      phase_end: fmt(ovulationDate),
      phase_type: 'ovulatory',
      created_at: new Date().toISOString(),
    },
    {
      id: `phase-${Date.now()}-4`,
      user_id: 'demo-user-12345',
      cycle_id: cycleId,
      phase_name: 'Fase Luteal',
      phase_start: fmt(lutealStart),
      phase_end: fmt(cycleEnd),
      phase_type: 'luteal',
      created_at: new Date().toISOString(),
    },
  ];

  return {
    phases,
    ovulationDate: fmt(ovulationDate),
    fertileWindow: { start: fmt(fertileStart), end: fmt(fertileEnd) },
    nextCycleStart: fmt(nextCycleStart),
    cycleEnd: fmt(cycleEnd),
  };
}

export const authApi = {
  async register(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse<AuthResponse>(res);
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse<AuthResponse>(res);
  },

  async getMe(token: string): Promise<{ user: User }> {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse<{ user: User }>(res);
  },
};

export const cyclesApi = {
  async getAll(token: string): Promise<{ cycles: UserCycle[] }> {
    if (token === 'demo-token-mock') {
      return { cycles: getDemoCycles() };
    }
    const res = await fetch(`${BASE_URL}/api/cycles`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse<{ cycles: UserCycle[] }>(res);
  },

  async getCurrent(token: string): Promise<{ cycle: UserCycle | null }> {
    if (token === 'demo-token-mock') {
      const demoCycles = getDemoCycles();
      return { cycle: demoCycles.length > 0 ? demoCycles[0] : null };
    }
    const res = await fetch(`${BASE_URL}/api/cycles/current`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse<{ cycle: UserCycle | null }>(res);
  },

  async getToday(token: string): Promise<CycleTodayStatus> {
    if (token === 'demo-token-mock') {
      const demoCycles = getDemoCycles();
      if (demoCycles.length === 0) {
        return { has_cycle: false };
      }
      const latest = demoCycles[0];
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      const todayStr = `${y}-${m}-${d}`;

      const [sy, sm, sd] = latest.cycle_start_date.split('-').map(Number);
      const start = new Date(sy, sm - 1, sd, 12, 0, 0);
      const diff = Math.round((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const cycleDay = diff + 1;
      const daysRemaining = Math.max(0, latest.cycle_length - diff);

      const matchedPhase = latest.phases.find(
        (p) => todayStr >= p.phase_start && todayStr <= p.phase_end
      ) || latest.phases[0];

      return {
        has_cycle: true,
        today: todayStr,
        cycle_id: latest.id,
        cycle_start_date: latest.cycle_start_date,
        cycle_length: latest.cycle_length,
        period_duration: latest.period_duration,
        luteal_phase_length: latest.luteal_phase_length,
        cycle_day: cycleDay,
        days_remaining: daysRemaining,
        current_phase: matchedPhase,
        ovulation_date: latest.ovulation_date,
        fertile_window: latest.fertile_window,
        next_period_date: latest.next_cycle_start,
        phases: latest.phases,
      };
    }

    const res = await fetch(`${BASE_URL}/api/cycles/today`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse<CycleTodayStatus>(res);
  },

  async create(
    token: string,
    data: {
      cycle_start_date: string;
      cycle_length: number;
      period_duration: number;
      luteal_phase_length: number;
    }
  ): Promise<{ message: string; cycle: UserCycle }> {
    if (token === 'demo-token-mock') {
      const cycleId = `demo-cycle-${Date.now()}`;
      const calc = computeDemoPhases(
        cycleId,
        data.cycle_start_date,
        data.cycle_length,
        data.period_duration,
        data.luteal_phase_length
      );
      const newCycle: UserCycle = {
        id: cycleId,
        user_id: 'demo-user-12345',
        cycle_start_date: data.cycle_start_date,
        cycle_length: data.cycle_length,
        period_duration: data.period_duration,
        luteal_phase_length: data.luteal_phase_length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        phases: calc.phases,
        ovulation_date: calc.ovulationDate,
        fertile_window: calc.fertileWindow,
        next_cycle_start: calc.nextCycleStart,
        cycle_end: calc.cycleEnd,
      };
      const existing = getDemoCycles();
      saveDemoCycles([newCycle, ...existing]);
      return { message: 'Siklus berhasil disimpan (Demo).', cycle: newCycle };
    }

    const res = await fetch(`${BASE_URL}/api/cycles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: string; cycle: UserCycle }>(res);
  },

  async update(
    token: string,
    id: string,
    data: {
      cycle_start_date?: string;
      cycle_length?: number;
      period_duration?: number;
      luteal_phase_length?: number;
    }
  ): Promise<{ message: string; cycle: UserCycle }> {
    if (token === 'demo-token-mock') {
      const existing = getDemoCycles();
      const idx = existing.findIndex((c) => c.id === id);
      if (idx === -1) throw new Error('Siklus demo tidak ditemukan');

      const target = existing[idx];
      const newStart = data.cycle_start_date || target.cycle_start_date;
      const newLen = data.cycle_length ?? target.cycle_length;
      const newDur = data.period_duration ?? target.period_duration;
      const newLut = data.luteal_phase_length ?? target.luteal_phase_length;

      const calc = computeDemoPhases(id, newStart, newLen, newDur, newLut);
      const updated: UserCycle = {
        ...target,
        cycle_start_date: newStart,
        cycle_length: newLen,
        period_duration: newDur,
        luteal_phase_length: newLut,
        updated_at: new Date().toISOString(),
        phases: calc.phases,
        ovulation_date: calc.ovulationDate,
        fertile_window: calc.fertileWindow,
        next_cycle_start: calc.nextCycleStart,
        cycle_end: calc.cycleEnd,
      };
      existing[idx] = updated;
      saveDemoCycles(existing);
      return { message: 'Siklus berhasil diperbarui (Demo).', cycle: updated };
    }

    const res = await fetch(`${BASE_URL}/api/cycles/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: string; cycle: UserCycle }>(res);
  },

  async reset(
    token: string,
    id: string,
    data: {
      cycle_start_date?: string;
      cycle_length?: number;
      period_duration?: number;
      luteal_phase_length?: number;
    }
  ): Promise<{ message: string; cycle: UserCycle }> {
    if (token === 'demo-token-mock') {
      return this.update(token, id, data);
    }

    const res = await fetch(`${BASE_URL}/api/cycles/${id}/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: string; cycle: UserCycle }>(res);
  },

  async delete(token: string, id: string): Promise<{ message: string; deleted_id?: string }> {
    if (token === 'demo-token-mock') {
      const existing = getDemoCycles();
      saveDemoCycles(existing.filter((c) => c.id !== id));
      return { message: 'Siklus berhasil dihapus (Demo).' };
    }

    const res = await fetch(`${BASE_URL}/api/cycles/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse<{ message: string; deleted_id?: string }>(res);
  },
};
