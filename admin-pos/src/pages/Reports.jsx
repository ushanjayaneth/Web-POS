import React, { useState, useEffect } from 'react';
import { FileText, TrendingUp, DollarSign, CreditCard, Banknote, BookOpen } from 'lucide-react';
import adminApi from '../utils/adminApi';

const Reports = ({ isProfitVisible = false }) => {
  const [sales, setSales] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [openingBalance, setOpeningBalance] = useState(() => Number(localStorage.getItem('pos_opening_balance') || 0));
  const [editingBalance, setEditingBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');

  useEffect(() => {
    const loadSales = async () => {
      try {
        const res = await adminApi.getSales();
        setSales(res.data || []);
      } catch (error) {
        alert(error.message || 'Failed to load sales.');
      }
    };
    loadSales();
  }, []);

  const filteredSales = sales.filter(sale => {
    const saleDate = new Date(sale.created_at).toISOString().split('T')[0];
    return saleDate === selectedDate && !sale.isReturn;
  });

  const totalRevenue = filteredSales.reduce((sum, s) => sum + Number(s.total || 0), 0);
  const totalProfit  = filteredSales.reduce((sum, s) => sum + Number(s.profit || 0), 0);
  const cashSales    = filteredSales.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + Number(s.total || 0), 0);
  const cardSales    = filteredSales.filter(s => s.payment_method === 'card').reduce((sum, s) => sum + Number(s.total || 0), 0);
  const loanSales    = filteredSales.filter(s => s.payment_method === 'loan').reduce((sum, s) => sum + Number(s.total || 0), 0);

  const expectedDrawer = openingBalance + cashSales;

  // ── Hourly sales chart data ──────────────────────────────────
  const hourlySales = Array.from({ length: 24 }, (_, h) => {
    const hr = filteredSales.filter(s => new Date(s.created_at).getHours() === h);
    return { hour: h, total: hr.reduce((sum, s) => sum + Number(s.total || 0), 0), count: hr.length };
  });
  const maxHourlyTotal = Math.max(...hourlySales.map(h => h.total), 1);
  const hasHourlyData  = hourlySales.some(h => h.total > 0);

  // ── Top selling items ────────────────────────────────────────
  const itemMap = {};
  filteredSales.forEach(sale => {
    (sale.items || []).forEach(item => {
      if (!itemMap[item.name]) itemMap[item.name] = { name: item.name, qty: 0, revenue: 0 };
      itemMap[item.name].qty     += Number(item.quantity || 1);
      itemMap[item.name].revenue += Number(item.total || item.price || 0);
    });
  });
  const topItems = Object.values(itemMap).sort((a, b) => b.revenue - a.revenue).slice(0, 8);

  const saveBalance = () => {
    const val = parseFloat(balanceInput) || 0;
    setOpeningBalance(val);
    localStorage.setItem('pos_opening_balance', val);
    setEditingBalance(false);
  };

  return (
    <div className="p-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white">Day End <span className="text-brand-green">Reports</span></h2>
          <p className="text-gray-500 mt-1 font-medium">Daily revenue, profits, and payment breakdowns.</p>
        </div>
        <div className="bg-[#151515] border border-gray-800 px-4 py-2 rounded-xl flex items-center gap-3">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="bg-[#0a0a0a] text-white border border-gray-700 rounded-lg px-3 py-1.5 focus:border-brand-green outline-none text-sm font-bold"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#151515] border border-gray-800 p-5 rounded-2xl flex items-center gap-4">
          <div className="bg-[#0f2e0f] p-4 rounded-xl text-brand-green"><DollarSign size={24} /></div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Revenue</p>
            <p className="text-2xl font-black text-white mt-1">
              {isProfitVisible ? `Rs. ${totalRevenue.toLocaleString()}` : <span className="blur-sm select-none opacity-50">Rs. ████</span>}
            </p>
          </div>
        </div>

        <div className="bg-[#151515] border border-gray-800 p-5 rounded-2xl flex items-center gap-4">
          <div className="bg-[#0f2e2e] p-4 rounded-xl text-[#5cedff]"><TrendingUp size={24} /></div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Net Profit</p>
            <p className="text-2xl font-black text-white mt-1">
              {isProfitVisible ? `Rs. ${totalProfit.toLocaleString()}` : <span className="blur-sm select-none opacity-50">Rs. ████</span>}
            </p>
          </div>
        </div>

        <div className="bg-[#151515] border border-gray-800 p-5 rounded-2xl flex items-center gap-4">
          <div className="bg-[#2e2e0f] p-4 rounded-xl text-[#fff35c]"><FileText size={24} /></div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Invoices</p>
            <p className="text-2xl font-black text-white mt-1">{filteredSales.length}</p>
          </div>
        </div>

        <div className="bg-[#151515] border border-gray-800 p-5 rounded-2xl flex flex-col justify-center gap-2">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2 text-gray-400 font-bold"><Banknote size={16} className="text-brand-green" /> Cash</div>
            <span className="text-white font-black">Rs. {cashSales.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2 text-gray-400 font-bold"><CreditCard size={16} className="text-blue-500" /> Card</div>
            <span className="text-white font-black">Rs. {cardSales.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2 text-gray-400 font-bold"><BookOpen size={16} className="text-[#ffc85c]" /> Loan</div>
            <span className="text-white font-black">Rs. {loanSales.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Expected Cash Drawer */}
      <div className={`mb-6 rounded-2xl border p-5 flex items-center justify-between gap-4 flex-wrap ${expectedDrawer > 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-[#151515] border-gray-800'}`}>
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 p-3 rounded-xl text-emerald-400"><DollarSign size={22} /></div>
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Expected Cash Drawer Balance</div>
            <div className="text-2xl font-black text-emerald-400 mt-0.5">Rs. {expectedDrawer.toFixed(2)}</div>
            <div className="text-xs text-gray-600 mt-0.5">
              Opening: Rs. {openingBalance.toFixed(2)} &nbsp;+&nbsp; Cash Sales: Rs. {cashSales.toFixed(2)}
            </div>
          </div>
        </div>
        <div>
          {editingBalance ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                type="number"
                placeholder="Opening cash"
                value={balanceInput}
                onChange={e => setBalanceInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveBalance()}
                className="bg-[#0a0a0a] border border-gray-700 text-white rounded-xl px-3 py-2 text-sm w-36 outline-none focus:border-emerald-500"
              />
              <button onClick={saveBalance} className="bg-emerald-500 text-black px-3 py-2 rounded-xl text-xs font-bold">Set</button>
              <button onClick={() => setEditingBalance(false)} className="text-gray-600 hover:text-white text-xs px-2">✕</button>
            </div>
          ) : (
            <button
              onClick={() => { setBalanceInput(String(openingBalance)); setEditingBalance(true); }}
              className="text-xs font-bold text-gray-600 hover:text-white border border-gray-800 hover:border-gray-600 px-3 py-2 rounded-lg transition-all"
            >
              Set Opening Balance
            </button>
          )}
        </div>
      </div>

      {/* Hourly Sales Chart */}
      {hasHourlyData && (
        <div className="bg-[#151515] border border-gray-800 rounded-2xl p-5 mb-6">
          <h3 className="text-sm font-black text-white uppercase tracking-wide mb-4">⏱ Hourly Sales Activity</h3>
          <div className="flex items-end gap-0.5 h-20">
            {hourlySales.map(({ hour, total, count }) => {
              const pct = total / maxHourlyTotal;
              const active = total > 0;
              return (
                <div key={hour} className="flex-1 flex flex-col items-center group relative">
                  <div
                    className="w-full rounded-t transition-all duration-500"
                    style={{
                      height: `${Math.max(active ? 8 : 0, pct * 100)}%`,
                      background: active ? 'linear-gradient(to top, rgba(0,212,255,0.4), rgba(0,212,255,0.9))' : 'transparent',
                      minHeight: active ? '8px' : '0',
                    }}
                  />
                  {active && (
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-[#0a0a0a] border border-gray-700 text-white text-[9px] px-2 py-1 rounded whitespace-nowrap font-mono opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none shadow-lg">
                      {hour}:00 · Rs.{total.toFixed(0)} · {count}×
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[9px] text-gray-700 mt-1 px-0.5">
            {['12AM','3AM','6AM','9AM','12PM','3PM','6PM','9PM','12AM'].map(t => <span key={t}>{t}</span>)}
          </div>
        </div>
      )}

      {/* Top Selling Items */}
      {topItems.length > 0 && (
        <div className="bg-[#151515] border border-gray-800 rounded-2xl p-5 mb-6">
          <h3 className="text-sm font-black text-white uppercase tracking-wide mb-4">🏆 Top Selling Items</h3>
          <div className="space-y-2.5">
            {topItems.map((item, i) => {
              const pct = item.revenue / (topItems[0]?.revenue || 1);
              const hue = 175 + i * 22;
              return (
                <div key={item.name} className="flex items-center gap-3">
                  <div className="w-5 text-[10px] font-black text-gray-700 text-right flex-shrink-0">#{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-bold text-white truncate pr-2">{item.name}</span>
                      <span className="text-xs text-gray-500 font-mono flex-shrink-0">{item.qty} sold · Rs. {item.revenue.toFixed(0)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct * 100}%`, background: `hsl(${hue}, 75%, 55%)` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transaction Table */}
      <div className="bg-brand-card rounded-2xl border border-gray-800 p-6">
        <h3 className="text-lg font-black text-white uppercase tracking-wide mb-6">Recent Transactions</h3>
        {filteredSales.length === 0 ? (
          <div className="py-12 text-center border border-gray-800 border-dashed rounded-xl">
            <FileText className="mx-auto h-12 w-12 text-gray-600 mb-3" />
            <p className="text-gray-500 font-medium">No sales recorded for this date.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500 font-bold">
                  <th className="pb-4 pl-4">Time</th>
                  <th className="pb-4">Items</th>
                  <th className="pb-4">Payment</th>
                  <th className="pb-4">Total</th>
                  <th className="pb-4 text-right pr-4">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {filteredSales.slice().reverse().map(sale => (
                  <tr key={sale.id} className="hover:bg-[#0a0a0a]/50 transition-colors">
                    <td className="py-4 pl-4 text-sm text-gray-400 font-mono">{new Date(sale.created_at).toLocaleTimeString()}</td>
                    <td className="py-4 text-sm text-gray-300 max-w-[200px] truncate">
                      {(sale.items || []).map(i => `${i.quantity}x ${i.name}`).join(', ')}
                    </td>
                    <td className="py-4 text-sm font-bold">
                      <span className={`px-2 py-1 rounded-md text-[10px] uppercase tracking-wider ${
                        sale.payment_method === 'cash'  ? 'bg-[#0f2e0f] text-brand-green'  :
                        sale.payment_method === 'card'  ? 'bg-[#0f1f2e] text-blue-400'      :
                        'bg-[#3d2e0b] text-[#ffc85c]'
                      }`}>
                        {sale.payment_method}
                      </span>
                    </td>
                    <td className="py-4 text-sm font-black text-white">Rs. {Number(sale.total || 0).toFixed(2)}</td>
                    <td className="py-4 text-sm font-bold text-[#5cedff] text-right pr-4">
                      {isProfitVisible
                        ? `Rs. ${Number(sale.profit || 0).toFixed(2)}`
                        : <span className="blur-sm select-none opacity-50 text-[10px]">🔒</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
