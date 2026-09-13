export type CycleMode = 'regular' | 'variable';

export type CyclePhase =
  | 'period'
  | 'follicular'
  | 'fertile'
  | 'fertile-peak'
  | 'ovulation'
  | 'fertile-late'
  | 'luteal';

export type ChanceLevel = 'very-low' | 'low' | 'medium' | 'high' | 'peak' | 'safe';

export interface RegularCycleMetrics {
  isVariable: false;
  cycleLength: number;
  periodDuration: number;
  lutealPhase: number;
  lastPeriodDate: Date;
  ovulationDate: Date;
  ovulationDayIndex: number;
  fertileStart: Date;
  fertileEnd: Date;
  peakStart: Date;
  peakEnd: Date;
  periodEnd: Date;
  safeBeforeStart: Date;
  safeBeforeEnd: Date;
  safeAfterStart: Date;
  safeAfterEnd: Date;
  nextPeriodDate: Date;
  pregnancyTestDate: Date;
}

export interface VariableCycleMetrics {
  isVariable: true;
  cycleMin: number;
  cycleMax: number;
  periodDuration: number;
  lutealPhase: number;
  lastPeriodDate: Date;
  ovulationStartDate: Date;
  ovulationEndDate: Date;
  fertileStart: Date;
  fertileEnd: Date;
  periodEnd: Date;
  safeBeforeStart: Date;
  safeBeforeEnd: Date;
  safeAfterStart: Date;
  safeAfterEnd: Date;
  nextPeriodStartDate: Date;
  nextPeriodEndDate: Date;
  pregnancyTestDate: Date;
}

export type CalculatedCycleData = RegularCycleMetrics | VariableCycleMetrics;

export interface DayEvaluation {
  targetDate: Date;
  cycleDay: number;
  cycleDuration: number;
  phase: CyclePhase;
  phaseName: string;
  chanceName: string;
  chanceLevel: ChanceLevel;
  chancePct: string;
  chanceDesc: string;
  mucusTitle: string;
  mucusDesc: string;
  hormoneTitle: string;
  hormoneDesc: string;
}

export interface CalculatorState {
  lastPeriodDate: Date | null;
  isVariable: boolean;
  cycleLength: number;
  cycleMin: number;
  cycleMax: number;
  periodDuration: number;
  lutealPhase: number;
}

export interface MonthCalendarData {
  year: number;
  month: number;
  monthTitle: string;
  firstDayOfWeek: number;
  daysInMonth: number;
  days: Array<{
    dayNumber: number;
    date: Date;
    evaluation: DayEvaluation | null;
  }>;
}

