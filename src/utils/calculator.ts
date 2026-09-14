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

export function formatDateFull(date: Date, locale: string = 'id'): string {
  const loc = locale.startsWith('en') ? 'en-US' : 'id-ID';
  return date.toLocaleDateString(loc, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateShort(date: Date, locale: string = 'id'): string {
  const loc = locale.startsWith('en') ? 'en-US' : 'id-ID';
  return date.toLocaleDateString(loc, {
    day: 'numeric',
    month: 'short',
  });
}

export function formatDateMonthYear(date: Date, locale: string = 'id'): string {
  const loc = locale.startsWith('en') ? 'en-US' : 'id-ID';
  return date.toLocaleDateString(loc, {
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

export function evaluateDay(
  targetDate: Date,
  metrics: CalculatedCycleData | null,
  locale: string = 'id'
): DayEvaluation | null {
  if (!metrics) return null;

  const isEn = locale.startsWith('en');
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
  let phaseName = isEn ? 'Follicular Phase' : 'Fase Folikular';
  let chanceName = isEn ? 'Low' : 'Rendah';
  let chanceLevel: DayEvaluation['chanceLevel'] = 'low';
  let chancePct = '< 3%';
  let chanceDesc = isEn
    ? 'Low conception chance. Egg is not yet ready for fertilization.'
    : 'Peluang pembuahan rendah. Sel telur belum siap dibuahi.';
  let mucusTitle = isEn
    ? 'Minimal / Slightly Sticky Fluid'
    : 'Cairan Serviks Minimal / Sedikit Lengket';
  let mucusDesc = isEn
    ? 'After period ends, cervical fluid tends to be dry or creamy and acidic, not supporting sperm longevity.'
    : 'Setelah haid usai, cairan serviks cenderung kering atau kental creamy dan asam, tidak mendukung kelangsungan hidup sperma.';
  let hormoneTitle = isEn
    ? 'Estrogen Rises Gradually'
    : 'Estrogen Mulai Meningkat Bertahap';
  let hormoneDesc = isEn
    ? 'FSH stimulates new follicle maturation in the ovaries. Physical energy and mood begin to improve.'
    : 'FSH merangsang pematangan folikel baru di ovarium. Energi fisik dan mood umumnya mulai membaik.';

  if (cycleDay <= pDuration) {
    phase = 'period';
    phaseName = isEn ? 'Menstruation' : 'Menstruasi';
    chanceName = isEn ? 'Very Low' : 'Sangat Rendah';
    chanceLevel = 'very-low';
    chancePct = '< 1%';
    chanceDesc = isEn
      ? 'Very low pregnancy chance. Natural shedding of the uterine lining is occurring.'
      : 'Peluang hamil sangat rendah. Terjadi peluruhan dinding rahim secara alami.';
    mucusTitle = isEn ? 'Active Menstrual Flow' : 'Pendarahan Haid Aktif';
    mucusDesc = isEn
      ? 'The uterine lining releases endometrial tissue that was unfertilized from the previous cycle.'
      : 'Dinding rahim melepaskan jaringan endometrium yang tidak dibuahi pada siklus sebelumnya.';
    hormoneTitle = isEn
      ? 'Estrogen & Progesterone at Baseline'
      : 'Estrogen & Progesteron di Titik Dasar (Baseline)';
    hormoneDesc = isEn
      ? 'Hormones are at resting state. The body requires rest, hydration, and iron-rich nutrition.'
      : 'Kadar hormon berada di titik istirahat. Tubuh memerlukan kenyamanan, hidrasi cukup, dan nutrisi zat besi.';
  } else if (!metrics.isVariable) {
    const ovulDay = metrics.ovulationDayIndex;
    const dayOffsetFromOvul = cycleDay - 1 - ovulDay;

    if (dayOffsetFromOvul === 0) {
      phase = 'ovulation';
      phaseName = isEn ? 'Peak Ovulation Day' : 'Hari Ovulasi Puncak';
      chanceName = isEn ? 'Peak (Very High)' : 'Puncak (Sangat Tinggi)';
      chanceLevel = 'peak';
      chancePct = '28% - 33%';
      chanceDesc = isEn
        ? 'Highest conception chance! Mature egg is released into the fallopian tube, surviving 12-24 hours.'
        : 'Peluang konsepsi tertinggi! Sel telur matang dilepaskan ke tuba fallopi dan bertahan 12 - 24 jam.';
      mucusTitle = isEn ? 'Egg-White Cervical Mucus' : 'Lendir Tipe Putih Telur Mentah (Egg-White)';
      mucusDesc = isEn
        ? 'Mucus is very slippery, clear, and stretchy, facilitating rapid sperm transport.'
        : 'Lendir sangat licin, jernih, dan elastis (dapat ditarik beberapa sentimeter tanpa putus), mempermudah sperma berenang cepat.';
      hormoneTitle = isEn ? 'LH Surge (Luteinizing Hormone)' : 'Lonjakan Hormon LH (Luteinizing Hormone)';
      hormoneDesc = isEn
        ? 'LH peaks to trigger ovulation. Basal body temperature (BBT) remains low before rising 0.3-0.5°C tomorrow.'
        : 'LH mencapai puncak pemicu ovulasi. Suhu basal tubuh (BBT) masih rendah sebelum melonjak 0.3 - 0.5°C esok hari.';
    } else if (dayOffsetFromOvul === -1 || dayOffsetFromOvul === -2) {
      phase = 'fertile-peak';
      phaseName = isEn ? 'Peak Fertile Window' : 'Jendela Subur Puncak';
      chanceName = isEn ? 'Very High (Peak)' : 'Sangat Tinggi (Peak)';
      chanceLevel = 'peak';
      chancePct = '27% - 31%';
      chanceDesc = isEn
        ? 'Optimal days for conception as sperm can survive to meet the released egg upon ovulation.'
        : 'Salah satu hari paling optimal untuk konsepsi karena sperma dapat bertahan menyambut sel telur saat ovulasi.';
      mucusTitle = isEn ? 'Very Wet & Slippery Mucus' : 'Lendir Sangat Basah & Licin';
      mucusDesc = isEn
        ? 'Mucus is stretchy, providing nutrients and a safe pathway for sperm up to 5 days.'
        : 'Karakteristik lendir semakin melar, memberi nutrisi dan jalur aman bagi sperma hingga 5 hari ke depan.';
      hormoneTitle = isEn ? 'Estrogen Reaches Peak' : 'Kadar Estrogen Mencapai Puncak';
      hormoneDesc = isEn
        ? 'Estrogen triggers cervical crypts to open and stimulates the pituitary gland to release the LH surge.'
        : 'Estrogen memicu kelenjar serviks membuka dan merangsang kelenjar pituitari melepaskan gelombang LH.';
    } else if (dayOffsetFromOvul >= -5 && dayOffsetFromOvul < -2) {
      phase = 'fertile';
      phaseName = isEn ? 'Fertile Window' : 'Jendela Subur';
      chanceName = isEn ? 'High' : 'Tinggi';
      chanceLevel = 'high';
      chancePct = '12% - 20%';
      chanceDesc = isEn
        ? 'Entering the fertile window. Sperm entering today can survive until ovulation occurs.'
        : 'Memasuki masa subur. Sperma yang masuk pada hari ini dapat bertahan hingga hari ovulasi tiba.';
      mucusTitle = isEn ? 'Watery & Creamy Fluid' : 'Lendir Mulai Berair & Creamy Basah';
      mucusDesc = isEn
        ? 'Cervical fluid transitions from creamy to more watery and slippery for ovulation.'
        : 'Cairan serviks bertransisi dari creamy menjadi lebih encer dan licin menyambut fase ovulasi.';
      hormoneTitle = isEn ? 'Estrogen Rises Rapidly' : 'Estrogen Meningkat Pesat';
      hormoneDesc = isEn
        ? 'The dominant Graafian follicle is developing rapidly in one of the ovaries.'
        : 'Folikel dominan (Graafian) sedang berkembang pesat di salah satu ovarium.';
    } else if (dayOffsetFromOvul === 1) {
      phase = 'fertile-late';
      phaseName = isEn ? 'Post-Ovulation' : 'Pasca Ovulasi';
      chanceName = isEn ? 'Moderate - Decreasing' : 'Sedang - Menurun';
      chanceLevel = 'medium';
      chancePct = '5% - 9%';
      chanceDesc = isEn
        ? 'The egg is nearing the end of viability (12-24 hours). Conception chance drops sharply.'
        : 'Sel telur mendekati batas akhir kelangsungan hidup (12 - 24 jam). Peluang kehamilan mulai turun tajam.';
      mucusTitle = isEn ? 'Mucus Thickens' : 'Lendir Mulai Mengental';
      mucusDesc = isEn
        ? 'Cervical fluid begins drying or thickening under rising progesterone influence.'
        : 'Cairan serviks mulai mengering atau kembali kental karena pengaruh progesteron yang mulai naik.';
      hormoneTitle = isEn ? 'Basal Body Temperature (BBT) Rise' : 'Lonjakan Suhu Basal Tubuh (BBT)';
      hormoneDesc = isEn
        ? 'Corpus luteum begins producing progesterone, raising basal body temperature by ~0.3-0.5°C.'
        : 'Korpus luteum mulai memproduksi progesteron, menyebabkan kenaikan suhu basal tubuh sekitar 0.3 - 0.5°C.';
    } else if (dayOffsetFromOvul > 1) {
      phase = 'luteal';
      phaseName = isEn ? 'Luteal Phase' : 'Fase Luteal';
      chanceName = isEn ? 'Very Low (Relatively Safe)' : 'Sangat Rendah (Masa Kurang Subur)';
      chanceLevel = 'safe';
      chancePct = '< 1%';
      chanceDesc = isEn
        ? 'Egg is no longer viable. Conception chance is minimal until the next menstrual cycle.'
        : 'Sel telur sudah tidak lagi viabel. Peluang konsepsi sangat kecil hingga siklus menstruasi berikutnya.';
      mucusTitle = isEn ? 'Dry / Thick White Mucus' : 'Cairan Serviks Kering / Kental Putih';
      mucusDesc = isEn
        ? 'Cervical canal is closed by a thick mucus plug under progesterone control.'
        : 'Kanal serviks tertutup oleh sumbatan lendir kental di bawah pengaruh hormon progesteron.';
      hormoneTitle = isEn ? 'Progesterone Dominant' : 'Progesteron Dominan';
      hormoneDesc = isEn
        ? 'Progesterone maintains endometrial thickness. Toward cycle end, PMS symptoms may occur.'
        : 'Progesteron mempertahankan ketebalan endometrium. Menjelang akhir siklus, gejala PMS mungkin mulai terasa.';
    }
  } else {
    const fertileStartIndex = metrics.cycleMin - 18;
    const fertileEndIndex = metrics.cycleMax - 11;
    const ovulStartIndex = metrics.cycleMin - metrics.lutealPhase;
    const ovulEndIndex = metrics.cycleMax - metrics.lutealPhase;

    if (cycleDay >= ovulStartIndex && cycleDay <= ovulEndIndex) {
      phase = 'ovulation';
      phaseName = isEn ? 'Estimated Ovulation Range' : 'Rentang Perkiraan Ovulasi';
      chanceName = isEn ? 'Peak (Very High)' : 'Puncak (Sangat Tinggi)';
      chanceLevel = 'peak';
      chancePct = '25% - 30%';
      chanceDesc = isEn
        ? 'Within potential ovulation range based on your cycle length variation.'
        : 'Berada dalam rentang ovulasi potensial berdasarkan variasi siklus Anda.';
      mucusTitle = isEn ? 'Highly Fertile Mucus (Egg-White)' : 'Lendir Serviks Tipe Sangat Subur (Egg-White)';
      mucusDesc = isEn
        ? 'Very slippery, clear, and stretchy resembling raw egg whites.'
        : 'Sangat licin, jernih, dan melar menyerupai putih telur mentah.';
      hormoneTitle = isEn ? 'LH & Estrogen Surge' : 'Lonjakan Hormon LH dan Estrogen';
      hormoneDesc = isEn
        ? 'Egg release has a high probability of occurring within this date range.'
        : 'Pelepasan sel telur berpeluang besar terjadi di antara rentang tanggal ini.';
    } else if (cycleDay >= fertileStartIndex && cycleDay <= fertileEndIndex) {
      phase = 'fertile';
      phaseName = isEn ? 'Extended Fertile Window' : 'Jendela Subur Diperluas';
      chanceName = isEn ? 'High' : 'Tinggi';
      chanceLevel = 'high';
      chancePct = '15% - 25%';
      chanceDesc = isEn
        ? 'Variable cycles widen the fertile window to ensure ovulation is safely covered.'
        : 'Siklus bervariasi memperluas jendela subur untuk memastikan hari ovulasi tercakup secara aman.';
      mucusTitle = isEn ? 'Watery & Slippery Fluid' : 'Cairan Serviks Berair & Licin';
      mucusDesc = isEn
        ? 'Cervical fluid supports sperm survival until ovulation occurs.'
        : 'Cairan serviks mendukung daya tahan hidup sperma hingga ovulasi terjadi.';
      hormoneTitle = isEn ? 'Active Follicular Stage' : 'Aktivitas Folikular Aktif';
      hormoneDesc = isEn
        ? 'Follicles are maturing under estrogen stimulation.'
        : 'Folikel sedang matang di bawah stimulasi hormon estrogen.';
    } else if (cycleDay > fertileEndIndex) {
      phase = 'luteal';
      phaseName = isEn ? 'Luteal Phase' : 'Fase Luteal';
      chanceName = isEn ? 'Very Low' : 'Sangat Rendah';
      chanceLevel = 'safe';
      chancePct = '< 2%';
      chanceDesc = isEn
        ? 'Conception chance is very low once the fertile window has passed.'
        : 'Peluang pembuahan sangat rendah setelah jendela subur terlewati.';
      mucusTitle = isEn ? 'Dry / Inelastic Fluid' : 'Cairan Kering / Tidak Elastis';
      mucusDesc = isEn
        ? 'Progesterone influence causes the cervix to close.'
        : 'Pengaruh progesteron membuat serviks kembali tertutup.';
      hormoneTitle = isEn ? 'Progesterone Dominant' : 'Progesteron Dominan';
      hormoneDesc = isEn
        ? 'Prepares the uterus for implantation or the next cycle.'
        : 'Mempersiapkan rahim untuk implantasi atau siklus berikutnya.';
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
  calculatedMetrics: CalculatedCycleData,
  locale: string = 'id'
): MonthCalendarData[] {
  const result: MonthCalendarData[] = [];
  const startYear = baseDate.getFullYear();
  const startMonth = baseDate.getMonth();

  for (let offset = 0; offset < 3; offset++) {
    const monthDate = new Date(startYear, startMonth + offset, 1);
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const monthTitle = formatDateMonthYear(monthDate, locale);
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: MonthCalendarData['days'] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d);
      const evalData = evaluateDay(cellDate, calculatedMetrics, locale);
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
