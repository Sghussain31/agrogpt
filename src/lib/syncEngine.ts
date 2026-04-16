import { db } from './db'
import { initDatabase } from './repository'

/**
 * Mock sync: push unsynced ledger rows to a fake backend, then mark synced.
 */
export async function syncData(): Promise<{ synced: number; failed: number }> {
  await initDatabase()

  const pending = await db.ledger.where('synced').equals(0).toArray()
  let synced = 0
  let failed = 0

  for (const row of pending) {
    if (row.id == null) continue
    try {
      await mockPushToServer(row)
      await db.ledger.update(row.id, { synced: 1 })
      synced++
    } catch {
      failed++
    }
  }

  return { synced, failed }
}

async function mockPushToServer(payload: unknown): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 180 + Math.random() * 400)
  })
  void payload
}
