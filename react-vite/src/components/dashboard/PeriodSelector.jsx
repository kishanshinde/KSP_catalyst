const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

function yearRange() {
  const max = new Date().getFullYear()
  const min = Math.max(2020, max - 10)
  const years = []
  for (let y = min; y <= max; y++) years.push(y)
  return years
}

export default function PeriodSelector({ year, month, onYearChange, onMonthChange }) {
  return (
    <div className="flex items-center gap-3 shrink-0">
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
          Year
        </label>
        <select
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="px-3 py-2 rounded-lg text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white min-w-[88px]"
        >
          {yearRange().map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1.5">
        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
          Month
        </label>
        <select
          value={month ?? ''}
          onChange={(e) => {
            const val = e.target.value
            onMonthChange(val ? Number(val) : null)
          }}
          className="px-3 py-2 rounded-lg text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white min-w-[120px]"
        >
          <option value="">All Months</option>
          {MONTH_NAMES.map((name, idx) => (
            <option key={idx} value={idx + 1}>{name}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
