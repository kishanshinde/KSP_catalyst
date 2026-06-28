import { useLanguage } from '../../../contexts/LanguageContext'

export default function FinancialAnalysis({ data }) {
  const { t } = useLanguage()

  if (!data?.assets) {
    return <div className="text-on-surface-variant/60 dark:text-slate-500 text-sm">{t('workspace.noData')}</div>
  }

  return (
    <div className="space-y-3">
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-on-surface-variant/60 dark:text-slate-400 uppercase tracking-wider">
            {t('workspace.assetAnalysis')}
          </span>
        </div>

        {data.totalUnexplained && (
          <div className="text-center py-4 mb-4 bg-error/5 rounded-lg border border-error/10">
            <p className="text-xs text-on-surface-variant/60 dark:text-slate-400 mb-1">{t('workspace.totalUnexplainedAssets')}</p>
            <p className="text-2xl font-bold text-error">₹{data.totalUnexplained}</p>
          </div>
        )}

        <div className="space-y-3">
          {data.assets.map((asset, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-200/20 dark:border-slate-700/20 last:border-0">
              <div>
                <p className="text-sm font-medium text-on-surface dark:text-white">{asset.type}</p>
                <p className="text-xs text-on-surface-variant/40 dark:text-slate-500">{asset.count} {t('workspace.items')}</p>
              </div>
              <span className="text-sm font-semibold text-on-surface dark:text-white">₹{asset.value}</span>
            </div>
          ))}
        </div>

        {data.flaggedAccounts && (
          <div className="mt-4 pt-3 border-t border-slate-200/20 dark:border-slate-700/20 flex items-center gap-2">
            <span className="text-xs font-medium text-on-surface-variant/60 dark:text-slate-400">{t('workspace.flaggedAccounts')}:</span>
            <span className="text-sm font-bold text-error">{data.flaggedAccounts}</span>
          </div>
        )}
      </div>
    </div>
  )
}
