import { usePushNotifications } from '../hooks/usePushNotifications'
import { useState } from 'react'
import { IconBell } from './Icons'

export function NotificationSettings() {
  const { permission, supported, requestPermission, scheduleStreakReminder, sendNotification } = usePushNotifications()
  const [hour, setHour] = useState(() => Number(localStorage.getItem('liminal-reminder-hour') ?? 20))

  if (!supported) return null

  return (
    <div className="notif-settings-card">
      <div className="notif-settings-title"><IconBell size={15} /> Daily Reminders</div>
      <div className="notif-settings-sub">Get a nudge to keep your streak alive</div>
      {permission !== 'granted' ? (
        <button className="soft-button soft-button--accent soft-button--sm" onClick={requestPermission}>
          Enable Reminders
        </button>
      ) : (
        <div className="notif-settings-controls">
          <label className="notif-label">
            Remind me at
            <select value={hour} onChange={e => { setHour(Number(e.target.value)); scheduleStreakReminder(Number(e.target.value)) }} className="notif-select">
              {Array.from({length: 24}, (_, i) => (
                <option key={i} value={i}>{i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i-12}:00 PM`}</option>
              ))}
            </select>
          </label>
          <button className="soft-button soft-button--sm" onClick={() => sendNotification('🧘 Time for Liminal', 'Your daily session is waiting. Keep your streak alive.')}>
            Test
          </button>
        </div>
      )}
    </div>
  )
}
