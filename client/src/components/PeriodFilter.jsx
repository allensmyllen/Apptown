import { useState } from 'react';

const PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Custom range', days: null },
];

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Pure validation function for a custom date range.
 * Returns an error string if invalid, or null if valid (or incomplete).
 */
export function validateDateRange(start, end) {
  if (!start || !end) return null;
  if (start > end) return 'Start date must be before end date';
  const diffDays = (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24);
  if (diffDays > 365) return 'Range cannot exceed 365 days';
  return null;
}

function calcPreset(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  return { start: toISODate(start), end: toISODate(end) };
}

export default function PeriodFilter({ onChange }) {
  const [active, setActive] = useState('Last 30 days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [error, setError] = useState('');

  function handlePreset(preset) {
    setActive(preset.label);
    setError('');
    if (preset.days !== null) {
      const range = calcPreset(preset.days);
      onChange?.(range);
    }
  }

  function validateAndEmit(start, end) {
    const err = validateDateRange(start, end);
    if (err !== null) { setError(err); return; }
    setError('');
    onChange?.({ start, end });
  }

  function handleStartChange(e) {
    const val = e.target.value;
    setCustomStart(val);
    validateAndEmit(val, customEnd);
  }

  function handleEndChange(e) {
    const val = e.target.value;
    setCustomEnd(val);
    validateAndEmit(customStart, val);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => handlePreset(preset)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              active === preset.label
                ? 'bg-primary text-white'
                : 'bg-[#1a1a2e] text-gray-300 hover:bg-[#252545] border border-gray-700'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {active === 'Custom range' && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">Start</label>
              <input
                type="date"
                value={customStart}
                onChange={handleStartChange}
                className="bg-[#1a1a2e] border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">End</label>
              <input
                type="date"
                value={customEnd}
                onChange={handleEndChange}
                className="bg-[#1a1a2e] border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      )}
    </div>
  );
}
