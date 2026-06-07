import React, { useEffect, useState } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { LogOut, Lock, ShoppingBag } from 'lucide-react';
import adminApi from '../utils/adminApi';
import Products from './Products';
import Orders from './Orders';
import PosTerminal from './PosTerminal';
import Loans from './Loans';
import Reports from './Reports';
import Returns from './Returns';
import Barcodes from './Barcodes';
import SellersPanel from '../components/panels/SellersPanel';
import UsersPanel from '../components/panels/UsersPanel';
import CouponsPanel from '../components/panels/CouponsPanel';
import SettingsPanel from '../components/panels/SettingsPanel';

const PosLogo = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="32" height="32" rx="8" fill="#1a1a2e"/>
    <rect x="1" y="1" width="30" height="30" rx="7" stroke="rgba(132,234,0,0.3)" strokeWidth="1"/>
    <path d="M9 11h14l-2 10H11L9 11z" fill="#84ea00" fillOpacity="0.9"/>
    <path d="M12 11c0-2.21 1.79-4 4-4s4 1.79 4 4" stroke="#84ea00" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
    <circle cx="13" cy="23" r="1.2" fill="#84ea00"/>
    <circle cx="20" cy="23" r="1.2" fill="#84ea00"/>
  </svg>
);

const navItems = [
  { id: 'pos', label: 'POS' },
  { id: 'products', label: 'STOCK' },
  { id: 'loans', label: 'LOANS' },
  { id: 'reports', label: 'REPORTS' },
  { id: 'returns', label: 'RETURNS' },
  { id: 'barcodes', label: 'BARCODES' },
  { id: 'orders', label: 'ORDERS' },
  { id: 'sellers', label: 'SELLERS' },
  { id: 'users', label: 'USERS' },
  { id: 'coupons', label: 'COUPONS' },
  { id: 'settings', label: 'SETTINGS' },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pos');
  const [dailyRevenue, setDailyRevenue] = useState(0);
  const [isProfitVisible, setIsProfitVisible] = useState(false);
  const [isUnlockOpen, setIsUnlockOpen] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  useEffect(() => {
    const loadRevenue = async () => {
      try {
        const res = await adminApi.getSales();
        const today = new Date().toISOString().split('T')[0];
        const revenue = (res.data || [])
          .filter((sale) => new Date(sale.created_at).toISOString().split('T')[0] === today && !sale.isReturn)
          .reduce((sum, sale) => sum + Number(sale.total || 0), 0);
        setDailyRevenue(revenue);
      } catch {
        setDailyRevenue(0);
      }
    };

    loadRevenue();
  }, []);

  const handleToggleLock = () => {
    if (isProfitVisible) {
      setIsProfitVisible(false);
      return;
    }

    setIsUnlockOpen(true);
    setUnlockPassword('');
    setUnlockError('');
  };

  const handleUnlock = async (event) => {
    event.preventDefault();

    if (!auth.currentUser?.email) {
      setUnlockError('Please sign in again.');
      return;
    }

    setIsUnlocking(true);
    setUnlockError('');

    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, unlockPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      setIsProfitVisible(true);
      setIsUnlockOpen(false);
      setUnlockPassword('');
    } catch {
      setUnlockError('Password confirmation failed.');
      setUnlockPassword('');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const renderContent = () => {
    // Add scroll/padding container for modern layout integration of our new sections
    const wrapPanel = (comp) => (
      <div className="flex-1 overflow-y-auto p-4 md:p-6 text-white custom-scrollbar">
        {comp}
      </div>
    );

    switch (activeTab) {
      case 'products':
        return <Products isProfitVisible={isProfitVisible} />;
      case 'orders':
        return <Orders />;
      case 'loans':
        return <Loans isProfitVisible={isProfitVisible} />;
      case 'reports':
        return <Reports isProfitVisible={isProfitVisible} />;
      case 'returns':
        return <Returns />;
      case 'barcodes':
        return <Barcodes />;
      case 'sellers':
        return wrapPanel(<SellersPanel />);
      case 'users':
        return wrapPanel(<UsersPanel />);
      case 'coupons':
        return wrapPanel(<CouponsPanel />);
      case 'settings':
        return wrapPanel(<SettingsPanel />);
      case 'pos':
      default:
        return <PosTerminal isProfitVisible={isProfitVisible} />;
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-brand-dark flex flex-col font-sans">
      <div className="bg-brand-dark border-b border-white/5 flex flex-col md:flex-row md:h-20 items-center justify-between px-4 md:px-6 shrink-0 py-3 md:py-0 gap-4 md:gap-0">
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 w-full md:w-auto">
          <div className="flex items-center justify-between w-full md:w-auto">
            <h2 className="text-xl md:text-2xl font-black text-white tracking-wide flex items-center gap-2.5">
              <PosLogo />
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
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`whitespace-nowrap px-4 md:px-6 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all ${activeTab === item.id ? 'bg-brand-purple text-white shadow-[0_0_15px_rgba(124,58,237,0.3)]' : 'bg-transparent text-gray-400 hover:text-white'}`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <div className="bg-brand-card/50 border border-white/5 px-4 py-2.5 rounded-xl flex flex-col items-center justify-center">
            <span className="text-[10px] text-gray-400 font-bold">DAILY REVENUE</span>
            <span className="text-sm font-bold text-white">
              {isProfitVisible
                ? `Rs. ${dailyRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : 'Locked'}
            </span>
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

      <div className="flex-1 overflow-hidden flex flex-col relative z-10 bg-brand-dark">
        {renderContent()}
      </div>

      {isUnlockOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#151515] border border-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="text-center mb-6">
              <div className="inline-block bg-[#0a0a0a] p-4 rounded-full border border-gray-800 mb-4">
                <Lock size={32} className="text-brand-green" />
              </div>
              <h3 className="text-xl font-black text-white">Confirm Admin Password</h3>
              <p className="text-sm text-gray-400 mt-1">Re-enter your login password to view profit details.</p>
            </div>

            <form onSubmit={handleUnlock}>
              <div className="mb-4">
                <input
                  type="password"
                  autoFocus
                  value={unlockPassword}
                  onChange={(e) => { setUnlockPassword(e.target.value); setUnlockError(''); }}
                  placeholder="Enter password"
                  className="w-full bg-[#0a0a0a] border border-gray-800 text-white rounded-xl px-4 py-3 focus:border-brand-green outline-none"
                />
                {unlockError && <p className="text-red-500 text-xs font-bold mt-2 text-center">{unlockError}</p>}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsUnlockOpen(false)}
                  disabled={isUnlocking}
                  className="flex-1 bg-[#0a0a0a] text-gray-400 border border-gray-800 py-3 rounded-xl font-bold hover:text-white transition-colors disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUnlocking}
                  className="flex-1 bg-brand-green text-black py-3 rounded-xl font-black tracking-wide hover:bg-[#92ff00] transition-colors shadow-[0_0_15px_rgba(132,234,0,0.2)] disabled:opacity-60"
                >
                  {isUnlocking ? 'Checking...' : 'Unlock'}
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
