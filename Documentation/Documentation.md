# Offline PDF Billing Module Documentation

This document outlines the creation and changes made to the standalone Offline PDF Billing module for the Inventory Management application. The core objective of these changes was to implement an offline-first desktop solution using Electron and React, allowing users to generate and save local PDF invoices without browser dependencies.

## 1. ConsumerDashboard.tsx
This is the main parent container (Page) for the dashboard, coordinating the state and passing it down to child components.
- **State Management**:
  - Implements `customer` state (`name`, `contactNo`, `date`) to track customer details.
  - Implements `entries` state (`EntryRow[]`) to maintain the list of products added by the user.
- **UI & Layout**: 
  - Designed using Tailwind CSS with a wide layout (`max-w-7xl`) for an expansive data view.
  - Divided into a Header, Customer Details section, and a dynamic grid for `Entries` and `Billing`.
  - Acts as the single source of truth for billing data and handles the final transaction submission.
- **Validation & Security**:
  - Implements strict validation on submission to prevent completely empty rows or missing mandatory fields (Product, Qty, Rate, Size).
  - Enforces mandatory notes for 'On Credit' payment modes.
  - Calls IPC methods to check for duplicate transactions before allowing the user to submit (preventing accidental double-clicks or duplicate entries).

## 2. Entries.tsx
A dynamic, editable table component responsible for managing the items being billed.
- **Data Structure**: Uses the `EntryRow` interface (`id`, `product`, `qty`, `rate`, `amount`, `modeOfPayment`, `note`).
- **Functionality**:
  - Automatically initializes with an empty row if no data is present.
  - Handles the addition and deletion of rows via `handleAddRow` and `handleDeleteRow`.
  - **Auto-calculation**: When `qty` or `rate` is updated, the `amount` is automatically calculated in real-time.
  - **Notes & Payment Modes**: Users can select individual payment modes for each entry (e.g., Cash, Card, UPI, On Credit) and assign specific notes using a popup `NoteModal` directly from the row.
- **Actions**: Contains action buttons to append new rows and edit notes.

## 3. Billing.tsx
The receipt generation component that renders the final bill and handles the PDF export.
- **Data Intake**: Receives `customer`, `entries`, and calculated totals as props from `ConsumerDashboard.tsx`.
- **Filtering & UI**: Automatically filters out incomplete/empty rows before rendering the final PDF bill view. (Note: The actual "Submit" logic was moved to ConsumerDashboard to centralize validation).
- **Data Aggregation**: Aggregates payment amounts by mode (Cash, Card, UPI, Credit) and compiles all entry notes to send to the backend.
- **Electron IPC Integration**:
  - Exists mostly as a visual component for the `window.print()` / PDF generation flow.

## 4. Records.tsx
A dashboard for viewing historical transaction records with filtering capabilities.
- **Functionality**:
  - Fetches records from the SQLite database using IPC (`get-filtered-records`).
  - Allows filtering by start date, end date, customer name, and contact number.
  - Includes a KPI summary section displaying total sales and breakdowns by payment mode (Cash, Card, UPI, Credit).
  - Features a toggle button to visually hide/show the KPI section.
- **UI & Layout**: Displays records in a wide (`max-w-7xl`) table layout. Columns now include a localized `Time` column (derived from `created_at`) and an `Items (Qty & Size)` summary column which condenses the entire purchase list into a single, readable string.

## 5. CSS Files
### Entries.css & Billing.css
- Provides a clean, modern aesthetic for the product entries table and receipt layout.
- Ensures proper print optimization by hiding non-essential UI elements during PDF generation.

## 6. Modals
- **AddMoreModal**: Allows users to quickly add custom products to the inventory, saving to `localStorage`.
- **NoteModal**: A portal-based modal that lets users enter specific details or due dates for individual products. Originally intended for "On Credit" entries, it was generalized to support notes for any item in the table.

## 7. Backend (main/index.ts)
- **SQLite Database**: Manages the `consumer_sales_transactions` table. Upgraded to store specific payment mode amounts, an `items_summary` string (e.g. "2x Shirt (Size: L)"), and a `created_at` timestamp.
- **Duplicate Detection**: Includes a new `check-duplicate-transaction` IPC handler that queries the database for exact matches (ignoring contact info) to warn users of duplicates.
- **Excel Backup**: Automatically maintains a localized backup of all transactions in `Documents/Consumer_Sales_Transactions.xlsx` using the `xlsx` library. Ensures the correct generation of headers for new files and appends data seamlessly.
