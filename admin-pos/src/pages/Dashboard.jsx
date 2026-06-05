import React, { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { auth, db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard, Package, ShoppingCart, Calculator, Lock, ShoppingBag } from 'lucide-react';
import Products from './Products';
import Orders from './Orders';
import PosTerminal from './PosTerminal';
import Loans from './Loans';
import Reports from './Reports';

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pos');
  const [dailyRevenue, setDailyRevenue] = useState(0);
  
  const [isProfitVisible, setIsProfitVisible] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const adminPin = '1234';

  const handleToggleLock = () => {
    if (isProfitVisible) {
      setIsProfitVisible(false);
    } else {
      setIsPinModalOpen(true);
      setPinInput('');
      setPinError('');
    }
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput === adminPin) {
      setIsProfitVisible(true);
      setIsPinModalOpen(false);
    } else {
      setPinError('Invalid PIN');
      setPinInput('');
    }
  };

  useEffect(() => {
    const salesRef = ref(db, 'sales');
    const unsubscribe = onValue(salesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const todayStr = new Date().toISOString().split('T')[0];
        const todaySales = Object.values(data).filter(sale => {
          const saleDate = new Date(sale.created_at).toISOString().split('T')[0];
          return saleDate === todayStr;
        });
        const revenue = todaySales.reduce((sum, sale) => sum + sale.total, 0);
        setDailyRevenue(revenue);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'products':
        return <Products isProfitVisible={isProfitVisible} />;
      case 'orders':
        return <Orders />;
      case 'loans':
        return <Loans isProfitVisible={isProfitVisible} />;
      case 'reports':
        return <Reports isProfitVisible={isProfitVisible} />;
      case 'pos':
      default:
        return <PosTerminal isProfitVisible={isProfitVisible} />;
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-brand-dark flex flex-col font-sans">
      
      {/* Top Navbar */}
      <div className="bg-brand-dark border-b border-white/5 flex flex-col md:flex-row md:h-20 items-center justify-between px-4 md:px-6 shrink-0 py-3 md:py-0 gap-4 md:gap-0">
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 w-full md:w-auto">
          <div className="flex items-center justify-between w-full md:w-auto">
            <h2 className="text-xl md:text-2xl font-black text-white tracking-wide flex items-center gap-2">
              <ShoppingBag size={24} className="text-white" />
              Shop<span className="text-brand-purple">LK</span>
            </h2>
            <button 
              onClick={handleToggleLock}
              className={`md:hidden flex items-center gap-1 ${isProfitVisible ? 'bg-red-500/20 text-red-500 border-red-500/50' : 'bg-brand-card text-gray-300 border-white/5'} border px-3 py-1.5 rounded-lg font-bold`}
            >
              <Lock size={14} className={isProfitVisible ? 'text-red-500' : 'text-brand-purple'} />
            </button>
          </div>
          
          <nav className="flex items-center gap-2 overflow-x-auto w-full pb-2 md:pb-0 custom-scrollbar hide-scrollbar-mobile">
            <button 
              onClick={() => setActiveTab('pos')}
              className={`whitespace-nowrap px-4 md:px-6 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all ${activeTab === 'pos' ? 'bg-brand-purple text-white shadow-[0_0_15px_rgba(124,58,237,0.3)]' : 'bg-transparent text-gray-400 hover:text-white'}`}
            >
              POS
            </button>
            <button 
              onClick={() => setActiveTab('products')}
              className={`whitespace-nowrap px-4 md:px-6 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all ${activeTab === 'products' ? 'bg-brand-purple text-white shadow-[0_0_15px_rgba(124,58,237,0.3)]' : 'bg-transparent text-gray-400 hover:text-white'}`}
            >
              STOCK
            </button>
            <button 
              onClick={() => setActiveTab('loans')}
              className={`whitespace-nowrap px-4 md:px-6 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all ${activeTab === 'loans' ? 'bg-brand-purple text-white shadow-[0_0_15px_rgba(124,58,237,0.3)]' : 'bg-transparent text-gray-400 hover:text-white'}`}
            >
              LOANS
            </button>
            <button 
              onClick={() => setActiveTab('reports')}
              className={`whitespace-nowrap px-4 md:px-6 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all ${activeTab === 'reports' ? 'bg-brand-purple text-white shadow-[0_0_15px_rgba(124,58,237,0.3)]' : 'bg-transparent text-gray-400 hover:text-white'}`}
            >
              REPORTS
            </button>
            <button 
              onClick={() => setActiveTab('orders')}
              className={`whitespace-nowrap px-4 md:px-6 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all ${activeTab === 'orders' ? 'bg-brand-purple text-white shadow-[0_0_15px_rgba(124,58,237,0.3)]' : 'bg-transparent text-gray-400 hover:text-white'}`}
            >
              ORDERS
            </button>
          </nav>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <div className="flex gap-3">
            <div className="bg-brand-card/50 border border-white/5 px-4 py-2.5 rounded-xl flex flex-col items-center justify-center">
              <span className="text-[10px] text-gray-400 font-bold">DAILY REVENUE</span>
              <span className="text-sm font-bold text-white">
                {isProfitVisible ? `Rs. ${dailyRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Rs. 0.00'}
              </span>
            </div>
          </div>
          <button 
            onClick={handleToggleLock}
            className={`flex items-center gap-2 ${isProfitVisible ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-brand-purple hover:bg-brand-purple-hover text-white'} px-5 py-2.5 rounded-xl font-bold transition-colors shadow-[0_0_15px_rgba(124,58,237,0.3)]`}
          >
            <Lock size={16} className="text-white" />
            <span>{isProfitVisible ? 'LOCK PROFIT' : 'UNLOCK PROFIT'}</span>
          </button>
          <button onClick={handleLogout} className="text-gray-500 hover:text-white transition-colors" title="Logout">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col relative z-10 bg-brand-dark">
        {renderContent()}
      </div>

      {/* PIN Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#151515] border border-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="text-center mb-6">
              <div className="inline-block bg-[#0a0a0a] p-4 rounded-full border border-gray-800 mb-4">
                <Lock size={32} className="text-brand-green" />
              </div>
              <h3 className="text-xl font-black text-white">Admin Lock</h3>
              <p className="text-sm text-gray-400 mt-1">Enter PIN to view profit details</p>
            </div>
            
            <form onSubmit={handlePinSubmit}>
              <div className="mb-4">
                <input 
                  type="password" 
                  autoFocus
                  value={pinInput}
                  onChange={(e) => { setPinInput(e.target.value); setPinError(''); }}
                  placeholder="••••"
                  className="w-full bg-[#0a0a0a] border border-gray-800 text-white rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] focus:border-brand-green outline-none"
                />
                {pinError && <p className="text-red-500 text-xs font-bold mt-2 text-center">{pinError}</p>}
              </div>
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsPinModalOpen(false)}
                  className="flex-1 bg-[#0a0a0a] text-gray-400 border border-gray-800 py-3 rounded-xl font-bold hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-brand-green text-black py-3 rounded-xl font-black tracking-wide hover:bg-[#92ff00] transition-colors shadow-[0_0_15px_rgba(132,234,0,0.2)]"
                >
                  Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
