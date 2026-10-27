# Subscription, Remote Control & Offline Anti-Tamper Architecture

---

## 1. Complete Architecture Diagram

### System Topography & Component Topology

```mermaid
flowchart TB
    subgraph ClientPC ["Client Machine (Desktop App)"]
        subgraph UI ["React 19 Renderer (Frontend)"]
            AppContent["App.tsx\n(Modal & Navigation Guard)"]
            SubCtx["SubscriptionContext.tsx\n(20s Live Polling Engine)"]
            RegModal["UserRegistrationModal.tsx\n(First-Launch Gate)"]
            LockModal["SubscriptionLockoutModal.tsx\n(Fullscreen Lockout + UPI QR)"]
            Navbar["Navbar.tsx\n(Navigation & Theme Toggle)"]
        end

        subgraph IPC ["Electron IPC Bridge"]
            Bridge["contextBridge / ipcRenderer.invoke\n('sync-subscription-status')\n('get-license-status')\n('register-app-user')"]
        end

        subgraph Main ["Electron Main Process (Node.js)"]
            IndexTs["main/index.ts\n(IPC Handlers + Transaction Guard)"]
            LicService["main/licenseService.ts\n- Hardware Fingerprint (getMachineId)\n- HMAC-SHA256 Cryptographic Seal\n- Monotonic Clock Rollback Guard\n- HTTP Sync Dispatcher (fetch)"]
        end

        subgraph LocalStorage ["Local PC Storage"]
            SQLiteDB[("SQLite: inventory.db\nTable: app_user_registration\n- machine_id, payment_status\n- trial_ends_at, paid_until\n- license_signature (HMAC)\n- last_recorded_local_time\n- tamper_detected (0 or 1)")]
            MachineFile[("UserData: .machine_id\n(Persistent Hardware Token)")]
        end
    end

    subgraph VPS ["Cloud VPS (143.110.253.214)"]
        subgraph DockerNet ["Docker Container Network (172.18.0.0/16)"]
            N8N["n8n Automation Engine\nWorkflow: inventory-subscription-workflow\n- POST /webhook/app-register\n- POST /webhook/check-status"]
        end

        subgraph HostDB ["Bare-Metal PostgreSQL Host (172.18.0.1:5432)"]
            Postgres[("PostgreSQL Database: 'sub'\nTable: public.client_subscriptions\n- id, machine_id (UNIQUE)\n- full_name, business_name\n- payment_status ('Trial'/'Pending'/'Paid')\n- paid_until, current_subscription_price\n- tamper_flag, updated_at")]
            AdminCLI["Admin Terminal (psql)\n'The Superpower Interface'"]
        end
    end

    %% Wiring
    SubCtx -->|Invokes IPC| Bridge
    RegModal -->|Submits Details| Bridge
    LockModal -->|Manual Sync Trigger| Bridge
    Bridge --> IndexTs
    IndexTs --> LicService
    LicService <--> SQLiteDB
    LicService <--> MachineFile

    %% Network Sync
    LicService -->|HTTP POST JSON (Every 20s / Startup)| N8N
    N8N -->|SQL Query / Upsert| Postgres
    AdminCLI -->|Direct SQL Updates| Postgres

    AppContent -->|If !isRegistered| RegModal
    AppContent -->|If isLocked| LockModal
    AppContent -->|Header Badge| Navbar
```

---

## 2. Complete Data Flow

### Flow A: First Launch & App Registration Flow
1. **App Boots**: `licenseService.ts` calls `getMachineId()`.
   - Reads `app.getPath('userData')/.machine_id`.
   - If missing, calculates SHA-256 hash of `[hostname, platform, arch, cpu_model, homedir]`, prefixes with `MC-` (e.g. `MC-321A52D76BEB4080`), and saves it to `.machine_id`.
2. **Registration Check**: `getLicenseStatus()` queries SQLite `app_user_registration`.
   - Table is empty -> Returns `{ isRegistered: false, isLocked: true, lockReason: 'NOT_REGISTERED' }`.
3. **Modal Barrier**: `App.tsx` halts all navigation and renders `<UserRegistrationModal />`.
4. **User Submits Details**: Form captures `fullName`, `businessName`, `contactNo`.
5. **Local Cryptographic Storage**:
   - `trial_ends_at` is calculated as `NOW() + 30 Days`.
   - An HMAC-SHA256 signature is calculated: `computeLicenseSignature(machineId, trialEndsAt, 'Trial', null)`.
   - Record is inserted into SQLite `app_user_registration` with `tamper_detected = 0`.
6. **Remote Server Registration**:
   - Main process sends HTTP POST payload to `http://143.110.253.214:5678/webhook/app-register`.
   - n8n executes:
     ```sql
     INSERT INTO client_subscriptions (machine_id, full_name, business_name, contact_no, payment_status, trial_ends_at)
     VALUES ($1, $2, $3, $4, 'Trial', NOW() + INTERVAL '30 days')
     ON CONFLICT (machine_id) DO UPDATE SET full_name = EXCLUDED.full_name, contact_no = EXCLUDED.contact_no;
     ```
7. **Access Granted**: Local state sets `isRegistered: true, isLocked: false`, and user enters the dashboard.

---

### Flow B: Live Subscription Polling & Remote Control (Every 20 Seconds)
1. **Periodic Trigger**:
   - `SubscriptionContext.tsx` runs an active `setInterval` every **20 seconds**.
   - Invokes IPC channel `sync-subscription-status`.
2. **Remote Inquiry**:
   - `syncSubscriptionWithN8N()` sends `{ machine_id: 'MC-321A52D76BEB4080' }` to n8n endpoint `/webhook/check-status`.
3. **VPS Execution**:
   - n8n queries bare-metal PostgreSQL:
     ```sql
     SELECT machine_id, payment_status, current_subscription_price, trial_ends_at, paid_until, tamper_flag
     FROM client_subscriptions 
     WHERE machine_id = $1 LIMIT 1;
     ```
   - n8n responds with structured JSON:
     ```json
     {
       "registered": true,
       "payment_status": "Pending",
       "current_subscription_price": 1000,
       "trial_ends_at": "2026-11-23T18:30:00.000Z",
       "paid_until": null,
       "tamper_flag": false
     }
     ```
4. **Client-Side Ingestion & Normalization**:
   - `licenseService.ts` normalizes incoming `payment_status` case-insensitively (`'paid'` -> `'Paid'`, `'pending'` -> `'Pending'`, `'trial'` -> `'Trial'`).
   - Generates a fresh HMAC-SHA256 cryptographic signature using the secret salt.
   - Updates local SQLite `app_user_registration`.
5. **State Propagation**:
   - IPC returns updated `LicenseStatus` to React context.
   - If `payment_status === 'Pending'`, `isLocked` evaluates to `true`.
   - `<SubscriptionLockoutModal />` mounts immediately, blocking the entire app.

---

### Flow C: Anti-Tamper & Clock Rollback Guard
1. **Clock Heartbeat**:
   - Every 60 seconds, `updateClockHeartbeat(db)` runs in the background.
   - Gets current epoch time: `nowSeconds = Math.floor(Date.now() / 1000)`.
   - If `nowSeconds < record.last_recorded_local_time - 120` (user turned back PC clock by > 2 minutes to cheat trial expiry):
     - Sets `tamper_detected = 1` in SQLite.
     - App immediately hard-locks with `lockReason = 'CLOCK_TAMPERED'`.
   - Otherwise, updates `last_recorded_local_time = nowSeconds` monotonically.
2. **Database File Tampering**:
   - If a malicious user opens `inventory.db` using DB Browser for SQLite and alters `trial_ends_at` or `payment_status`:
   - On the very next check, `computeLicenseSignature()` generates a different hash than `record.license_signature`.
   - Signature mismatch triggers `tamper_detected = 1` and locks the app immediately.

---

## 3. How It Works in Layman's Terms

### The "Bank Vault & Security Badge" Analogy

Think of the application as a **High-Security Bank Branch**:
* **The Remote Database (PostgreSQL on your VPS)** is the **Central Police & Headquarters**.
* **The Local Database (SQLite on the client's PC)** is the employee's **Physical Plastic ID Badge**.
* **The Electron App** is the **Security Turnstile Gate**.

#### 1. How the Remote Database Syncs with Local SQLite
* Every 20 seconds, the security turnstile (the app) radios Headquarters:
  > *"Hey Headquarters, employee badge `MC-321A52D76BEB4080` wants to work. What is their status?"*
* Headquarters looks up the master ledger in PostgreSQL and radios back:
  > *"They are marked as **Pending**! Lock them out until they pay."*
* The security turnstile immediately updates the employee's local ID badge (SQLite), stamps it with an official tamper-proof wax seal (HMAC signature), and slams the security gate shut (`<SubscriptionLockoutModal />`).
* When you open your server terminal and type `payment_status = 'Paid'`, the very next time the turnstile radios Headquarters (within 20 seconds), Headquarters says:
  > *"Payment received! Valid for 30 days."*
* The turnstile opens the gate immediately and displays the green **`✓ Pro Active`** badge.

#### 2. Why Prioritizing the Remote Server Never Causes Conflicts
* **The Golden Rule of Authority (Server is Boss)**:
  - The local SQLite database is **read-mostly / cache-only** for subscription data. The client PC is never allowed to dictate its own payment terms.
  - Whatever is written in the Remote PostgreSQL database is treated as the **Single Source of Truth**.
* **What happens if the client has NO internet connection?**
  - The app doesn't crash or lock the user out if their Wi-Fi drops for a few hours.
  - It gracefully reads its local cached badge from SQLite. If the 30-day trial is still valid and hasn't been tampered with, the store owner can continue billing customers offline without interruption.
* **What happens when the internet reconnects?**
  - The client immediately reconciles with the VPS. If the admin remotely disabled the store or marked them as pending while they were offline, the app locks the moment an internet connection is established.
* **Why there are no merge conflicts or duplicate overwrites**:
  - Billing data (invoices, customers, products) stays 100% on the local PC SQLite.
  - Only subscription metadata (`payment_status`, `paid_until`, `price`) flows down from the VPS. Because data flows in a single direction (Server -> Client Cache), merge conflicts are mathematically impossible.

---

## 4. Sacred Files & Subsections (DO NOT HINDER)

The following files contain the core security, cryptography, IPC messaging, and licensing logic. **Do not modify or delete these files or functions** unless you are deliberately refactoring the licensing infrastructure.

| File Path | Sacred Subsections / Functions | Why It Must Not Be Hindered |
| :--- | :--- | :--- |
| **`app/src/main/licenseService.ts`** | `getMachineId()` | Generates and persists the unique hardware signature. Changing this will alter machine IDs and cause existing registered users to become "unrecognized". |
| | `computeLicenseSignature()` | Computes HMAC-SHA256 checksums using `LICENSE_SECRET`. Changing salt or payload ordering invalidates all existing client installations. |
| | `getLicenseStatus()` | Core status evaluator: checks tamper flags, clock rollback, trial expiry, paid periods, and sets `isLocked`. |
| | `syncSubscriptionWithN8N()` | HTTP client that communicates with n8n `/check-status`, normalizes status (`toLowerCase()`), updates SQLite, and reseals HMAC. |
| | `updateClockHeartbeat()` | Monotonic clock ticker. Ensures clients cannot cheat 30-day trials by turning back system clocks. |
| **`app/src/main/index.ts`** | IPC Handlers:<br>• `sync-subscription-status`<br>• `get-license-status`<br>• `register-app-user`<br>• `get-machine-id` | Electron main process endpoints that bridge the UI with the licensing engine. Deleting any handler causes immediate runtime IPC exceptions. |
| | `submit-transaction` IPC Guard | Checks `getLicenseStatus(db)` before saving bills. If locked, rejects transaction at the database level to prevent rogue billing. |
| | Heartbeat & Sync Timers (lines 755-765) | Runs the 60-second anti-rollback heartbeat and 5-minute background sync daemons. |
| **`app/src/renderer/src/context/SubscriptionContext.tsx`** | `SubscriptionProvider`<br>`useEffect` polling loop (lines 85-98) | Drives the 20-second active background poll. If removed, the desktop app will never receive remote updates from PostgreSQL until restarted. |
| | `syncWithServer()` | Bridge method calling `sync-subscription-status` and updating React state. |
| **`app/src/renderer/src/App.tsx`** | Lines 48-52 (Modal Guards):<br>`!license?.isRegistered && <UserRegistrationModal />`<br>`license?.isLocked && <SubscriptionLockoutModal />` | Visual enforcement layer. These two lines prevent unauthorized users from interacting with billing or vendor screens when locked. |
| **`app/src/renderer/src/components/SubscriptionLockoutModal.tsx`** | Entire Component | The full-screen blocking modal that generates the UPI payment QR code (`upi://pay?pa=...`) and polls every 10s for admin confirmation. |
| **`n8n/inventory-subscription-workflow.json`** | Webhooks `/app-register` & `/check-status`<br>Postgres Nodes & Code Formatter | The cloud webhook logic running on the VPS. Handles SQL queries against `public.client_subscriptions`. |
| **VPS Configuration** | `/etc/postgresql/16/main/pg_hba.conf`<br>`/etc/postgresql/16/main/postgresql.conf` | Network permissions allowing Docker subnet `172.18.0.0/16` (`host all all 172.16.0.0/12 scram-sha-256`) and `listen_addresses = '*'`. |

---

## 5. Quick-Reference Admin Cheat Sheet (PostgreSQL on VPS)

Connect to your VPS database at any time:
```bash
sudo -u postgres psql -d sub
```

### View all registered stores and their status:
```sql
SELECT id, machine_id, business_name, payment_status, paid_until, trial_ends_at, tamper_flag FROM client_subscriptions;
```

### Lock out a client immediately:
```sql
UPDATE client_subscriptions SET payment_status = 'Pending' WHERE machine_id = 'MC-321A52D76BEB4080';
```

### Unlock a client for 30 days after receiving payment:
```sql
UPDATE client_subscriptions 
SET payment_status = 'Paid', paid_until = NOW() + INTERVAL '30 days', tamper_flag = FALSE 
WHERE machine_id = 'MC-321A52D76BEB4080';
```

### Reset a client back to Free Trial:
```sql
UPDATE client_subscriptions 
SET payment_status = 'Trial', trial_ends_at = NOW() + INTERVAL '30 days', tamper_flag = FALSE 
WHERE machine_id = 'MC-321A52D76BEB4080';
```
