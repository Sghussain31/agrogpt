import Dexie, { type Table } from 'dexie'

/** Crop status for rotation / harvest tracking */
export type CropStatus = 'active' | 'harvested' | 'planned'

export interface CropRecord {
  id?: number
  name: string
  variety: string
  /** ISO date string (YYYY-MM-DD) */
  plantedDate: string
  /** Area in acres */
  area: number
  status: CropStatus
}

export interface LedgerRecord {
  id?: number
  cropId?: number | null
  type: 'income' | 'expense'
  /** Display category / label (e.g. Diesel, Fertilizer) */
  category: string
  amount: number
  /** ISO datetime string */
  date: string
  notes?: string
  /** 0 = pending sync, 1 = synced (mock server) */
  synced: 0 | 1
}

export interface ScanRecord {
  id?: number
  timestamp: number
  /** JSON string: mode, title, meta, etc. */
  resultJson: string
  imageBlob: Blob
}

/** Single-device user profile synced from auth (id is always 1). */
export interface OfflineMetadataRecord {
  id: number
  name: string
  phone: string
  email?: string
  city?: string
  updatedAt: number
}

export class AgroGPTDatabase extends Dexie {
  crops!: Table<CropRecord, number>
  ledger!: Table<LedgerRecord, number>
  scans!: Table<ScanRecord, number>
  offlineMetadata!: Table<OfflineMetadataRecord, number>

  constructor() {
    super('AgroGPT')
    this.version(1).stores({
      crops: '++id, name, status, plantedDate',
      ledger: '++id, cropId, type, date, synced',
      scans: '++id, timestamp',
    })
    this.version(2).stores({
      offlineMetadata: 'id',
    })
  }
}

export const db = new AgroGPTDatabase()

const PROFILE_ID = 1

type UpsertOfflineInput = Pick<OfflineMetadataRecord, 'name' | 'phone'> & {
  email?: string | undefined
  city?: string | undefined
  /** When true, replace email/city with `data` values (including clearing when undefined). */
  replaceOptional?: boolean
}

export async function upsertOfflineMetadata(data: UpsertOfflineInput) {
  const existing = await db.offlineMetadata.get(PROFILE_ID)
  const email =
    data.replaceOptional
      ? data.email
      : (data.email ?? existing?.email)
  const city =
    data.replaceOptional
      ? data.city
      : (data.city ?? existing?.city)
  await db.offlineMetadata.put({
    id: PROFILE_ID,
    name: data.name || existing?.name || '',
    phone: data.phone,
    email: email || undefined,
    city: city || undefined,
    updatedAt: Date.now(),
  })
}
