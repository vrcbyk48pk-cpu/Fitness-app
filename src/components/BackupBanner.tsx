import { useLiveQuery } from 'dexie-react-hooks'
import { backUpNow } from '../backup'
import { backupIsDue, daysSince } from '../backupData'
import { dismissBackupBanner, firstUse, getBackupBannerDismissed, getLastBackup } from '../db'
import Button from './Button'
import { t } from '../i18n'

// A gentle reminder on the Today screen when the last backup is more than a week old.
export default function BackupBanner() {
  const state = useLiveQuery(async () => ({
    lastBackup: await getLastBackup(),
    firstUse: await firstUse(),
    dismissedAt: await getBackupBannerDismissed(),
  }))
  const now = Date.now()
  if (!state || !backupIsDue(now, state.lastBackup, state.firstUse, state.dismissedAt)) return null

  return (
    <div className="row surface banner">
      <div className="row-main">
        <div className="row-title">{t('banner.title')}</div>
        <div className="muted">
          {state.lastBackup === undefined
            ? t('banner.never')
            : t('banner.daysAgo', { days: daysSince(state.lastBackup, now) })}
        </div>
      </div>
      <Button variant="primary" size="small" icon="share" onClick={() => backUpNow().catch(() => {})}>
        {t('banner.backUp')}
      </Button>
      <Button size="small" layout="round" icon="close" onClick={dismissBackupBanner} aria-label={t('banner.dismiss')} />
    </div>
  )
}
