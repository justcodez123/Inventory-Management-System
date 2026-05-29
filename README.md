# Offline Inventory & Billing Management System

An offline-first desktop application built with React and Electron for seamless, localized inventory management and invoicing. Designed to operate completely without an internet connection, this tool allows businesses to generate, calculate, and locally save clean, printable PDF receipts in real-time. 

### 🚀 Current Features
*   **Offline-First Architecture**: Operates natively on your desktop without requiring an active internet connection.
*   **Dynamic Billing Dashboard**: Real-time total calculation with editable product entries, quantities, and rates.
*   **Native PDF Export**: Directly generates and saves 1-page PDF invoices to the local file system using Electron IPC.
*   **Modern UI**: Built with React and Tailwind CSS for a highly responsive, clean, and intuitive user experience.
*   **Automated CI/CD Pipeline**: Uses GitHub Actions to automatically compile and publish the Windows `.exe` installer on every new release.
*   **Seamless Auto-Updating**: Integrated `electron-updater` silently downloads the latest releases in the background and upgrades users without manual intervention.

### 🗺️ Roadmap & Future Scope
*   **Retailer Dashboard**: A dedicated administrative view to browse historical transaction records.
*   **Database Integration**: Persistent local storage of all generated invoices and customer data.
*   **Advanced Search & Filtering**: Easily search past entries by Customer Name, Mode of Payment, Date, and more.
