# Inventory Management System (IMS)

[![Electron](https://img.shields.io/badge/Electron-44.8.0-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19.2.1-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![SQLite3](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Vite](https://img.shields.io/badge/Vite-7.0.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Platform](https://img.shields.io/badge/Platform-Windows-0078D6?logo=windows&logoColor=white)](https://github.com/justcodez123/Inventory-Management-System)

An offline-first, high-performance retail Point of Sale (POS), Wholesale Khata Ledger, and Licensing Management desktop application. Built with **Electron**, **React 19**, and **SQLite3**, featuring hardware-bound anti-tamper subscription licensing, local Wi-Fi digital receipts, and real-time n8n webhook synchronization.

---

## 🌟 Key Features

### 🛒 1. Consumer Billing & Rapid POS
- **Lightning-Fast Keyboard Entry**: "Enter-to-Tab" rapid row creation, auto-calculation of quantity × rate, and instantaneous total computation.
- **Dynamic Quick Add Panel**: One-click product insertion with persistent custom tile management (add new products, remove existing tiles, and reset to defaults stored in `localStorage`).
- **Multi-Split Payment Modes**: Seamlessly allocate invoice totals across **Cash**, **Card**, **UPI**, and **Credit** with automatic validation and change computation.
- **WhatsApp Direct Invoicing**: Dispatch pre-formatted digital receipts and invoices directly to customers' WhatsApp numbers.
- **Native Single-Page PDF Generation**: Bypasses browser print dialogs using Electron's native `printToPDF` API with strict 1-page constraints.

### 📖 2. Wholesaler & Vendor Khata Ledger
- **Vendor Directory**: Manage suppliers with contact details, GST numbers, and payment terms.
- **Running Ledger**: Complete double-entry passbook logging every transaction, return, and payment settlement.
- **Real-Time Balance & Settlement**: Dynamic outstanding balance calculation with instant payment settlement modals and status tracking (**Pending**, **Partially Paid**, **Paid**).
- **Search & Filter**: Instant filtering by vendor name, date range, payment status, or transaction reference.

### 📱 3. Instant Wi-Fi Digital Receipt QR
- **Contactless Mobile Downloads**: Displays an on-screen QR code on bill generation pointing to an embedded, lightweight local HTTP server (`http://<local-ip>:4988/invoice.pdf`).
- Customers can scan the QR code with any mobile device connected to the store's local Wi-Fi to immediately download their PDF invoice—without needing internet access.

### 🛡️ 4. Anti-Tamper Licensing & Subscription Lockout
- **Machine-Bound Fingerprinting**: Computes a SHA-256 hardware identifier (`MC-<HASH>`) derived from CPU UUID and motherboard serial numbers.
- **Cryptographic Signatures**: License state is validated offline using HMAC signatures against a hardened secret key.
- **Anti-Clock Tampering**: An internal monotonic timestamp heartbeat runs continuously to detect and flag local system clock rollbacks (`tamper_detected = 1`).
- **Hybrid Cloud Synchronization**: Periodically syncs subscription state with an automated **n8n workflow + PostgreSQL** backend via webhook (`/webhook/client-heartbeat`), updating paid periods and remote lockouts.
- **Grace Period & Hard Lockout**: Provides an interactive lockout overlay with a UPI payment QR, WhatsApp administrator contact, and machine ID copy tool when the trial or paid subscription expires.

### 🎨 5. Luxury Typography & Theming
- **Bespoke Aesthetics**: Curated typography featuring variable **Playfair Display** paired with clean **Inter** UI fonts.
- **Dark & Light Mode**: Fluid CSS custom property theming supporting sleek dark charcoal and warm parchment light modes with smooth transitions.

### 💾 6. Zero-Setup Database & Automated Migrations
- **Embedded SQLite Engine**: Stored locally in user app data (`%APPDATA%/inventory-management-system/inventory.db`).
- **Automatic Schema Migration**: Verifies columns and tables on startup (`consumer_sales_transactions`, `vendors`, `vendor_transactions`, `users`, `app_user_registration`).
- **Embedded Default Credentials**: Automatically ensures the default administrative login (`username: user`, `password: 1232131972`) is seeded and repaired without manual scripts.
- **Excel Mirror Backup**: Automatically exports and synchronizes sales records to `Consumer_Sales_Transactions.xlsx`.

---

## 🏗️ System Architecture

```mermaid
graph TD
    subgraph Client Application (Electron + React)
        UI[React 19 Dashboard UI]
        Themes[Theme & Auth Context]
        SubCtx[Subscription Context]
        QuickAdd[Quick Add Tile Manager]
        
        subgraph Electron Main Process
            IPC[IPC Event Handlers]
            DB[(SQLite3 inventory.db)]
            HTTP[Embedded PDF HTTP Server :4988]
            LicEngine[License & Clock Guard Engine]
            Updater[electron-updater]
        end
    end

    subgraph Remote Infrastructure
        n8n[n8n Automation Engine :5678]
        PG[(PostgreSQL Database)]
        GH[GitHub Releases]
    end

    UI -->|IPC Calls| IPC
    SubCtx -->|Verify License| LicEngine
    LicEngine -->|Read/Write State| DB
    LicEngine -->|Periodic Sync| n8n
    n8n -->|Query/Update Status| PG
    HTTP -->|Stream Invoice| Mobile[Customer Phone via Wi-Fi]
    Updater -->|Poll Updates| GH
```

---

## 💻 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Desktop Shell** | [Electron 44](https://www.electronjs.org/), [Electron-Vite 5](https://electron-vite.org/), [Electron-Builder 26](https://www.electron.build/) |
| **Frontend** | [React 19](https://react.dev/), [TypeScript 5.9](https://www.typescriptlang.org/), [Tailwind CSS 4](https://tailwindcss.com/) |
| **Local Storage** | [SQLite3 (Native Addon)](https://github.com/TryGhost/node-sqlite3), `localStorage` |
| **Networking & APIs** | Node HTTP Server, Node `crypto`, `xlsx`, `jspdf`, `html2canvas`, `qrcode` |
| **Backend & Cloud** | [n8n Workflow Engine](https://n8n.io/), [PostgreSQL](https://www.postgresql.org/) |
| **CI / CD** | GitHub Actions (`windows-latest`), Multi-stage compilation & automatic release publishing |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v22.x or v24.x LTS
- **npm**: v10.x+
- **Visual Studio C++ Build Tools** (required for compiling native `sqlite3` on Windows)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/justcodez123/Inventory-Management-System.git
   cd Inventory-Management-System/app
   ```

2. **Install dependencies:**
   ```bash
   npm ci
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```

---

## ⚙️ Configuration & Environment

Configuration is managed via `app/.env` (and defaults hardcoded for offline production resilience):

```env
# Default Local Port for PDF Wi-Fi Downloads
PORT=4988

# Cloud Automation / Webhook Sync (VPS n8n Endpoint)
N8N_BASE_URL=http://143.110.253.214:5678/webhook

# Default Administrative Credentials (Seeded into SQLite on first launch)
USER1_NAME=user
USER1_PASSWORD=1232131972
```

> **Note**: Electron-Builder excludes `.env` from packaged client installers to prevent credential leakage. Safe fallbacks are built into [licenseService.ts](file:///h:/Inventory-Management-System/app/src/main/licenseService.ts) and [index.ts](file:///h:/Inventory-Management-System/app/src/main/index.ts).

---

## 📦 Building & Packaging

To compile and package the desktop application locally:

```bash
cd app

# Typecheck and compile TypeScript
npm run build

# Package unpacked directory for quick inspection
npm run build:unpack

# Create standard Windows NSIS installer (.exe)
npm run build:win
```

Output artifacts are generated in `app/dist/`:
- `Inventory Management System-1.1.4-setup.exe` (Installer)
- `latest.yml` (Auto-update metadata)

---

## 🤖 CI/CD & Automated Releases

The repository contains two GitHub Actions workflows:

1. **`.github/workflows/build.yml`**:
   - Triggers on every push to `main` or pull request.
   - Compiles TypeScript, runs tests, packages the Windows application, and stores build artifacts.

2. **`.github/workflows/release.yml`**:
   - Triggers whenever a version tag matching `v*` is pushed (e.g., `git push origin v1.1.4`).
   - Automatically builds the production installer and publishes a draft/public GitHub Release.

---

## 📄 License

This software is proprietary and confidential. Licensed under the ISC License. All rights reserved.
