import { useLiveQuery } from 'dexie-react-hooks'
import { backUpNow } from '../backup'
import { backupIsDue, daysSince } from '../backupData'
import { dismissBackupBanner, firstUse, getBackupBannerDismissed, getLastBackup } from '../db'
import Button from './Button'

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
    <div className="row glass banner">
      <div className="row-main">
        <div className="row-title">Time for a backup</div>
        <div className="muted">
          {state.lastBackup === undefined
            ? 'Your data lives only on this phone, and there is no backup yet.'
            : `Your last backup was ${daysSince(state.lastBackup, now)} days ago.`}
        </div>
      </div>
      <Button variant="primary" size="small" icon="share" onClick={() => backUpNow().catch(() => {})}>
        Back up
      </Button>
      <Button size="small" layout="round" icon="close" onClick={dismissBackupBanner} aria-label="Dismiss" />
    </div>
  )
}
