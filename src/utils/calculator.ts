import type { CalculatedCycleData, CalculatorState, DayEvaluation, MonthCalendarData } from '../types/calculator';

export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

export function diffInDays(date1: Date, date2: Date): number {
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
}

export function isSameDay(d1: Date | null | undefined, d2: Date | null | undefined): boolean {
  if (!d1 || !d2) return false;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function formatDateFull(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateShort(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  });
}

export function formatDateMonthYear(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });
}

export function toISODateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function computeCycleMetrics(state: CalculatorState): CalculatedCycleData | null {
  const { lastPeriodDate, isVariable, cycleLength, cycleMin, cycleMax, periodDuration, lutealPhase } = state;
  if (!lastPeriodDate) return null;

  if (!isVariable) {
    const effCycleLength = cycleLength;
    const ovulationDayIndex = effCycleLength - lutealPhase;
    const ovulationDate = addDays(lastPeriodDate, ovulationDayIndex);
    const fertileStart = addDays(ovulationDate, -5);
    const fertileEnd = addDays(ovulationDate, 1);
    const peakStart = addDays(ovulationDate, -2);
    const peakEnd = ovulationDate;
    const periodEnd = addDays(lastPeriodDate, periodDuration - 1);

    const safeBeforeStart = addDays(periodEnd, 1);
    const safeBeforeEnd = addDays(fertileStart, -1);
    const safeAfterStart = addDays(fertileEnd, 1);
    const nextPeriodDate = addDays(lastPeriodDate, effCycleLength);
    const safeAfterEnd = addDays(nextPeriodDate, -1);
    const pregnancyTestDate = addDays(ovulationDate, lutealPhase);

    return {
      isVariable: false,
      cycleLength: effCycleLength,
      periodDuration,
      lutealPhase,
      lastPeriodDate,
      ovulationDate,
      ovulationDayIndex,
      fertileStart,
      fertileEnd,
      peakStart,
      peakEnd,
      periodEnd,
      safeBeforeStart,
      safeBeforeEnd,
      safeAfterStart,
      safeAfterEnd,
      nextPeriodDate,
      pregnancyTestDate,
    };
  } else {
    const fertileStartIndex = cycleMin - 18;
    const fertileEndIndex = cycleMax - 11;
    const fertileStart = addDays(lastPeriodDate, Math.max(periodDuration, fertileStartIndex));
    const fertileEnd = addDays(lastPeriodDate, fertileEndIndex);

    const ovulationStartDate = addDays(lastPeriodDate, cycleMin - lutealPhase);
    const ovulationEndDate = addDays(lastPeriodDate, cycleMax - lutealPhase);

    const periodEnd = addDays(lastPeriodDate, periodDuration - 1);
    const safeBeforeStart = addDays(periodEnd, 1);
    const safeBeforeEnd = addDays(fertileStart, -1);

    const nextPeriodStartDate = addDays(lastPeriodDate, cycleMin);
    const nextPeriodEndDate = addDays(lastPeriodDate, cycleMax);
    const safeAfterStart = addDays(fertileEnd, 1);
    const safeAfterEnd = addDays(nextPeriodStartDate, -1);
    const pregnancyTestDate = addDays(ovulationEndDate, lutealPhase);

    return {
      isVariable: true,
      cycleMin,
      cycleMax,
      periodDuration,
      lutealPhase,
      lastPeriodDate,
      ovulationStartDate,
      ovulationEndDate,
      fertileStart,
      fertileEnd,
      periodEnd,
      safeBeforeStart,
      safeBeforeEnd,
      safeAfterStart,
      safeAfterEnd,
      nextPeriodStartDate,
      nextPeriodEndDate,
      pregnancyTestDate,
    };
  }
}

export function evaluateDay(targetDate: Date, metrics: CalculatedCycleData | null): DayEvaluation | null {
  if (!metrics) return null;

  const baseDate = metrics.lastPeriodDate;
  const cycleDuration = metrics.isVariable ? metrics.cycleMax : metrics.cycleLength;

  const totalDaysDiff = diffInDays(targetDate, baseDate);

  let cycleDay = totalDaysDiff % cycleDuration;
  if (cycleDay < 0) {
    cycleDay += cycleDuration;
  }
  cycleDay += 1;

  const pDuration = metrics.periodDuration;

  let phase: DayEvaluation['phase'] = 'follicular';
  let phaseName = 'Fase Folikular';
  let chanceName = 'Rendah';
  let chanceLevel: DayEvaluation['chanceLevel'] = 'low';
  let chancePct = '< 3%';
  let chanceDesc = 'Peluang pembuahan rendah. Sel telur belum siap dibuahi.';
  let mucusTitle = 'Cairan Serviks Minimal / Sedikit Lengket';
  let mucusDesc = 'Setelah haid usai, cairan serviks cenderung kering atau kental creamy dan asam, tidak mendukung kelangsungan hidup sperma.';
  let hormoneTitle = 'Estrogen Mulai Meningkat Bertahap';
  let hormoneDesc = 'FSH merangsang pematangan folikel baru di ovarium. Energi fisik dan mood umumnya mulai membaik.';

  if (cycleDay <= pDuration) {
    phase = 'period';
    phaseName = 'Menstruasi';
    chanceName = 'Sangat Rendah';
    chanceLevel = 'very-low';
    chancePct = '< 1%';
    chanceDesc = 'Peluang hamil sangat rendah. Terjadi peluruhan dinding rahim secara alami.';
    mucusTitle = 'Pendarahan Haid Aktif';
    mucusDesc = 'Dinding rahim melepaskan jaringan endometrium yang tidak dibuahi pada siklus sebelumnya.';
    hormoneTitle = 'Estrogen & Progesteron di Titik Dasar (Baseline)';
    hormoneDesc = 'Kadar hormon berada di titik istirahat. Tubuh memerlukan kenyamanan, hidrasi cukup, dan nutrisi zat besi.';
  } else if (!metrics.isVariable) {
    const ovulDay = metrics.ovulationDayIndex;
    const dayOffsetFromOvul = cycleDay - 1 - ovulDay;

    if (dayOffsetFromOvul === 0) {
      phase = 'ovulation';
      phaseName = 'Hari Ovulasi Puncak';
      chanceName = 'Puncak (Sangat Tinggi)';
      chanceLevel = 'peak';
      chancePct = '28% - 33%';
      chanceDesc = 'Peluang konsepsi tertinggi! Sel telur matang dilepaskan ke tuba fallopi dan bertahan 12 - 24 jam.';
      mucusTitle = 'Lendir Tipe Putih Telur Mentah (Egg-White)';
      mucusDesc = 'Lendir sangat licin, jernih, dan elastis (dapat ditarik beberapa sentimeter tanpa putus), mempermudah sperma berenang cepat.';
      hormoneTitle = 'Lonjakan Hormon LH (Luteinizing Hormone)';
      hormoneDesc = 'LH mencapai puncak pemicu ovulasi. Suhu basal tubuh (BBT) masih rendah sebelum melonjak 0.3 - 0.5°C esok hari.';
    } else if (dayOffsetFromOvul === -1 || dayOffsetFromOvul === -2) {
      phase = 'fertile-peak';
      phaseName = 'Jendela Subur Puncak';
      chanceName = 'Sangat Tinggi (Peak)';
      chanceLevel = 'peak';
      chancePct = '27% - 31%';
      chanceDesc = 'Salah satu hari paling optimal untuk konsepsi karena sperma dapat bertahan menyambut sel telur saat ovulasi.';
      mucusTitle = 'Lendir Sangat Basah & Licin';
      mucusDesc = 'Karakteristik lendir semakin melar, memberi nutrisi dan jalur aman bagi sperma hingga 5 hari ke depan.';
      hormoneTitle = 'Kadar Estrogen Mencapai Puncak';
      hormoneDesc = 'Estrogen memicu kelenjar serviks membuka dan merangsang kelenjar pituitari melepaskan gelombang LH.';
    } else if (dayOffsetFromOvul >= -5 && dayOffsetFromOvul < -2) {
      phase = 'fertile';
      phaseName = 'Jendela Subur';
      chanceName = 'Tinggi';
      chanceLevel = 'high';
      chancePct = '12% - 20%';
      chanceDesc = 'Memasuki masa subur. Sperma yang masuk pada hari ini dapat bertahan hingga hari ovulasi tiba.';
      mucusTitle = 'Lendir Mulai Berair & Creamy Basah';
      mucusDesc = 'Cairan serviks bertransisi dari creamy menjadi lebih encer dan licin menyambut fase ovulasi.';
      hormoneTitle = 'Estrogen Meningkat Pesat';
      hormoneDesc = 'Folikel dominan (Graafian) sedang berkembang pesat di salah satu ovarium.';
    } else if (dayOffsetFromOvul === 1) {
      phase = 'fertile-late';
      phaseName = 'Pasca Ovulasi';
      chanceName = 'Sedang - Menurun';
      chanceLevel = 'medium';
      chancePct = '5% - 9%';
      chanceDesc = 'Sel telur mendekati batas akhir kelangsungan hidup (12 - 24 jam). Peluang kehamilan mulai turun tajam.';
      mucusTitle = 'Lendir Mulai Mengental';
      mucusDesc = 'Cairan serviks mulai mengering atau kembali kental karena pengaruh progesteron yang mulai naik.';
      hormoneTitle = 'Lonjakan Suhu Basal Tubuh (BBT)';
      hormoneDesc = 'Korpus luteum mulai memproduksi progesteron, menyebabkan kenaikan suhu basal tubuh sekitar 0.3 - 0.5°C.';
    } else if (dayOffsetFromOvul > 1) {
      phase = 'luteal';
      phaseName = 'Fase Luteal';
      chanceName = 'Sangat Rendah (Masa Kurang Subur)';
      chanceLevel = 'safe';
      chancePct = '< 1%';
      chanceDesc = 'Sel telur sudah tidak lagi viabel. Peluang konsepsi sangat kecil hingga siklus menstruasi berikutnya.';
      mucusTitle = 'Cairan Serviks Kering / Kental Putih';
      mucusDesc = 'Kanal serviks tertutup oleh sumbatan lendir kental di bawah pengaruh hormon progesteron.';
      hormoneTitle = 'Progesteron Dominan';
      hormoneDesc = 'Progesteron mempertahankan ketebalan endometrium. Menjelang akhir siklus, gejala PMS mungkin mulai terasa.';
    }
  } else {
    const fertileStartIndex = metrics.cycleMin - 18;
    const fertileEndIndex = metrics.cycleMax - 11;
    const ovulStartIndex = metrics.cycleMin - metrics.lutealPhase;
    const ovulEndIndex = metrics.cycleMax - metrics.lutealPhase;

    if (cycleDay >= ovulStartIndex && cycleDay <= ovulEndIndex) {
      phase = 'ovulation';
      phaseName = 'Rentang Perkiraan Ovulasi';
      chanceName = 'Puncak (Sangat Tinggi)';
      chanceLevel = 'peak';
      chancePct = '25% - 30%';
      chanceDesc = 'Berada dalam rentang ovulasi potensial berdasarkan variasi siklus Anda.';
      mucusTitle = 'Lendir Serviks Tipe Sangat Subur (Egg-White)';
      mucusDesc = 'Sangat licin, jernih, dan melar menyerupai putih telur mentah.';
      hormoneTitle = 'Lonjakan Hormon LH dan Estrogen';
      hormoneDesc = 'Pelepasan sel telur berpeluang besar terjadi di antara rentang tanggal ini.';
    } else if (cycleDay >= fertileStartIndex && cycleDay <= fertileEndIndex) {
      phase = 'fertile';
      phaseName = 'Jendela Subur Diperluas';
      chanceName = 'Tinggi';
      chanceLevel = 'high';
      chancePct = '15% - 25%';
      chanceDesc = 'Siklus bervariasi memperluas jendela subur untuk memastikan hari ovulasi tercakup secara aman.';
      mucusTitle = 'Cairan Serviks Berair & Licin';
      mucusDesc = 'Cairan serviks mendukung daya tahan hidup sperma hingga ovulasi terjadi.';
      hormoneTitle = 'Aktivitas Folikular Aktif';
      hormoneDesc = 'Folikel sedang matang di bawah stimulasi hormon estrogen.';
    } else if (cycleDay > fertileEndIndex) {
      phase = 'luteal';
      phaseName = 'Fase Luteal';
      chanceName = 'Sangat Rendah';
      chanceLevel = 'safe';
      chancePct = '< 2%';
      chanceDesc = 'Peluang pembuahan sangat rendah setelah jendela subur terlewati.';
      mucusTitle = 'Cairan Kering / Tidak Elastis';
      mucusDesc = 'Pengaruh progesteron membuat serviks kembali tertutup.';
      hormoneTitle = 'Progesteron Dominan';
      hormoneDesc = 'Mempersiapkan rahim untuk implantasi atau siklus berikutnya.';
    }
  }

  return {
    targetDate,
    cycleDay,
    cycleDuration,
    phase,
    phaseName,
    chanceName,
    chanceLevel,
    chancePct,
    chanceDesc,
    mucusTitle,
    mucusDesc,
    hormoneTitle,
    hormoneDesc,
  };
}

export function getThreeMonthsData(
  baseDate: Date,
  calculatedMetrics: CalculatedCycleData
): MonthCalendarData[] {
  const result: MonthCalendarData[] = [];
  const startYear = baseDate.getFullYear();
  const startMonth = baseDate.getMonth();

  for (let offset = 0; offset < 3; offset++) {
    const monthDate = new Date(startYear, startMonth + offset, 1);
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const monthTitle = formatDateMonthYear(monthDate);
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: MonthCalendarData['days'] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d);
      const evalData = evaluateDay(cellDate, calculatedMetrics);
      days.push({
        dayNumber: d,
        date: cellDate,
        evaluation: evalData,
      });
    }

    result.push({
      year,
      month,
      monthTitle,
      firstDayOfWeek,
      daysInMonth,
      days,
    });
  }

  return result;
}

