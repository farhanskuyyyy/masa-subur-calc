import { Router, type Response } from 'express';
import crypto from 'crypto';
import {
  getUserCycles,
  getUserCycleById,
  getLatestUserCycle,
  createUserCycleWithPhases,
  updateUserCycleWithPhases,
  deleteUserCycle,
  type PhaseType,
  type UserCycleWithPhases,
} from './db.js';
import { authenticateJwt, type AuthenticatedRequest } from './middleware.js';

const router = Router();

// Require JWT authentication for all cycle routes
router.use(authenticateJwt);

// --- Date and Calculation Utilities ---

export function parseISODate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0); // Noon prevents timezone shifting
}

export function formatISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, days: number): Date {
  const res = new Date(d.getTime());
  res.setDate(res.getDate() + days);
  return res;
}

export function diffInDays(d1: Date, d2: Date): number {
  const t1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate()).getTime();
  const t2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate()).getTime();
  return Math.round((t1 - t2) / (1000 * 60 * 60 * 24));
}

export interface CalculatedPhase {
  phase_name: string;
  phase_start: string;
  phase_end: string;
  phase_type: PhaseType;
}

export interface CycleCalculations {
  phases: CalculatedPhase[];
  ovulationDateStr: string;
  fertileWindow: { start: string; end: string };
  nextCycleStartDateStr: string;
  cycleEndDateStr: string;
  projections: Array<{
    cycleNumber: number;
    cycleStart: string;
    cycleEnd: string;
    ovulationDate: string;
    fertileWindow: { start: string; end: string };
  }>;
}

export function calculateCyclePhases(
  cycleStartDateStr: string,
  cycleLength: number,
  periodDuration: number,
  lutealPhaseLength: number
): CycleCalculations {
  const startDate = parseISODate(cycleStartDateStr);

  // 1. Menstrual phase: cycle_start to cycle_start + period_duration - 1
  const menstrualStart = startDate;
  const menstrualEnd = addDays(startDate, periodDuration - 1);

  // Ovulation day: cycle_length - luteal_phase_length
  const ovulationDayOffset = cycleLength - lutealPhaseLength;
  const ovulationDate = addDays(startDate, ovulationDayOffset);

  // 2. Follicular phase: end of menstrual + 1 to ovulation_day - 1
  const follicularStart = addDays(menstrualEnd, 1);
  const follicularEnd = addDays(ovulationDate, -1);
  // Guard against follicular start > follicular end
  const safeFollicularStart = follicularStart <= follicularEnd ? follicularStart : follicularEnd;

  // 3. Luteal phase: ovulation + 1 to cycle_end
  const lutealStart = addDays(ovulationDate, 1);
  const cycleEnd = addDays(startDate, cycleLength - 1);
  const nextCycleStart = addDays(startDate, cycleLength);

  // Fertile window: ovulation - 5 to ovulation + 1
  const fertileStart = addDays(ovulationDate, -5);
  const fertileEnd = addDays(ovulationDate, 1);

  const phases: CalculatedPhase[] = [
    {
      phase_name: 'Fase Menstruasi',
      phase_start: formatISODate(menstrualStart),
      phase_end: formatISODate(menstrualEnd),
      phase_type: 'menstrual',
    },
    {
      phase_name: 'Fase Folikular',
      phase_start: formatISODate(safeFollicularStart),
      phase_end: formatISODate(follicularEnd),
      phase_type: 'follicular',
    },
    {
      phase_name: 'Fase Ovulasi',
      phase_start: formatISODate(ovulationDate),
      phase_end: formatISODate(ovulationDate),
      phase_type: 'ovulatory',
    },
    {
      phase_name: 'Fase Luteal',
      phase_start: formatISODate(lutealStart),
      phase_end: formatISODate(cycleEnd),
      phase_type: 'luteal',
    },
  ];

  // Calculate next 3 upcoming cycles
  const projections = [];
  for (let i = 1; i <= 3; i++) {
    const projStart = addDays(startDate, cycleLength * i);
    const projOvul = addDays(projStart, cycleLength - lutealPhaseLength);
    const projFertileStart = addDays(projOvul, -5);
    const projFertileEnd = addDays(projOvul, 1);
    const projEnd = addDays(projStart, cycleLength - 1);

    projections.push({
      cycleNumber: i,
      cycleStart: formatISODate(projStart),
      cycleEnd: formatISODate(projEnd),
      ovulationDate: formatISODate(projOvul),
      fertileWindow: {
        start: formatISODate(projFertileStart),
        end: formatISODate(projFertileEnd),
      },
    });
  }

  return {
    phases,
    ovulationDateStr: formatISODate(ovulationDate),
    fertileWindow: {
      start: formatISODate(fertileStart),
      end: formatISODate(fertileEnd),
    },
    nextCycleStartDateStr: formatISODate(nextCycleStart),
    cycleEndDateStr: formatISODate(cycleEnd),
    projections,
  };
}

// Validation helper
function validateCycleInput(body: any): { error?: string; data?: { cycle_start_date: string; cycle_length: number; period_duration: number; luteal_phase_length: number } } {
  const rawDate = body.cycle_start_date || body.hpht;
  if (!rawDate || typeof rawDate !== 'string') {
    return { error: 'Tanggal hari pertama haid terakhir (HPHT) wajib diisi.' };
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(rawDate)) {
    return { error: 'Format tanggal harus YYYY-MM-DD.' };
  }

  const parsed = parseISODate(rawDate);
  if (isNaN(parsed.getTime())) {
    return { error: 'Tanggal tidak valid.' };
  }

  const now = new Date();
  const diffPast = diffInDays(now, parsed);
  if (diffPast < -30) {
    return { error: 'Tanggal haid tidak boleh lebih dari 30 hari di masa depan.' };
  }
  if (diffPast > 365) {
    return { error: 'Tanggal haid tidak boleh lebih dari 1 tahun yang lalu.' };
  }

  const cycleLength = Number(body.cycle_length ?? 28);
  if (!Number.isInteger(cycleLength) || cycleLength < 20 || cycleLength > 50) {
    return { error: 'Panjang siklus harus berupa bilangan bulat antara 20 dan 50 hari.' };
  }

  const periodDuration = Number(body.period_duration ?? 6);
  if (!Number.isInteger(periodDuration) || periodDuration < 2 || periodDuration > 12) {
    return { error: 'Lama pendarahan haid harus antara 2 dan 12 hari.' };
  }

  const lutealPhaseLength = Number(body.luteal_phase_length ?? 14);
  if (!Number.isInteger(lutealPhaseLength) || lutealPhaseLength < 10 || lutealPhaseLength > 18) {
    return { error: 'Panjang fase luteal harus antara 10 dan 18 hari.' };
  }

  if (cycleLength <= periodDuration) {
    return { error: 'Panjang siklus menstruasi harus lebih besar dari lama haid.' };
  }

  if (cycleLength - lutealPhaseLength <= periodDuration) {
    return { error: 'Hari ovulasi (panjang siklus - fase luteal) harus setelah periode haid berakhir.' };
  }

  return {
    data: {
      cycle_start_date: rawDate,
      cycle_length: cycleLength,
      period_duration: periodDuration,
      luteal_phase_length: lutealPhaseLength,
    },
  };
}

function enrichCycle(cycle: UserCycleWithPhases) {
  const calc = calculateCyclePhases(
    cycle.cycle_start_date,
    cycle.cycle_length,
    cycle.period_duration,
    cycle.luteal_phase_length
  );
  return {
    ...cycle,
    ovulation_date: calc.ovulationDateStr,
    fertile_window: calc.fertileWindow,
    next_cycle_start: calc.nextCycleStartDateStr,
    cycle_end: calc.cycleEndDateStr,
    projections: calc.projections,
  };
}

// 1. GET /api/cycles - Get all cycles for current user (ordered by created_at desc)
router.get('/', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const cycles = getUserCycles(userId);
    const enriched = cycles.map(enrichCycle);
    res.status(200).json({ cycles: enriched });
  } catch (error) {
    console.error('Error in GET /api/cycles:', error);
    res.status(500).json({ error: 'Gagal mengambil riwayat siklus menstruasi.' });
  }
});

// 6. GET /api/cycles/current - Get the current active cycle with calculated phases (latest saved cycle)
// (Defined before /:id to avoid router match collision)
router.get('/current', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const latest = getLatestUserCycle(userId);

    if (!latest) {
      res.status(200).json({ cycle: null });
      return;
    }

    res.status(200).json({ cycle: enrichCycle(latest) });
  } catch (error) {
    console.error('Error in GET /api/cycles/current:', error);
    res.status(500).json({ error: 'Gagal mengambil data siklus aktif terkini.' });
  }
});

// 7. GET /api/cycles/today - Get today's phase status based on current cycle
// (Defined before /:id to avoid router match collision)
router.get('/today', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const latest = getLatestUserCycle(userId);

    if (!latest) {
      res.status(200).json({
        has_cycle: false,
        today_status: null,
        message: 'Belum ada data siklus yang disimpan. Silakan simpan siklus terlebih dahulu.',
      });
      return;
    }

    const todayDate = new Date();
    const todayStr = formatISODate(todayDate);
    const startDate = parseISODate(latest.cycle_start_date);
    const calc = calculateCyclePhases(
      latest.cycle_start_date,
      latest.cycle_length,
      latest.period_duration,
      latest.luteal_phase_length
    );

    const totalDaysDiff = diffInDays(todayDate, startDate);
    const cycleDay = totalDaysDiff + 1;
    const daysRemaining = latest.cycle_length - totalDaysDiff;

    // Find current matching phase
    let currentPhase = latest.phases.find(
      (p) => todayStr >= p.phase_start && todayStr <= p.phase_end
    );

    let isLate = false;
    let daysLate = 0;

    if (!currentPhase) {
      if (todayStr > calc.cycleEndDateStr) {
        // Cycle ended and next cycle hasn't been started yet
        isLate = true;
        daysLate = diffInDays(todayDate, parseISODate(calc.nextCycleStartDateStr));
        currentPhase = {
          id: 'late',
          user_id: userId,
          cycle_id: latest.id,
          phase_name: 'Menunggu Haid / Terlambat',
          phase_start: calc.nextCycleStartDateStr,
          phase_end: todayStr,
          phase_type: 'luteal',
          created_at: latest.created_at,
        };
      } else if (todayStr < latest.cycle_start_date) {
        currentPhase = {
          id: 'upcoming',
          user_id: userId,
          cycle_id: latest.id,
          phase_name: 'Siklus Mendatang',
          phase_start: todayStr,
          phase_end: latest.cycle_start_date,
          phase_type: 'follicular',
          created_at: latest.created_at,
        };
      }
    }

    const isFertile = todayStr >= calc.fertileWindow.start && todayStr <= calc.fertileWindow.end;
    const isOvulationDay = todayStr === calc.ovulationDateStr;

    // Determine conception chance level & text
    let chanceLevel = 'low';
    let chancePct = '< 3%';
    let chanceName = 'Rendah';
    let chanceDesc = 'Peluang pembuahan rendah.';

    if (currentPhase?.phase_type === 'menstrual') {
      chanceLevel = 'very-low';
      chancePct = '< 1%';
      chanceName = 'Sangat Rendah';
      chanceDesc = 'Peluang kehamilan sangat rendah selama fase menstruasi aktif.';
    } else if (isOvulationDay) {
      chanceLevel = 'peak';
      chancePct = '28% - 33%';
      chanceName = 'Puncak (Sangat Tinggi)';
      chanceDesc = 'Peluang konsepsi tertinggi! Sel telur siap dibuahi selama 12 - 24 jam ke depan.';
    } else if (isFertile) {
      chanceLevel = 'high';
      chancePct = '15% - 25%';
      chanceName = 'Tinggi';
      chanceDesc = 'Berada dalam jendela subur alami. Peluang pembuahan sangat baik.';
    } else if (currentPhase?.phase_type === 'luteal') {
      chanceLevel = 'safe';
      chancePct = '< 1%';
      chanceName = 'Sangat Rendah (Aman)';
      chanceDesc = 'Sel telur sudah tidak lagi viabel. Peluang konsepsi sangat minimal hingga siklus berikutnya.';
    }

    res.status(200).json({
      has_cycle: true,
      today: todayStr,
      cycle_id: latest.id,
      cycle_start_date: latest.cycle_start_date,
      cycle_length: latest.cycle_length,
      period_duration: latest.period_duration,
      luteal_phase_length: latest.luteal_phase_length,
      cycle_day: cycleDay,
      days_remaining: Math.max(0, daysRemaining),
      is_late: isLate,
      days_late: daysLate,
      current_phase: currentPhase,
      is_fertile: isFertile,
      is_ovulation_day: isOvulationDay,
      ovulation_date: calc.ovulationDateStr,
      fertile_window: calc.fertileWindow,
      next_period_date: calc.nextCycleStartDateStr,
      chance: {
        level: chanceLevel,
        name: chanceName,
        pct: chancePct,
        desc: chanceDesc,
      },
      phases: latest.phases,
    });
  } catch (error) {
    console.error('Error in GET /api/cycles/today:', error);
    res.status(500).json({ error: 'Gagal mengambil evaluasi status siklus hari ini.' });
  }
});

// 2. POST /api/cycles - Save a new cycle. Auto-calculate and save all phases.
router.post('/', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const validation = validateCycleInput(req.body);
    if (validation.error || !validation.data) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const { cycle_start_date, cycle_length, period_duration, luteal_phase_length } = validation.data;

    // Calculate all 4 phases
    const calc = calculateCyclePhases(cycle_start_date, cycle_length, period_duration, luteal_phase_length);

    const cycleId = crypto.randomUUID();
    const phaseRecords = calc.phases.map((p) => ({
      id: crypto.randomUUID(),
      user_id: userId,
      cycle_id: cycleId,
      phase_name: p.phase_name,
      phase_start: p.phase_start,
      phase_end: p.phase_end,
      phase_type: p.phase_type,
    }));

    const created = createUserCycleWithPhases(
      {
        id: cycleId,
        user_id: userId,
        cycle_start_date,
        cycle_length,
        period_duration,
        luteal_phase_length,
      },
      phaseRecords
    );

    res.status(201).json({
      message: 'Siklus menstruasi berhasil disimpan.',
      cycle: enrichCycle(created),
    });
  } catch (error) {
    console.error('Error in POST /api/cycles:', error);
    res.status(500).json({ error: 'Gagal menyimpan data siklus menstruasi.' });
  }
});

// 3. PUT /api/cycles/:id - Update an existing cycle
router.put('/:id', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const cycleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const existing = getUserCycleById(cycleId, userId);
    if (!existing) {
      res.status(404).json({ error: 'Data siklus tidak ditemukan atau bukan milik Anda.' });
      return;
    }

    const mergedBody = {
      cycle_start_date: req.body.cycle_start_date || req.body.hpht || existing.cycle_start_date,
      cycle_length: req.body.cycle_length ?? existing.cycle_length,
      period_duration: req.body.period_duration ?? existing.period_duration,
      luteal_phase_length: req.body.luteal_phase_length ?? existing.luteal_phase_length,
    };

    const validation = validateCycleInput(mergedBody);
    if (validation.error || !validation.data) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const { cycle_start_date, cycle_length, period_duration, luteal_phase_length } = validation.data;

    // Recalculate phases
    const calc = calculateCyclePhases(cycle_start_date, cycle_length, period_duration, luteal_phase_length);
    const phaseRecords = calc.phases.map((p) => ({
      id: crypto.randomUUID(),
      user_id: userId,
      cycle_id: cycleId,
      phase_name: p.phase_name,
      phase_start: p.phase_start,
      phase_end: p.phase_end,
      phase_type: p.phase_type,
    }));

    const updated = updateUserCycleWithPhases(
      cycleId,
      userId,
      {
        cycle_start_date,
        cycle_length,
        period_duration,
        luteal_phase_length,
      },
      phaseRecords
    );

    if (!updated) {
      res.status(500).json({ error: 'Gagal memperbarui siklus.' });
      return;
    }

    res.status(200).json({
      message: 'Data siklus dan fase menstruasi berhasil diperbarui.',
      cycle: enrichCycle(updated),
    });
  } catch (error) {
    console.error('Error in PUT /api/cycles/:id:', error);
    res.status(500).json({ error: 'Gagal memperbarui data siklus menstruasi.' });
  }
});

// 5. POST /api/cycles/:id/reset - Reset/update cycle: user provides new HPHT or adjusted cycle_length, system recalculates all phases
router.post('/:id/reset', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const cycleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const existing = getUserCycleById(cycleId, userId);
    if (!existing) {
      res.status(404).json({ error: 'Data siklus tidak ditemukan atau bukan milik Anda.' });
      return;
    }

    const mergedBody = {
      cycle_start_date: req.body.cycle_start_date || req.body.hpht || existing.cycle_start_date,
      cycle_length: req.body.cycle_length ?? existing.cycle_length,
      period_duration: req.body.period_duration ?? existing.period_duration,
      luteal_phase_length: req.body.luteal_phase_length ?? existing.luteal_phase_length,
    };

    const validation = validateCycleInput(mergedBody);
    if (validation.error || !validation.data) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const { cycle_start_date, cycle_length, period_duration, luteal_phase_length } = validation.data;

    // Recalculate all 4 phases based on reset parameters
    const calc = calculateCyclePhases(cycle_start_date, cycle_length, period_duration, luteal_phase_length);
    const phaseRecords = calc.phases.map((p) => ({
      id: crypto.randomUUID(),
      user_id: userId,
      cycle_id: cycleId,
      phase_name: p.phase_name,
      phase_start: p.phase_start,
      phase_end: p.phase_end,
      phase_type: p.phase_type,
    }));

    const updated = updateUserCycleWithPhases(
      cycleId,
      userId,
      {
        cycle_start_date,
        cycle_length,
        period_duration,
        luteal_phase_length,
      },
      phaseRecords
    );

    if (!updated) {
      res.status(500).json({ error: 'Gagal mereset siklus.' });
      return;
    }

    res.status(200).json({
      message: 'Siklus berhasil diatur ulang dan semua fase telah dihitung kembali.',
      cycle: enrichCycle(updated),
    });
  } catch (error) {
    console.error('Error in POST /api/cycles/:id/reset:', error);
    res.status(500).json({ error: 'Gagal mereset data siklus.' });
  }
});

// 4. DELETE /api/cycles/:id - Delete a cycle
router.delete('/:id', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const cycleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const existing = getUserCycleById(cycleId, userId);
    if (!existing) {
      res.status(404).json({ error: 'Data siklus tidak ditemukan atau bukan milik Anda.' });
      return;
    }

    const success = deleteUserCycle(cycleId, userId);
    if (!success) {
      res.status(500).json({ error: 'Gagal menghapus siklus dari database.' });
      return;
    }

    res.status(200).json({
      message: 'Siklus berhasil dihapus dari riwayat.',
      deleted_id: cycleId,
    });
  } catch (error) {
    console.error('Error in DELETE /api/cycles/:id:', error);
    res.status(500).json({ error: 'Gagal menghapus data siklus.' });
  }
});

export default router;
