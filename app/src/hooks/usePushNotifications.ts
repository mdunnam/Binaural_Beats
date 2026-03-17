import { useState, useEffect } from 'react'

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    setSupported('Notification' in window)
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  async function requestPermission() {
    if (!('Notification' in window)) return false
    const result = await Notification.requestPermission()
    setPermission(result)
    return result === 'granted'
  }

  function scheduleStreakReminder(hourOfDay = 20) {
    // Store preferred reminder hour in localStorage
    localStorage.setItem('liminal-reminder-hour', String(hourOfDay))
    localStorage.setItem('liminal-reminder-enabled', 'true')
  }

  function cancelStreakReminder() {
    localStorage.setItem('liminal-reminder-enabled', 'false')
  }

  function sendNotification(title: string, body: string, icon = '/icons/icon-192.png') {
    if (permission !== 'granted') return
    new Notification(title, { body, icon, badge: '/icons/icon-192.png' })
  }

  return { permission, supported, requestPermission, scheduleStreakReminder, cancelStreakReminder, sendNotification }
}
