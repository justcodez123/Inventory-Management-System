import { useState } from 'react';
import ConsumerBilling from './pages/ConsumerDashboard';
import Records from './pages/Records';
import { Navbar, NavOption } from './components/Navbar';

function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<NavOption>('Billing');
  return (
    <div className='flex flex-col h-screen overflow-hidden'>
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className='flex-1 overflow-y-auto'>
        {activeTab === 'Billing' ? <ConsumerBilling /> : <Records />}
      </div>
    </div>
  ) 
}

export default App
