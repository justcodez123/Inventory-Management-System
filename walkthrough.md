# Complete System Walkthrough & Operational Guide

This document provides an end-to-end walkthrough of the **Inventory Management System (IMS)**, covering feature usage, architecture, security implementations, licensing workflows, and the exact steps to publish releases via GitHub Actions on a private repository.

---

## 📑 Table of Contents
1. [User Experience & Module Walkthrough](#1-user-experience--module-walkthrough)
   - [Consumer Dashboard & POS Billing](#consumer-dashboard--pos-billing)
   - [Quick Add Tile Customization](#quick-add-tile-customization)
   - [Vendor Khata Ledger & Passbook](#vendor-khata-ledger--passbook)
   - [Wi-Fi Digital Receipt QR System](#wi-fi-digital-receipt-qr-system)
   - [Records & Excel Synchronization](#records--excel-synchronization)
2. [Licensing & Anti-Tamper Security Architecture](#2-licensing--anti-tamper-security-architecture)
   - [Hardware-Bound Machine Fingerprint](#hardware-bound-machine-fingerprint)
   - [Monotonic Clock Guard & Rollback Detection](#monotonic-clock-guard--rollback-detection)
   - [Remote n8n & PostgreSQL Synchronization](#remote-n8n--postgresql-synchronization)
   - [Client Lockout & Activation Flow](#client-lockout--activation-flow)
3. [Zero-Setup Database & Credential Initialization](#3-zero-setup-database--credential-initialization)
4. [Step-by-Step: Making Repo Private & Publishing with GitHub Actions](#4-step-by-step-making-repo-private--publishing-with-github-actions)
   - [Step 1: Convert Repository to Private](#step-1-convert-repository-to-private)
   - [Step 2: Enable Workflow Write Permissions](#step-2-enable-workflow-write-permissions)
   - [Step 3: (Recommended) Configure Personal Access Token (`GH_TOKEN`)](#step-3-recommended-configure-personal-access-token-gh_token)
   - [Step 4: Tag & Publish the Release](#step-4-tag--publish-the-release)
   - [Step 5: Important Note on Auto-Updating from Private Repos](#step-5-important-note-on-auto-updating-from-private-repos)

---

## 1. User Experience & Module Walkthrough

### Consumer Dashboard & POS Billing
The POS billing interface is designed for high-throughput retail operations:
- **Rapid Keyboard Workflow**: Pressing `Enter` in the Rate field automatically calculates the line total (`Qty × Rate`) and inserts a clean new row, focusing directly on the next product selector.
- **Split Payment Modes**: Supports allocating an invoice total across multiple channels simultaneously:
  - **Cash**: Tracks tender amount and automatically computes change due.
  - **Card / UPI**: Dedicated fields for electronic transactions.
  - **Credit (Udhaar)**: Enforces customer contact details and notes for khata accountability.
- **Instant Actions**:
  - **Save PDF**: Directly invokes native Electron `webContents.printToPDF({ pageRanges: '1-1' })` to generate a pixel-perfect, single-page PDF invoice without opening a browser print preview.
  - **WhatsApp**: Opens WhatsApp Web / Desktop pre-populated with customer invoice details and an itemized receipt summary.

### Quick Add Tile Customization
Located on the right side of the Consumer Dashboard:
- **One-Click Product Entry**: Clicking any tile automatically populates or increments that item in the current bill.
- **Custom Product Creation**: Type a product name and price in the inline Quick Add bar and click **Add**. The product immediately appears as an active tile.
- **Tile Management (`⚙️` / Delete)**: Click the gear icon to toggle management mode. Red delete badges (`✕`) appear on tiles, allowing shopkeepers to prune obsolete items with a single click.
- **Data Persistence**: Custom tile configurations are persisted in browser `localStorage`. Clicking **Reset to Default** restores the curated catalog presets anytime.

### Vendor Khata Ledger & Passbook
The Vendors module (`/vendors`) manages wholesale procurement and credit accounts:
- **Vendor Directory**: Displays suppliers with contact info, GSTIN, and current balance status.
- **Running Ledger (Passbook)**: Shows a chronological ledger for each supplier with debit (payments made), credit (goods purchased), running balance, and status indicators (**Paid**, **Partially Paid**, **Pending**).
- **Payment Settlements**: Clicking **Record Payment** allows logging cash, cheque, or bank transfer payments directly against an outstanding balance, updating the ledger in real-time.

### Wi-Fi Digital Receipt QR System
To eliminate paper waste and enable contactless receipt sharing:
1. When a bill is finalized, the app's internal Node HTTP server (running on port `4988`) caches the PDF buffer in memory.
2. An on-screen modal displays a high-resolution QR code encoding `http://<Local-Machine-IP>:4988/invoice.pdf`.
3. Any smartphone connected to the same store Wi-Fi network can scan the QR code with their default camera to immediately download the PDF directly to their phone—completely offline without internet access.

### Records & Excel Synchronization
- **Searchable Ledger**: The Records dashboard (`/records`) lists all past transactions with date range pickers, payment mode filters, and customer search.
- **Excel Redundancy**: Every transaction is dual-written to SQLite (`inventory.db`) and mirrored to a local Excel file (`Consumer_Sales_Transactions.xlsx`) in the background.

---

## 2. Licensing & Anti-Tamper Security Architecture

### Hardware-Bound Machine Fingerprint
To prevent unauthorized cloning of the application or database across multiple computers:
- The app executes system commands (`wmic csproduct get uuid`, `wmic baseboard get serialnumber`) to extract the physical machine UUID and motherboard serial number.
- These hardware identifiers are normalized, salted, and hashed via SHA-256 to create a deterministic machine identifier:
  ```
  MC-321A52D76BEB4080
  ```
- This Machine ID is permanently bound to the local `app_user_registration` record.

### Monotonic Clock Guard & Rollback Detection
To prevent users from rolling back their system calendar to bypass subscription expiration dates:
- An internal heartbeat tracks `last_recorded_local_time` (epoch seconds) in `app_user_registration`.
- If the current system time is ever detected to be earlier than `last_recorded_local_time - 300s`, the system flags a clock tampering event:
  ```sql
  UPDATE app_user_registration SET tamper_detected = 1 WHERE id = 1
  ```
- Once `tamper_detected = 1`, the app locks immediately into the Security Lockout view.

### Remote n8n & PostgreSQL Synchronization
- **Heartbeat Dispatch**: On startup and every 30 minutes thereafter, `syncSubscriptionWithN8N` dispatches a payload to the remote VPS endpoint:
  ```json
  POST http://143.110.253.214:5678/webhook/client-heartbeat
  {
    "machine_id": "MC-321A52D76BEB4080",
    "business_name": "Store Name",
    "last_local_time": 1793092026
  }
  ```
- If an administrator extends the subscription in PostgreSQL, n8n responds with updated `paid_until` timestamps and a cryptographic HMAC `license_signature`.
- The client validates the signature, updates the local database, and unlocks seamless operation.

### Client Lockout & Activation Flow
When a trial ends, subscription lapses, or tampering is detected:
1. The dashboard is obscured by the persistent `SubscriptionLockoutModal`.
2. The modal displays:
   - Reason for lockout (Trial Expired, Renewal Due, Clock Tamper).
   - Dynamic UPI payment QR code encoding the current subscription rate.
   - One-click **Copy Machine ID** button so the merchant can text their Machine ID to the administrator.
   - Direct WhatsApp support link.
3. Once the administrator marks the license as paid on the VPS backend, clicking **Check License Status** immediately re-verifies and restores full POS access.

---

## 3. Zero-Setup Database & Credential Initialization

No manual database initialization scripts (`password.js`, `seed.js`) are required on client machines:
- **Startup Auto-Migration**: During `app.whenReady()`, `initDB()` runs and verifies that all tables and columns exist:
  - `consumer_sales_transactions` (with multi-mode payment columns)
  - `vendors` & `vendor_transactions`
  - `users`
  - `app_user_registration`
- **Default Authentication Guarantee**:
  - The application automatically verifies that the primary administrator account exists:
    ```typescript
    username: "user"
    password: "1232131972"
    ```
  - If the database is brand new, or if `.env` was omitted in a packaged build, the system automatically inserts or repairs `id: 1` with these default credentials.

---

## 4. Step-by-Step: Making Repo Private & Publishing with GitHub Actions

Before pushing git tags, follow these exact steps to ensure GitHub Actions can build and publish releases from your private repository.

### Step 1: Convert Repository to Private
1. Open your repository on GitHub: `https://github.com/justcodez123/Inventory-Management-System`.
2. Go to **Settings** (top navigation bar).
3. Scroll all the way down to the **Danger Zone**.
4. Click **Change repository visibility** -> Select **Make private** -> Confirm.

---

### Step 2: Enable Workflow Write Permissions
By default, GitHub gives Actions read-only permissions in private repositories. You must grant write access so the runner can create releases:
1. In the repository, navigate to **Settings** -> **Actions** -> **General**.
2. Scroll down to **Workflow permissions**.
3. Select **"Read and write permissions"**.
4. Check the box for: **"Allow GitHub Actions to create and approve pull requests"**.
5. Click **Save**.

---

### Step 3: (Recommended) Configure Personal Access Token (`GH_TOKEN`)
While the default `GITHUB_TOKEN` works for most builds, Electron Builder in a private repository is most reliable when using a classic Personal Access Token:
1. Go to your GitHub profile: **Settings** (top right user avatar) -> **Developer settings** -> **Personal access tokens** -> **Tokens (classic)**.
2. Click **Generate new token (classic)**.
3. Name it: `ELECTRON_BUILDER_RELEASE`.
4. Expiration: Select **No expiration** (or your preferred timeframe).
5. Select scopes:
   - `repo` (Full control of private repositories).
   - `workflow` (Update GitHub Action workflows).
6. Click **Generate token** and copy the token string (`ghp_...`).
7. In your repository (`Inventory-Management-System`):
   - Navigate to **Settings** -> **Secrets and variables** -> **Actions**.
   - Click **New repository secret**.
   - Name: `GH_TOKEN`
   - Secret: Paste your `ghp_...` token.
   - Click **Add secret**.

> **Note**: Both [.github/workflows/build.yml](file:///h:/Inventory-Management-System/.github/workflows/build.yml) and [.github/workflows/release.yml](file:///h:/Inventory-Management-System/.github/workflows/release.yml) are already configured to check `${{ secrets.GH_TOKEN || secrets.GITHUB_TOKEN }}`.

---

### Step 4: Tag & Publish the Release
Now you are ready to trigger the automated build and release!

Run the following commands in your local terminal:

```powershell
# 1. Ensure all changes are staged and committed
git add .
git commit -m "feat: complete POS billing, vendor khata, anti-tamper licensing, and release workflow"

# 2. Push all commits to the main branch
git push origin main

# 3. Create a version tag matching your app package.json (currently 1.1.4)
git tag v1.1.4

# 4. Push the tag to GitHub (this triggers release.yml)
git push origin v1.1.4
```

#### What happens next:
1. GitHub Actions detects the tag push and launches the `Publish Tagged Release (v*)` workflow on a clean `windows-latest` VM.
2. It installs dependencies, compiles TypeScript, and runs `npx electron-builder --win --publish always`.
3. Electron Builder automatically uploads:
   - `Inventory Management System-1.1.4-setup.exe`
   - `latest.yml`
   - `app-setup-1.1.4.exe.blockmap`
4. The release is published under the **Releases** tab on GitHub!

---

### Step 5: Important Note on Auto-Updating from Private Repos
> [!IMPORTANT]
> **Understanding `electron-updater` with Private Repositories:**
> - When your repository was **public**, client machines running the installed app could download updates from `github.com/.../releases/download/...` anonymously.
> - When your repository is **private**, GitHub requires authentication for release asset downloads. Anonymous client machines checking for updates will receive a `404 Not Found`.
>
> **Best Practices for Distributing Updates with Private Repos:**
> 1. **Manual Distribution (Simplest)**: Download the compiled `*-setup.exe` directly from your GitHub Releases page and send/install it on client machines.
> 2. **Public Release Companion Repo**: Create a separate public repository (e.g., `Inventory-Management-System-Releases`) used exclusively for hosting published installer binaries, while keeping your source code in this private repo.
> 3. **Generic Hosting / VPS**: In `electron-builder.yml`, configure `provider: generic` with a public URL (such as an Nginx directory on your VPS `http://143.110.253.214/updates/` or Cloudflare R2 bucket) for completely unrestricted client auto-updates.
