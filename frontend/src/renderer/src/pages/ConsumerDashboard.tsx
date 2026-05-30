import React, { useState, useEffect } from 'react';
import Entries, { EntryRow } from '../components/Entries';
import Billing from '../components/Billing';
//import { Navbar, NavOption } from '../components/Navbar';
/**
 * Interface for Customer Details state.
 */
interface CustomerDetails {
  name: string;
  contactNo: string;
  date: string;
}

const ConsumerBilling: React.FC = () => {
  // State for Customer Details
  const [customer, setCustomer] = useState<CustomerDetails>({
    name: '',
    contactNo: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [dailyTotals, setDailyTotals] = useState({ Total: 0, Cash: 0, Card: 0, UPI: 0, Credit: 0 });

  const fetchDailyTotals = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      // @ts-ignore
      if (window.electron) {
        // @ts-ignore
        const totals = await window.electron.ipcRenderer.invoke('get-daily-totals', today);
        setDailyTotals(totals);
      }
    } catch (err) {
      console.error('Failed to fetch totals', err);
    }
  };

  useEffect(() => {
    fetchDailyTotals();
  }, []);

  // State for Product Entries
  const [entries, setEntries] = useState<EntryRow[]>([]);

  const DEFAULT_PRODUCTS = ['Tshirt', 'Jeans', 'Sando', 'Trousers', 'Shirt', 'Shorts', 'Jacket'];
  
  // State for Available Products (with localStorage persistence)
  const [availableProducts, setAvailableProducts] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('availableProducts');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse availableProducts from localStorage', e);
    }
    return DEFAULT_PRODUCTS;
  });

  const handleAddProduct = (newProduct: string) => {
    if (newProduct && !availableProducts.includes(newProduct)) {
      const updated = [...availableProducts, newProduct];
      setAvailableProducts(updated);
      localStorage.setItem('availableProducts', JSON.stringify(updated));
    }
  };
  // const [activeTab, setActiveTab] = useState<NavOption>('Billing');

  // Calculate Total Revenue automatically from valid entries
  // const totalRevenue = entries.reduce(
  //   (sum, row) => sum + (Number(row.amount) || 0),
  //   0
  // );

  // Handler for input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomer((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  //   const formatToNormalDate = (dateString: string) =>{
  //     if(!dateString) return '';
  //     try {
  //       const [year, month, day] = dateString.split('-').map(Number);

  //     } catch (error) {
  //       console.error('Failed to format date:', error);
  //       return dateString;
  //     }

  //   };

  return (
    <div className="bg-gray-100 p-6 flex flex-col items-center "> 
      {/* Main Container */}
      <div className="w-full max-w-5xl bg-white rounded-xl shadow-lg flex flex-col overflow-hidden">

        {/* Header Section */}
        <header className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white">
          <div className="flex items-center space-x-2">
            {/* <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">L</span>
            </div> */}  
          </div>

          {/* <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full font-semibold text-sm border border-green-200">
            Total Revenue: <span className="ml-1">₹{totalRevenue.toFixed(2)}</span>
          </div> */}
        </header>

        {/* Content Area */}
        <main className="p-8 space-y-8">

          {/* Daily Totals Section */}
          {/* <section className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
              <span className="text-gray-500 text-sm font-medium">Total Sale</span>
              <span className="text-2xl font-bold text-indigo-600">₹{dailyTotals.Total.toFixed(2)}</span>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
              <span className="text-gray-500 text-sm font-medium">Cash</span>
              <span className="text-2xl font-bold text-green-600">₹{dailyTotals.Cash.toFixed(2)}</span>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
              <span className="text-gray-500 text-sm font-medium">Card</span>
              <span className="text-2xl font-bold text-blue-600">₹{dailyTotals.Card.toFixed(2)}</span>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
              <span className="text-gray-500 text-sm font-medium">UPI</span>
              <span className="text-2xl font-bold text-purple-600">₹{dailyTotals.UPI.toFixed(2)}</span>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
              <span className="text-gray-500 text-sm font-medium">Credit</span>
              <span className="text-2xl font-bold text-red-500">₹{dailyTotals.Credit.toFixed(2)}</span>
            </div>
          </section> */}

          {/* Customer Details Section */}
          <section className="p-6 border border-gray-200 rounded-xl bg-gray-50/50">
            <h2 className="text-lg font-semibold text-gray-700 mb-6 flex items-center">
              <span className="w-2 h-6 bg-indigo-500 rounded-full mr-3"></span>
              Customer Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Customer Name */}
              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-600">
                  Customer Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={customer.name}
                  onChange={handleInputChange}
                  placeholder="Enter name"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                />
              </div>

              {/* Contact No */}
              <div className="space-y-2">
                <label htmlFor="contactNo" className="block text-sm font-medium text-gray-600">
                  Contact Number
                </label>
                <input
                  type="text"
                  id="contactNo"
                  name="contactNo"
                  value={customer.contactNo}
                  onChange={handleInputChange}
                  placeholder="Enter contact number"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                />
              </div>

              {/* Date */}
              <div className="space-y-2">
                <label htmlFor="date" className="block text-sm font-medium text-gray-600">
                  Date
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={customer.date}
                  onChange={handleInputChange}
                  placeholder='MM/DD/YYYY'
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                />
              </div>
            </div>
          </section>

          {/* Placeholders for Future Modules */}
          <div className="grid grid-cols-1 gap-8">
            {/* Product Table Module */}
            <Entries 
              rows={entries} 
              setRows={setEntries} 
              availableProducts={availableProducts}
              onAddProduct={handleAddProduct}
            />

            <Billing customer={customer} entries={entries} onTransactionSubmit={fetchDailyTotals} />
          </div>

        </main>

        {/* Footer info */}
        <footer className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">© 2026 Clothing Inventory Management - Offline Edition</p>
        </footer>
      </div>
    </div>
  );
};

export default ConsumerBilling;
