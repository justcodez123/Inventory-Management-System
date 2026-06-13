# Offline Inventory & Billing Management System

An offline-first desktop application built with React and Electron for seamless, localized inventory management and invoicing. Designed to operate completely without an internet connection, this tool allows businesses to generate, calculate, and locally save clean, printable PDF receipts in real-time. 

### 🚀 Current Features
*   **Offline-First Architecture**: Operates natively on your desktop without requiring an active internet connection.
*   **Dynamic Billing Dashboard**: Real-time total calculation with editable product entries, quantities, and rates.
*   **Rapid Data Entry**: Built-in "Enter-to-Tab" navigation and auto-row creation for lightning-fast keyboard-only input.
*   **Dynamic Product Selection**: Searchable, writable combobox for product selection that automatically learns and saves new products on the fly.
*   **Persistent Bill Preview**: Live side-by-side view that keeps the submitted bill visible until it's sent or a new customer is entered.
*   **WhatsApp Integration**: Share invoices and receipts instantly via WhatsApp directly from the active billing screen or historical records dashboard.
*   **Native PDF Export**: Directly generates and saves 1-page PDF invoices to the local file system using Electron IPC.
*   **Modern UI**: Built with React and Tailwind CSS for a highly responsive, clean, and intuitive user experience.
*   **Local Database & Historical Records**: Automatically logs transactions to a local SQLite database, viewable in a dedicated historical records dashboard with time-stamps and item summaries.
*   **Excel Backup**: Automatically mirrors transactions to a local Excel file (`Consumer_Sales_Transactions.xlsx`), guaranteeing data redundancy.
*   **Strict Data Validation**: Prevents empty/incomplete entries, mandates notes for credit transactions, and features intelligent duplicate-transaction detection.
*   **Automated CI/CD Pipeline**: Uses GitHub Actions to automatically compile and publish the Windows `.exe` installer on every new release.
*   **Seamless Auto-Updating**: Integrated `electron-updater` silently downloads the latest releases in the background and upgrades users without manual intervention.

### 🗺️ Roadmap & Future Scope
*   **Wholesaler Dashboard**: A dedicated administrative view to browse historical transaction records of Wholesalers.
*   **Inventory Management**: A dedicated inventory management system to manage products, stock, prices, and categories. Give the user the power to add, edit, delete, and update products in the inventory. This will allow the user to keep track of his products and also generate new receipts.
