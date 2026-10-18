import api from './api'
import {
  getPendingReadings,
  getPendingPayments,
  clearSyncedReadings,
  clearSyncedPayments,
} from './offlineStore'

let syncing = false

export async function syncOfflineData(): Promise<{ readings: number; payments: number }> {
  if (syncing) return { readings: 0, payments: 0 }
  if (!navigator.onLine) return { readings: 0, payments: 0 }

  syncing = true
  let syncedReadings = 0
  let syncedPayments = 0

  try {
    const readings = await getPendingReadings()
    const payments = await getPendingPayments()

    if (readings.length === 0 && payments.length === 0) {
      return { readings: 0, payments: 0 }
    }

    const res = await api.post('/sync/push', { readings, payments })
    const data = res.data

    const syncedReadingIds = data.readings
      .filter((r: { success: boolean }) => r.success)
      .map((r: { client_id: string }) => r.client_id)
    const syncedPaymentIds = data.payments
      .filter((p: { success: boolean }) => p.success)
      .map((p: { client_id: string }) => p.client_id)

    if (syncedReadingIds.length > 0) {
      await clearSyncedReadings(syncedReadingIds)
    }
    if (syncedPaymentIds.length > 0) {
      await clearSyncedPayments(syncedPaymentIds)
    }

    syncedReadings = syncedReadingIds.length
    syncedPayments = syncedPaymentIds.length
  } catch {
    // will retry later
  } finally {
    syncing = false
  }

  return { readings: syncedReadings, payments: syncedPayments }
}

export function startAutoSync(): () => void {
  const interval = setInterval(() => {
    if (navigator.onLine) {
      syncOfflineData()
    }
  }, 30_000)

  const handleOnline = () => {
    syncOfflineData()
  }
  window.addEventListener('online', handleOnline)

  // initial sync
  syncOfflineData()

  return () => {
    clearInterval(interval)
    window.removeEventListener('online', handleOnline)
  }
}
