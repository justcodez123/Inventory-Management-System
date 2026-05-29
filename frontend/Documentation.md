# Offline PDF Billing Module Documentation

This document outlines the creation and changes made to the standalone Offline PDF Billing module for the Inventory Management application. The core objective of these changes was to implement an offline-first desktop solution using Electron and React, allowing users to generate and save local PDF invoices without browser dependencies.

## 1. ConsumerDashboard.tsx
This is the main parent container (Page) for the dashboard, coordinating the state and passing it down to child components.
- **State Management**:
  - Implements `customer` state (`name`, `contactNo`, `date`) to track customer details.
  - Implements `entries` state (`EntryRow[]`) to maintain the list of products added by the user.
- **UI & Layout**: 
  - Designed using Tailwind CSS for a modern, responsive, and clean layout.
  - Divided into a Header, a Customer Details section, and a dynamic grid for the `Entries` and `Billing` modules.
  - Acts as the single source of truth for the billing data.

## 2. Entries.tsx
A dynamic, editable table component responsible for managing the items being billed.
- **Data Structure**: Uses the `EntryRow` interface (`id`, `product`, `qty`, `rate`, `amount`, `modeOfPayment`).
- **Functionality**:
  - Automatically initializes with an empty row if no data is present.
  - Handles the addition and deletion of rows via `handleAddRow` and `handleDeleteRow`.
  - **Auto-calculation**: When `qty` or `rate` is updated, the `amount` is automatically calculated in real-time.
  - Includes an array of `AVAILABLE_PRODUCTS` for a convenient dropdown selection.
- **Actions**: Contains action buttons to append new rows and submit the completed entries.

## 3. Billing.tsx
The receipt generation component that renders the final bill and handles the PDF export.
- **Data Intake**: Receives `customer` and `entries` data as props from `ConsumerDashboard.tsx`.
- **Filtering & Totals**: Automatically filters out incomplete/empty rows before rendering and calculates the final `totalAmount`.
- **Electron IPC Integration**:
  - Includes a "Save PDF" button that triggers `handlePrint()`.
  - Detects if the app is running in the native Electron environment (`window.electron`).
  - Dispatches an IPC event (`save-bill-pdf`) to the Electron main process, passing along a dynamically generated default filename (`Invoice_Name_Date.pdf`).
  - Falls back to standard `window.print()` if run inside a normal browser.

## 4. CSS Files
### Entries.css
- Provides a clean, modern aesthetic for the product entries table.
- Features smooth transitions on table rows (`transform: translateY(-2px)` on hover).
- Customizes input and select fields with focus states (indigo borders and box shadows).
- Styles action buttons with gradients, hover effects, and click animations.

### Billing.css
- Formats the receipt layout to resemble a standard printable bill (using monospace fonts, dashed borders, and strict alignments).
- **Print Optimization (`@media print`)**:
  - Hides all non-essential UI elements (like the "Save PDF" button, external headers, and other app containers).
  - Enforces `position: static !important;` on the `.billing-container` and `position: absolute !important;` on `.billing-receipt` to ensure the receipt correctly snaps to the top-left of the printed document. This avoids blank pages and alignment issues caused by inherited relative positioning from the parent dashboard during the `printToPDF` capture.

## 5. Navigation & Layout (App.tsx & Navbar.tsx)
- **App.tsx Layout**: Sets up the core layout of the app using a `flex-col` structure with `h-screen` and `overflow-hidden`. It designates a scrollable container (`flex-1 overflow-y-auto`) for the main content to ensure long pages (like the billing dashboard) can be scrolled naturally without breaking the layout or hiding the final print button.
- **Navbar.tsx**: Provides a premium, glassmorphic navigation header. Tracks the `activeTab` state to conditionally render components and scale up to multiple modules (Records, Wholesalers, etc.).

## 6. Dynamic Product Management (AddMoreModal)
- **State Persistence**: The `AVAILABLE_PRODUCTS` list was migrated from a hardcoded array to a dynamic React state managed in `ConsumerDashboard.tsx`. It uses `localStorage` to permanently save newly added products between app restarts without needing a backend database.
- **AddMoreModal**: A custom, React Portal-based modal (`createPortal`) that allows users to quickly add custom products to the inventory. Using a portal guarantees the modal renders cleanly at the root level of the application, avoiding CSS glitches and clipping from nested table rows.

