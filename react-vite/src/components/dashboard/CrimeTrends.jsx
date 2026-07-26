import { useState, useCallback } from 'react'
import useCrimeTrends from '../../hooks/useCrimeTrends'
import { generateReport } from '../../services/crimeTrendsService'
import { toast } from '../common/Toast'
import PeriodSelector from './PeriodSelector'
import OperationalSummary from './OperationalSummary'
import CrimeTrendChart from './CrimeTrendChart'
import CrimeDistribution from './CrimeDistribution'
import { Loader2, FileText, RefreshCw, AlertTriangle, BarChart3, CheckCircle2 } from 'lucide-react'

function SkeletonBlock({ className = '', height = 'h-24' }) {
  return (
    <div className={`${height} bg-slate-200 dark:bg-slate-700/50 rounded-xl animate-pulse ${className}`} />
  )
}

function SkeletonRow() {
  return (
    <div className="grid grid-cols-4 gap-6">
      <SkeletonBlock height="h-28" />
      <SkeletonBlock height="h-28" />
      <SkeletonBlock height="h-28" />
      <SkeletonBlock height="h-28" />
    </div>
  )
}

const DEFAULT_BAR_COLOR = '#004ac6'

export default function CrimeTrends() {
  const { data, loading, error, refresh, year, setYear, month, setMonth } = useCrimeTrends()
  const [generating, setGenerating] = useState(false)
  const [pdfSuccess, setPdfSuccess] = useState(false)
  const [barColor, setBarColor] = useState(DEFAULT_BAR_COLOR)

  const handleGeneratePDF = useCallback(async () => {
    if (!data || generating) return
    setGenerating(true)
    setPdfSuccess(false)

    try {
      const blob = await generateReport({
        reportType: 'crime_trends',
        ...data,
        generatedAt: data.metadata?.generatedAt,
        barColor
      })

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const pdfName = data.monthName
        ? `Crime_Intelligence_Report_${data.monthName}_${data.year}.pdf`
        : `Crime_Intelligence_Report_${data.year}.pdf`
      a.download = pdfName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setPdfSuccess(true)
      toast('Intelligence report downloaded successfully.', 'success', 2000)
      setTimeout(() => setPdfSuccess(false), 2000)
    } catch (err) {
      toast('Failed to generate intelligence report.', 'error', 4000)
    } finally {
      setGenerating(false)
    }
  }, [data, generating, barColor])

  if (error && !data) {
    return (
      <section className="glass-panel p-8 rounded-2xl">
        <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
          <AlertTriangle className="w-12 h-12 text-error" aria-hidden="true" />
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Unable to load crime trends
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {error.message || 'An unexpected error occurred.'}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={refresh}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Retry
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="glass-panel p-8 rounded-2xl w-full">
      <div className="mx-auto w-full" style={{ maxWidth: '1600px' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
            <BarChart3 className="w-6 h-6 text-primary" aria-hidden="true" />
            Crime Analytics
          </h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 cursor-pointer">
              Chart color
              <input
                type="color"
                value={barColor}
                onChange={(e) => setBarColor(e.target.value)}
                className="h-7 w-10 rounded-md border border-outline-variant dark:border-slate-700 cursor-pointer bg-transparent"
                title="Choose the chart bar color — used here and in the downloaded PDF"
              />
            </label>
            <PeriodSelector
              year={year}
              month={month}
              onYearChange={setYear}
              onMonthChange={setMonth}
            />
          </div>
        </div>

        {loading && !data ? (
          <div className="space-y-8">
            <SkeletonRow />
            <SkeletonBlock height="h-[420px]" />
            <SkeletonBlock height="h-64" />
          </div>
        ) : data ? (
          <div className="space-y-8">
            <OperationalSummary
              summary={data.summary}
              trendPercentage={data.summary?.trendPercentage}
            />

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <div className="xl:col-span-8">
                <CrimeTrendChart chart={data.chart} isMonthView={!data.month} barColor={barColor} />
              </div>
              <div className="xl:col-span-4">
                <CrimeDistribution crimeTypes={data.crimeTypes} />
              </div>
            </div>

            {data.summary && data.summary.totalCrimes === 0 ? (
              <div className="glass-panel p-8 rounded-xl flex items-center justify-center h-32">
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  No crime data available for this period.
                </p>
              </div>
            ) : null}

            <div className="flex justify-center pt-4">
              <button
                onClick={handleGeneratePDF}
                disabled={generating}
                className="inline-flex items-center justify-center gap-3 px-10 py-4 min-w-[280px] bg-primary text-on-primary rounded-xl text-sm font-bold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                aria-label={generating ? 'Generating intelligence report' : 'Download intelligence report'}
              >
                {generating ? (
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                ) : pdfSuccess ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-200" aria-hidden="true" />
                ) : (
                  <FileText className="w-5 h-5" aria-hidden="true" />
                )}
                {generating
                  ? 'Generating Report...'
                  : pdfSuccess
                    ? 'Report Downloaded'
                    : 'Download Intelligence Report'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
