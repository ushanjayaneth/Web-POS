import React, { useEffect, useState, useRef, useCallback } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { LogOut, Lock, Menu, X, Bell } from 'lucide-react';
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
  { id: 'pos',      label: 'POS' },
  { id: 'products', label: 'STOCK' },
  { id: 'loans',    label: 'LOANS' },
  { id: 'reports',  label: 'REPORTS' },
  { id: 'returns',  label: 'RETURNS' },
  { id: 'barcodes', label: 'BARCODES' },
  { id: 'orders',   label: 'ORDERS' },
  { id: 'sellers',  label: 'SELLERS' },
  { id: 'users',    label: 'USERS' },
  { id: 'coupons',  label: 'COUPONS' },
  { id: 'settings', label: 'SETTINGS' },
];

/* ─── send browser push notification ─── */
const sendPushNotification = (title, body, tabId, onClickTab) => {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  const n = new Notification(title, {
    body,
    icon: '/logo.png',
    badge: '/logo.png',
    tag: tabId,
  });
  n.onclick = () => {
    window.focus();
    onClickTab(tabId);
    n.close();
  };
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab]         = useState('pos');
  const [dailyRevenue, setDailyRevenue]   = useState(0);
  const [isProfitVisible, setIsProfitVisible] = useState(false);
  const [isUnlockOpen, setIsUnlockOpen]   = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError]     = useState('');
  const [isUnlocking, setIsUnlocking]     = useState(false);

  /* hamburger menu */
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  /* notification counts per tab */
  const [notifCounts, setNotifCounts] = useState({});
  const prevCounts = useRef({});

  /* ── close dropdown when clicking outside ── */
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── request browser notification permission ── */
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  /* ── poll for notification counts every 30 s ── */
  const fetchNotifCounts = useCallback(async () => {
    try {
      const [selRes, ordRes, spRes] = await Promise.allSettled([
        adminApi.getSellers(),
        adminApi.getOrders(),
        adminApi.getSellerProducts(),
      ]);

      const newCounts = {};

      if (selRes.status === 'fulfilled' && selRes.value.success) {
        const pending = (selRes.value.data || []).filter(s => s.status === 'pending').length;
        newCounts.sellers = pending;
      }

      if (ordRes.status === 'fulfilled' && ordRes.value.success) {
        const pending = (ordRes.value.data || []).filter(o =>
          o.status === 'pending' || o.status === 'processing'
        ).length;
        newCounts.orders = pending;
      }

      if (spRes.status === 'fulfilled' && spRes.value.success) {
        const pending = (spRes.value.data || []).filter(p => p.approval_status === 'pending').length;
        // show on sellers tab as well (combined)
        newCounts.sellers = (newCounts.sellers || 0) + pending;
      }

      /* fire push notifications for increases */
      Object.entries(newCounts).forEach(([tab, count]) => {
        const prev = prevCounts.current[tab] || 0;
        if (count > prev) {
          const diff = count - prev;
          const label = navItems.find(n => n.id === tab)?.label || tab;
          sendPushNotification(
            `ShoppingLK Admin — ${label}`,
            `${diff} new item${diff > 1 ? 's' : ''} waiting for review`,
            tab,
            setActiveTab,
          );
        }
      });

      prevCounts.current = newCounts;
      setNotifCounts(newCounts);

      /* ── update PWA app icon badge ── */
      const total = Object.values(newCounts).reduce((s, v) => s + (v || 0), 0);
      if ('setAppBadge' in navigator) {
        if (total > 0) navigator.setAppBadge(total).catch(() => {});
        else navigator.clearAppBadge().catch(() => {});
      }
    } catch {/* silent */}
  }, []);

  useEffect(() => {
    fetchNotifCounts();
    const interval = setInterval(fetchNotifCounts, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifCounts]);

  /* ── daily revenue ── */
  useEffect(() => {
    const loadRevenue = async () => {
      try {
        const res = await adminApi.getSales();
        const today = new Date().toISOString().split('T')[0];
        const revenue = (res.data || [])
          .filter(s => new Date(s.created_at).toISOString().split('T')[0] === today && !s.isReturn)
          .reduce((sum, s) => sum + Number(s.total || 0), 0);
        setDailyRevenue(revenue);
      } catch { setDailyRevenue(0); }
    };
    loadRevenue();
  }, []);

  const handleToggleLock = () => {
    if (isProfitVisible) { setIsProfitVisible(false); return; }
    setIsUnlockOpen(true);
    setUnlockPassword('');
    setUnlockError('');
  };

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!auth.currentUser?.email) { setUnlockError('Please sign in again.'); return; }
    setIsUnlocking(true);
    setUnlockError('');
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, unlockPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      setIsProfitVisible(true);
      setIsUnlockOpen(false);
      setUnlockPassword('');
    } catch { setUnlockError('Password confirmation failed.'); setUnlockPassword(''); }
    finally { setIsUnlocking(false); }
  };

  const handleLogout = async () => {
    if ('clearAppBadge' in navigator) navigator.clearAppBadge().catch(() => {});
    await signOut(auth);
    navigate('/login');
  };

  const handleTabClick = (id) => {
    setActiveTab(id);
    setMenuOpen(false);
    /* clear badge for this tab when user visits it */
    setNotifCounts(prev => ({ ...prev, [id]: 0 }));
    prevCounts.current = { ...prevCounts.current, [id]: 0 };
  };

  /* total badge count for the hamburger button itself */
  const totalNotif = Object.values(notifCounts).reduce((s, v) => s + (v || 0), 0);

  const renderContent = () => {
    const wrapPanel = (comp) => (
      <div className="flex-1 overflow-y-auto p-4 md:p-6 text-white custom-scrollbar">{comp}</div>
    );
    switch (activeTab) {
      case 'products':  return <Products isProfitVisible={isProfitVisible} />;
      case 'orders':    return <Orders />;
      case 'loans':     return <Loans isProfitVisible={isProfitVisible} />;
      case 'reports':   return <Reports isProfitVisible={isProfitVisible} />;
      case 'returns':   return <Returns />;
      case 'barcodes':  return <Barcodes />;
      case 'sellers':   return wrapPanel(<SellersPanel />);
      case 'users':     return wrapPanel(<UsersPanel />);
      case 'coupons':   return wrapPanel(<CouponsPanel />);
      case 'settings':  return wrapPanel(<SettingsPanel />);
      case 'pos':
      default:          return <PosTerminal isProfitVisible={isProfitVisible} />;
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-brand-dark flex flex-col font-sans">

      {/* ══════════════ HEADER ══════════════ */}
      <div className="bg-brand-dark border-b border-white/5 flex items-center px-3 md:px-5 shrink-0 h-14 gap-2">

        {/* Logo */}
        <h2 className="text-lg font-black text-white flex items-center gap-2 shrink-0 mr-1">
          <PosLogo />
          Shop<span className="text-brand-purple">LK</span>
        </h2>

        {/* ── Desktop nav: horizontally scrollable, takes remaining space ── */}
        <nav className="hidden md:flex items-center gap-1 overflow-x-auto flex-1 min-w-0 hide-scrollbar">
          {navItems.map((item) => {
            const count = notifCounts[item.id] || 0;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`relative whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  activeTab === item.id
                    ? 'bg-brand-purple text-white shadow-[0_0_15px_rgba(124,58,237,0.3)]'
                    : 'bg-transparent text-gray-400 hover:text-white'
                }`}
              >
                {item.label}
                {count > 0 && (
                  <span style={{
                    position: 'absolute', top: -5, right: -5,
                    background: '#ef4444', color: '#fff',
                    fontSize: 9, fontWeight: 800,
                    minWidth: 16, height: 16,
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 3px',
                    border: '1.5px solid #0a0a14',
                    lineHeight: 1,
                  }}>{count > 99 ? '99+' : count}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* ── Mobile: hamburger button (takes remaining space) ── */}
        <div className="md:hidden flex-1 flex items-center min-w-0" ref={menuRef}>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 10px', borderRadius: 8,
                background: menuOpen ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: menuOpen ? '#a78bfa' : '#9ca3af',
                cursor: 'pointer', position: 'relative',
              }}
              aria-label="Navigation menu"
            >
              {menuOpen ? <X size={16} /> : <Menu size={16} />}
              <span style={{ fontSize: 11, fontWeight: 700 }}>
                {navItems.find(n => n.id === activeTab)?.label || 'MENU'}
              </span>
              {/* total badge on hamburger */}
              {totalNotif > 0 && !menuOpen && (
                <span style={{
                  position: 'absolute', top: -6, right: -6,
                  background: '#ef4444', color: '#fff',
                  fontSize: 9, fontWeight: 800,
                  minWidth: 16, height: 16, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 3px', border: '1.5px solid #0a0a14',
                }}>{totalNotif > 99 ? '99+' : totalNotif}</span>
              )}
            </button>

            {/* Dropdown menu */}
            {menuOpen && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, marginTop: 6,
                background: '#151520', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                zIndex: 200, minWidth: 200, overflow: 'hidden',
              }}>
                {/* Scrollable list */}
                <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '6px 6px' }}>
                  {navItems.map((item) => {
                    const count = notifCounts[item.id] || 0;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleTabClick(item.id)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          width: '100%', padding: '9px 14px', borderRadius: 8,
                          border: 'none', textAlign: 'left', cursor: 'pointer',
                          background: isActive ? 'rgba(124,58,237,0.2)' : 'transparent',
                          color: isActive ? '#a78bfa' : '#9ca3af',
                          fontSize: 13, fontWeight: 700, transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => !isActive && (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                        onMouseLeave={e => !isActive && (e.currentTarget.style.background = 'transparent')}
                      >
                        <span>{item.label}</span>
                        {count > 0 && (
                          <span style={{
                            background: '#ef4444', color: '#fff',
                            fontSize: 10, fontWeight: 800,
                            minWidth: 18, height: 18, borderRadius: 9,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '0 4px',
                          }}>{count > 99 ? '99+' : count}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right side — ALWAYS VISIBLE ── */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* Daily revenue — hidden on very small, visible md+ */}
          <div className="hidden md:flex bg-brand-card/50 border border-white/5 px-3 py-1.5 rounded-xl flex-col items-center justify-center">
            <span className="text-[9px] text-gray-400 font-bold leading-none">DAILY REVENUE</span>
            <span className="text-xs font-bold text-white mt-0.5">
              {isProfitVisible
                ? `Rs. ${dailyRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : 'Locked'}
            </span>
          </div>

          {/* Lock/Unlock button */}
          <button
            onClick={handleToggleLock}
            className={`flex items-center gap-1.5 ${
              isProfitVisible
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-brand-purple hover:bg-brand-purple-hover text-white'
            } px-3 py-2 rounded-xl font-bold transition-colors text-xs shadow-[0_0_12px_rgba(124,58,237,0.25)]`}
          >
            <Lock size={13} className="text-white" />
            <span className="hidden sm:inline">{isProfitVisible ? 'LOCK' : 'UNLOCK'}</span>
          </button>

          {/* Bell — notification summary (always visible) */}
          {totalNotif > 0 && (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Bell size={18} style={{ color: '#f59e0b' }} />
              <span style={{
                position: 'absolute', top: -5, right: -5,
                background: '#ef4444', color: '#fff',
                fontSize: 9, fontWeight: 800,
                minWidth: 14, height: 14, borderRadius: 7,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 2px',
              }}>{totalNotif > 99 ? '99+' : totalNotif}</span>
            </div>
          )}

          {/* Logout */}
          <button onClick={handleLogout} className="text-gray-500 hover:text-white transition-colors" title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* ══════════════ CONTENT ══════════════ */}
      <div className="flex-1 overflow-hidden flex flex-col relative z-10 bg-brand-dark">
        {renderContent()}
      </div>

      {/* ══════════════ UNLOCK MODAL ══════════════ */}
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
                >Cancel</button>
                <button
                  type="submit"
                  disabled={isUnlocking}
                  className="flex-1 bg-brand-green text-black py-3 rounded-xl font-black tracking-wide hover:bg-[#92ff00] transition-colors shadow-[0_0_15px_rgba(132,234,0,0.2)] disabled:opacity-60"
                >{isUnlocking ? 'Checking...' : 'Unlock'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
