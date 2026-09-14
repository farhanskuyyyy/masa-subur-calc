import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export interface DatePickerProps {
  value: string; // Format: YYYY-MM-DD
  onChange: (dateStr: string) => void;
  label?: string;
  id?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
  menstruationDays?: string[]; // Array of 'YYYY-MM-DD'
  className?: string;
}

const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const MONTH_NAMES_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAY_NAMES_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label,
  id,
  placeholder,
  required = false,
  disabled = false,
  minDate,
  maxDate,
  menstruationDays = [],
  className = '',
}) => {
  const { i18n } = useTranslation();
  const isEn = (i18n.language || 'en').startsWith('en');
  const monthNames = isEn ? MONTH_NAMES_EN : MONTH_NAMES_ID;
  const dayNames = isEn ? DAY_NAMES_EN : DAY_NAMES_ID;

  const defaultPlaceholder = isEn ? 'Select date...' : 'Pilih tanggal...';
  const effectivePlaceholder = placeholder || defaultPlaceholder;

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Safe parsing of date string YYYY-MM-DD
  const parseSafe = (str: string): Date => {
    if (!str) return new Date();
    const parts = str.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return new Date();
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  };

  const initialDate = value ? parseSafe(value) : new Date();
  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth());

  // Keep view in sync when value changes externally
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (value) {
      const d = parseSafe(value);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toISODate = (y: number, m: number, d: number): string => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  const today = new Date();
  const todayISO = toISODate(today.getFullYear(), today.getMonth(), today.getDate());

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const iso = toISODate(viewYear, viewMonth, day);
    onChange(iso);
    setIsOpen(false);
  };

  const handleJumpToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    const iso = toISODate(now.getFullYear(), now.getMonth(), now.getDate());
    onChange(iso);
    setIsOpen(false);
  };

  // Calendar calculations for viewMonth & viewYear
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
  const remainingCells = (7 - ((firstDayOfWeek + daysInMonth) % 7)) % 7;

  // Display text for input trigger
  const formattedDisplay = value
    ? (() => {
        const d = parseSafe(value);
        return `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      })()
    : '';

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-semibold text-ink-primary mb-2 flex items-center justify-between"
        >
          <span className="flex items-center gap-2">
            <span className="text-rose-500" aria-hidden="true">📅</span> {label}
          </span>
          {required && (
            <span className="text-xs font-normal text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
              {isEn ? 'Required' : 'Wajib'}
            </span>
          )}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full px-4 py-3 sm:py-3.5 bg-white rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer select-none text-left shadow-xs ${
          isOpen
            ? 'border-rose-400 ring-4 ring-rose-100 shadow-md'
            : 'border-rose-200 hover:border-rose-300 hover:shadow-sm'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3 truncate">
          <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          {formattedDisplay ? (
            <div>
              <span className="block text-sm sm:text-base font-bold text-ink-primary leading-tight">
                {formattedDisplay}
              </span>
              <span className="block text-[11px] text-ink-muted">
                Format: {value}
              </span>
            </div>
          ) : (
            <span className="text-sm sm:text-base text-ink-muted font-normal">
              {effectivePlaceholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-rose-400 pl-2">
          <svg
            className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </button>

      {/* Custom Calendar Grid Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 w-full sm:w-80 bg-white rounded-2xl p-4 sm:p-5 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95 duration-150">
          {/* Calendar Header with Navigation */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-rose-100">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label={isEn ? 'Previous month' : 'Bulan Sebelumnya'}
              className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>

            <div className="text-center">
              <span className="font-display font-bold text-sm sm:text-base text-rose-950">
                {monthNames[viewMonth]} {viewYear}
              </span>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              aria-label={isEn ? 'Next month' : 'Bulan Berikutnya'}
              className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-ink-muted mb-2">
            {dayNames.map((name, idx) => (
              <div key={name} className={idx === 0 ? 'text-rose-500' : 'text-gray-500'}>
                {name}
              </div>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => {
              const prevDayNum = daysInPrevMonth - firstDayOfWeek + i + 1;
              return (
                <div
                  key={`prev-${i}`}
                  className="h-8 sm:h-9 rounded-xl flex items-center justify-center text-xs text-gray-300 select-none"
                >
                  {prevDayNum}
                </div>
              );
            })}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateISO = toISODate(viewYear, viewMonth, day);
              const isSelected = dateISO === value;
              const isToday = dateISO === todayISO;
              const isMenstruation = menstruationDays.includes(dateISO);

              let isDisabled = false;
              if (minDate && dateISO < minDate) isDisabled = true;
              if (maxDate && dateISO > maxDate) isDisabled = true;

              let btnClasses =
                'h-8 sm:h-9 rounded-xl flex flex-col items-center justify-center text-xs font-semibold transition-colors relative select-none cursor-pointer ';

              if (isDisabled) {
                btnClasses += 'text-gray-300 opacity-40 cursor-not-allowed ';
              } else if (isSelected) {
                btnClasses +=
                  'bg-rose-500 text-white font-bold shadow-md shadow-rose-200 z-10 ';
              } else if (isMenstruation) {
                btnClasses +=
                  'bg-rose-100 text-rose-800 border border-rose-200 hover:bg-rose-200 font-bold ';
              } else {
                btnClasses +=
                  'text-ink-primary hover:bg-rose-100 hover:text-rose-700 ';
              }

              if (isToday && !isSelected) {
                btnClasses += 'ring-2 ring-rose-500 font-extrabold text-rose-600 ';
              }

              return (
                <button
                  type="button"
                  key={`day-${day}`}
                  disabled={isDisabled}
                  onClick={() => handleSelectDay(day)}
                  className={btnClasses}
                  aria-label={`${day} ${monthNames[viewMonth]} ${viewYear}`}
                >
                  <span className="leading-none">{day}</span>
                  {isMenstruation && !isSelected && (
                    <span className="text-[7px] leading-none mt-0.5 text-rose-500" aria-hidden="true">💧</span>
                  )}
                </button>
              );
            })}

            {Array.from({ length: remainingCells }).map((_, i) => (
              <div
                key={`next-${i}`}
                className="h-8 sm:h-9 rounded-xl flex items-center justify-center text-xs text-gray-300 select-none"
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* Quick Shortcuts & Legend Footer */}
          <div className="mt-4 pt-3 border-t border-rose-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleJumpToday}
              className="text-rose-600 hover:text-rose-800 font-bold hover:underline transition-colors cursor-pointer"
            >
              {isEn ? 'Today' : 'Hari Ini'}
            </button>

            {menstruationDays.length > 0 && (
              <div className="flex items-center gap-1 text-[11px] text-ink-muted">
                <span className="w-2 h-2 rounded-full bg-rose-400" aria-hidden="true"></span>
                <span>{isEn ? 'Period' : 'Fase Haid'}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-ink-muted hover:text-ink-primary font-medium hover:underline transition-colors cursor-pointer"
            >
              {isEn ? 'Close' : 'Tutup'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
