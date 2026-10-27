import { app } from 'electron'
import { join } from 'path'
import fs from 'fs'
import os from 'os'
import crypto from 'crypto'
import type { Database } from 'sqlite3'

const LICENSE_SECRET = 'addy_inventory_secure_salt_2026_x89'
const DEFAULT_PRICE = 1000
const DEFAULT_N8N_URL = 'http://143.110.253.214:5678/webhook'

export interface LicenseStatus {
  isRegistered: boolean
  isLocked: boolean
  lockReason: 'NOT_REGISTERED' | 'TRIAL_EXPIRED' | 'PENDING' | 'CLOCK_TAMPERED' | null
  daysRemaining: number
  paymentStatus: 'Trial' | 'Pending' | 'Paid'
  registration: {
    fullName: string
    businessName: string
    contactNo: string
    registeredAt: string
    trialEndsAt: string
    paidUntil: string | null
    currentPrice: number
    notes: string | null
  } | null
  machineId: string
}

/**
 * Returns a persistent, unique machine hardware identifier.
 */
export function getMachineId(): string {
  try {
    const machineIdFile = join(app.getPath('userData'), '.machine_id')
    if (fs.existsSync(machineIdFile)) {
      const existing = fs.readFileSync(machineIdFile, 'utf8').trim()
      if (existing && existing.startsWith('MC-')) {
        return existing
      }
    }

    const rawData = [
      os.hostname(),
      os.platform(),
      os.arch(),
      os.cpus()[0]?.model || 'generic_cpu',
      os.homedir()
    ].join('###')

    const hash = crypto.createHash('sha256').update(rawData).digest('hex').substring(0, 16).toUpperCase()
    const newMachineId = `MC-${hash}`
    fs.writeFileSync(machineIdFile, newMachineId, 'utf8')
    return newMachineId
  } catch {
    return `MC-${os.hostname().toUpperCase().substring(0, 12)}`
  }
}

/**
 * Generates an HMAC-SHA256 tamper-evident seal for local license data.
 */
export function computeLicenseSignature(
  machineId: string,
  trialEndsAt: string,
  paymentStatus: string,
  paidUntil: string | null
): string {
  const payload = `${machineId}|${trialEndsAt}|${paymentStatus}|${paidUntil || 'NONE'}`
  return crypto.createHmac('sha256', LICENSE_SECRET).update(payload).digest('hex')
}

// Promisified SQLite helpers
function runAsync(db: Database, sql: string, params: any[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

function getAsync(db: Database, sql: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err)
      else resolve(row)
    })
  })
}

/**
 * Ensures the app_user_registration table and notes column exist in the database.
 */
export async function initLicenseSchema(db: Database): Promise<void> {
  await runAsync(
    db,
    `CREATE TABLE IF NOT EXISTS app_user_registration (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      machine_id TEXT NOT NULL,
      full_name TEXT NOT NULL,
      business_name TEXT NOT NULL,
      contact_no TEXT NOT NULL,
      registered_at DATETIME NOT NULL,
      payment_status TEXT DEFAULT 'Trial',
      date_of_payment DATETIME,
      trial_ends_at DATETIME NOT NULL,
      paid_until DATETIME,
      current_price REAL DEFAULT 1000,
      notes TEXT,
      last_recorded_local_time INTEGER NOT NULL,
      license_signature TEXT NOT NULL,
      tamper_detected INTEGER DEFAULT 0
    )`
  )

  // Safe migration for existing installations that don't have the `notes` column yet
  await runAsync(db, `ALTER TABLE app_user_registration ADD COLUMN notes TEXT`).catch(() => {
    // Ignore error if column already exists
  })
}

/**
 * Checks current license and subscription status with offline & anti-tamper guards.
 */
export async function getLicenseStatus(db: Database): Promise<LicenseStatus> {
  const machineId = getMachineId()
  const now = new Date()
  const nowSeconds = Math.floor(now.getTime() / 1000)

  const record = await getAsync(db, 'SELECT * FROM app_user_registration WHERE id = 1')

  if (!record) {
    return {
      isRegistered: false,
      isLocked: true,
      lockReason: 'NOT_REGISTERED',
      daysRemaining: 0,
      paymentStatus: 'Trial',
      registration: null,
      machineId
    }
  }

  // 1. Clock Rollback & Tamper Verification
  if (record.tamper_detected === 1) {
    return {
      isRegistered: true,
      isLocked: true,
      lockReason: 'CLOCK_TAMPERED',
      daysRemaining: 0,
      paymentStatus: record.payment_status || 'Pending',
      registration: formatRegistration(record),
      machineId
    }
  }

  // Verify HMAC signature
  const expectedSig = computeLicenseSignature(
    record.machine_id,
    record.trial_ends_at,
    record.payment_status,
    record.paid_until
  )

  if (expectedSig !== record.license_signature) {
    console.error('[License] Tamper detected! Database signature mismatch.')
    await runAsync(db, 'UPDATE app_user_registration SET tamper_detected = 1 WHERE id = 1')
    return {
      isRegistered: true,
      isLocked: true,
      lockReason: 'CLOCK_TAMPERED',
      daysRemaining: 0,
      paymentStatus: 'Pending',
      registration: formatRegistration(record),
      machineId
    }
  }

  // Check clock rollback (if system clock is rolled back by > 2 minutes from last recorded time)
  if (nowSeconds < record.last_recorded_local_time - 120) {
    console.error(`[License] Clock rollback detected! Now: ${nowSeconds}, Last: ${record.last_recorded_local_time}`)
    await runAsync(db, 'UPDATE app_user_registration SET tamper_detected = 1 WHERE id = 1')
    return {
      isRegistered: true,
      isLocked: true,
      lockReason: 'CLOCK_TAMPERED',
      daysRemaining: 0,
      paymentStatus: 'Pending',
      registration: formatRegistration(record),
      machineId
    }
  }

  // Advance the monotonic heartbeat timestamp
  await runAsync(db, 'UPDATE app_user_registration SET last_recorded_local_time = ? WHERE id = 1', [nowSeconds])

  const rawStatus = (record.payment_status || 'Trial').toString().trim().toLowerCase()

  // 2. Status Evaluation
  // Case A: Explicitly set to 'Pending' by admin in PostgreSQL
  if (rawStatus === 'pending') {
    return {
      isRegistered: true,
      isLocked: true,
      lockReason: 'PENDING',
      daysRemaining: 0,
      paymentStatus: 'Pending',
      registration: formatRegistration(record),
      machineId
    }
  }

  // Case B: Paid Subscription
  if (rawStatus === 'paid') {
    if (record.paid_until && now >= new Date(record.paid_until)) {
      return {
        isRegistered: true,
        isLocked: true,
        lockReason: 'PENDING',
        daysRemaining: 0,
        paymentStatus: 'Pending',
        registration: formatRegistration(record),
        machineId
      }
    }

    const daysRemaining = record.paid_until
      ? Math.max(0, Math.ceil((new Date(record.paid_until).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 30

    return {
      isRegistered: true,
      isLocked: false,
      lockReason: null,
      daysRemaining,
      paymentStatus: 'Paid',
      registration: formatRegistration(record),
      machineId
    }
  }

  // Case C: 30-Day Free Trial
  const trialEnd = new Date(record.trial_ends_at)
  if (now >= trialEnd) {
    return {
      isRegistered: true,
      isLocked: true,
      lockReason: 'TRIAL_EXPIRED',
      daysRemaining: 0,
      paymentStatus: 'Trial',
      registration: formatRegistration(record),
      machineId
    }
  }

  const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

  return {
    isRegistered: true,
    isLocked: false,
    lockReason: null,
    daysRemaining,
    paymentStatus: 'Trial',
    registration: formatRegistration(record),
    machineId
  }
}

/**
 * Registers a new app user on fresh installation, starts the 30-day trial, and alerts n8n.
 */
export async function registerAppUser(
  db: Database,
  data: { fullName: string; businessName: string; contactNo: string }
): Promise<LicenseStatus> {
  const machineId = getMachineId()
  const now = new Date()
  const nowSeconds = Math.floor(now.getTime() / 1000)

  // 30 days trial ending at 00:00:00 on Day 31
  const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  trialEnd.setHours(0, 0, 0, 0)

  const registeredAt = now.toISOString()
  const trialEndsAt = trialEnd.toISOString()
  const paymentStatus = 'Trial'
  const currentPrice = Number(process.env.SUBSCRIPTION_PRICE) || DEFAULT_PRICE

  const signature = computeLicenseSignature(machineId, trialEndsAt, paymentStatus, null)

  await runAsync(
    db,
    `INSERT OR REPLACE INTO app_user_registration 
     (id, machine_id, full_name, business_name, contact_no, registered_at, payment_status, trial_ends_at, paid_until, current_price, notes, last_recorded_local_time, license_signature, tamper_detected)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, ?, ?, 0)`,
    [
      machineId,
      data.fullName.trim(),
      data.businessName.trim(),
      data.contactNo.trim(),
      registeredAt,
      paymentStatus,
      trialEndsAt,
      currentPrice,
      nowSeconds,
      signature
    ]
  )

  // Asynchronously dispatch webhook to n8n (does not block local operation if offline)
  dispatchN8nRegister({
    machine_id: machineId,
    full_name: data.fullName.trim(),
    business_name: data.businessName.trim(),
    contact_no: data.contactNo.trim(),
    registered_at: registeredAt,
    trial_ends_at: trialEndsAt,
    payment_status: paymentStatus,
    current_subscription_price: currentPrice
  }).catch((err) => {
    console.warn('[License] Initial n8n registration dispatch failed (offline or unreachable):', err.message)
  })

  return await getLicenseStatus(db)
}

/**
 * Periodic monotonic heartbeat updater to detect system clock rollbacks.
 */
export async function updateClockHeartbeat(db: Database): Promise<void> {
  try {
    const record = await getAsync(db, 'SELECT * FROM app_user_registration WHERE id = 1')
    if (!record || record.tamper_detected === 1) return

    // 1. Verify HMAC Database Signature Integrity
    const expectedSig = computeLicenseSignature(
      record.machine_id,
      record.trial_ends_at,
      record.payment_status,
      record.paid_until
    )
    if (expectedSig !== record.license_signature) {
      console.error('[License] Heartbeat detected database tampering! Signature mismatch.')
      await runAsync(db, 'UPDATE app_user_registration SET tamper_detected = 1 WHERE id = 1')
      return
    }

    // 2. Check Monotonic Clock Rollback
    const nowSeconds = Math.floor(Date.now() / 1000)
    if (nowSeconds < record.last_recorded_local_time - 120) {
      console.error('[License] Heartbeat detected clock rollback!')
      await runAsync(db, 'UPDATE app_user_registration SET tamper_detected = 1 WHERE id = 1')
      return
    }

    await runAsync(db, 'UPDATE app_user_registration SET last_recorded_local_time = ? WHERE id = 1', [nowSeconds])
  } catch (err) {
    console.error('[License] Heartbeat error:', err)
  }
}

/**
 * Syncs the local subscription and profile status with the n8n PostgreSQL backend.
 */
export async function syncSubscriptionWithN8N(db: Database): Promise<LicenseStatus> {
  const record = await getAsync(db, 'SELECT * FROM app_user_registration WHERE id = 1')
  if (!record) {
    // App is not registered yet; no need to sync with n8n
    return await getLicenseStatus(db)
  }

  const machineId = getMachineId()
  const n8nBaseUrl = process.env.N8N_WEBHOOK_URL || DEFAULT_N8N_URL
  const endpoint = `${n8nBaseUrl.replace(/\/+$/, '')}/check-status`

  try {
    const nowSeconds = Math.floor(Date.now() / 1000)
    // Only report active clock rollback to n8n if the system clock is currently behind the monotonic baseline.
    // If the clock was corrected by the user, send false so the remote admin unlock can take effect without being overwritten.
    const isActivelyRolledBack =
      record.last_recorded_local_time && nowSeconds < record.last_recorded_local_time - 120

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        machine_id: machineId,
        local_tamper_detected: Boolean(isActivelyRolledBack)
      })
    })

    if (response.ok) {
      const rawText = await response.text()
      if (!rawText || !rawText.trim()) {
        return await getLicenseStatus(db)
      }

      const data = JSON.parse(rawText) as {
        registered?: boolean
        full_name?: string
        business_name?: string
        contact_no?: string
        payment_status?: string
        current_subscription_price?: number
        paid_until?: string | null
        trial_ends_at?: string
        tamper_flag?: boolean
        notes?: string | null
        server_time?: string
      }

      // If client registered offline initially and server doesn't have the record yet, push registration now
      if (data && data.registered === false) {
        console.log('[License] Machine not found on remote server; syncing initial registration...')
        await dispatchN8nRegister({
          machine_id: machineId,
          full_name: record.full_name,
          business_name: record.business_name,
          contact_no: record.contact_no,
          registered_at: record.registered_at,
          trial_ends_at: record.trial_ends_at,
          payment_status: record.payment_status,
          current_subscription_price: record.current_price
        })
        return await getLicenseStatus(db)
      }

      if (data && data.payment_status) {
        const rawStatus = String(data.payment_status).trim().toLowerCase()
        const newStatus: 'Trial' | 'Pending' | 'Paid' =
          rawStatus === 'paid' ? 'Paid' : rawStatus === 'pending' ? 'Pending' : 'Trial'

        // Sync profile columns from server (fallback to existing local values if omitted)
        const newFullName = data.full_name?.trim() || record.full_name
        const newBusinessName = data.business_name?.trim() || record.business_name
        const newContactNo = data.contact_no?.trim() || record.contact_no
        const newNotes = data.notes !== undefined ? data.notes : (record.notes ?? null)

        const newPrice = Number(data.current_subscription_price) || record.current_price
        const newPaidUntil = data.paid_until !== undefined ? data.paid_until : record.paid_until
        const trialEndsAt = data.trial_ends_at || record.trial_ends_at
        const newTamperDetected = data.tamper_flag ? 1 : 0

        // Reset monotonic clock baseline when server confirms no tamper (heals accidental future-clock locks)
        const nowSeconds = Math.floor(Date.now() / 1000)
        const newLastRecordedTime = newTamperDetected === 0 ? nowSeconds : record.last_recorded_local_time

        const signature = computeLicenseSignature(machineId, trialEndsAt, newStatus, newPaidUntil)

        await runAsync(
          db,
          `UPDATE app_user_registration 
           SET full_name = ?,
               business_name = ?,
               contact_no = ?,
               payment_status = ?,
               current_price = ?,
               trial_ends_at = ?,
               paid_until = ?,
               notes = ?,
               last_recorded_local_time = ?,
               license_signature = ?,
               tamper_detected = ?
           WHERE id = 1`,
          [
            newFullName,
            newBusinessName,
            newContactNo,
            newStatus,
            newPrice,
            trialEndsAt,
            newPaidUntil,
            newNotes,
            newLastRecordedTime,
            signature,
            newTamperDetected
          ]
        )

        console.log(
          `[License] Synced with server: Business="${newBusinessName}", Owner="${newFullName}", Status=${newStatus}, Price=Rs.${newPrice}`
        )
      }
    }
  } catch (err) {
    console.warn('[License] Sync with internet skipped (offline/unreachable):', (err as Error).message)
  }

  return await getLicenseStatus(db)
}

async function dispatchN8nRegister(payload: any): Promise<void> {
  const n8nBaseUrl = process.env.N8N_WEBHOOK_URL || DEFAULT_N8N_URL
  const endpoint = `${n8nBaseUrl.replace(/\/+$/, '')}/app-register`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    throw new Error(`n8n responded with status ${response.status}`)
  }
}

function formatRegistration(record: any) {
  return {
    fullName: record.full_name,
    businessName: record.business_name,
    contactNo: record.contact_no,
    registeredAt: record.registered_at,
    trialEndsAt: record.trial_ends_at,
    paidUntil: record.paid_until,
    currentPrice: Number(record.current_price) || DEFAULT_PRICE,
    notes: record.notes || null
  }
}