import React, { useState, useEffect } from 'react';
import { FileText, TrendingUp, DollarSign, CreditCard, Banknote, BookOpen } from 'lucide-react';
import adminApi from '../utils/adminApi';

const Reports = ({ isProfitVisible = false }) => {
  const [sales, setSales] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

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
    return saleDate === selectedDate;
  });

  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  const totalProfit = filteredSales.reduce((sum, sale) => sum + (sale.profit || 0), 0);
  
  const cashSales = filteredSales.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + s.total, 0);
  const cardSales = filteredSales.filter(s => s.payment_method === 'card').reduce((sum, s) => sum + s.total, 0);
  const loanSales = filteredSales.filter(s => s.payment_method === 'loan').reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-white">Day End <span className="text-brand-green">Reports</span></h2>
          <p className="text-gray-500 mt-1 font-medium">View daily revenue, profits, and payment breakdowns.</p>
        </div>
        <div className="bg-[#151515] border border-gray-800 px-4 py-2 rounded-xl flex items-center gap-3">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Date</label>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-[#0a0a0a] text-white border border-gray-700 rounded-lg px-3 py-1.5 focus:border-brand-green outline-none text-sm font-bold"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-[#151515] border border-gray-800 p-6 rounded-2xl flex items-center gap-4">
          <div className="bg-[#0f2e0f] p-4 rounded-xl text-brand-green">
            <DollarSign size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Revenue</p>
            <p className="text-2xl font-black text-white mt-1">
              {isProfitVisible ? `Rs. ${totalRevenue.toLocaleString()}` : <span className="blur-sm select-none opacity-50">Rs. ████</span>}
            </p>
          </div>
        </div>

        <div className="bg-[#151515] border border-gray-800 p-6 rounded-2xl flex items-center gap-4">
          <div className="bg-[#0f2e2e] p-4 rounded-xl text-[#5cedff]">
            <TrendingUp size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Net Profit</p>
            <p className="text-2xl font-black text-white mt-1">
              {isProfitVisible ? `Rs. ${totalProfit.toLocaleString()}` : <span className="blur-sm select-none opacity-50">Rs. ████</span>}
            </p>
          </div>
        </div>

        <div className="bg-[#151515] border border-gray-800 p-6 rounded-2xl flex items-center gap-4">
          <div className="bg-[#2e2e0f] p-4 rounded-xl text-[#fff35c]">
            <FileText size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Invoices</p>
            <p className="text-2xl font-black text-white mt-1">{filteredSales.length}</p>
          </div>
        </div>

        <div className="bg-[#151515] border border-gray-800 p-6 rounded-2xl flex flex-col justify-center gap-3">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2 text-gray-400 font-bold"><Banknote size={16} className="text-brand-green"/> Cash</div>
            <span className="text-white font-black">Rs. {cashSales.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2 text-gray-400 font-bold"><CreditCard size={16} className="text-blue-500"/> Card</div>
            <span className="text-white font-black">Rs. {cardSales.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2 text-gray-400 font-bold"><BookOpen size={16} className="text-[#ffc85c]"/> Loan</div>
            <span className="text-white font-black">Rs. {loanSales.toLocaleString()}</span>
          </div>
        </div>
      </div>

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
                    <td className="py-4 pl-4 text-sm text-gray-400">{new Date(sale.created_at).toLocaleTimeString()}</td>
                    <td className="py-4 text-sm text-gray-300">
                      {sale.items?.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                    </td>
                    <td className="py-4 text-sm font-bold">
                      <span className={`px-2 py-1 rounded-md text-[10px] uppercase tracking-wider ${
                        sale.payment_method === 'cash' ? 'bg-[#0f2e0f] text-brand-green' : 
                        sale.payment_method === 'card' ? 'bg-[#0f1f2e] text-blue-400' : 
                        'bg-[#3d2e0b] text-[#ffc85c]'
                      }`}>
                        {sale.payment_method}
                      </span>
                    </td>
                    <td className="py-4 text-sm font-black text-white">Rs. {sale.total}</td>
                    <td className="py-4 text-sm font-bold text-[#5cedff] text-right pr-4">
                      {isProfitVisible ? `Rs. ${sale.profit || 0}` : <span className="blur-sm select-none opacity-50 text-[10px]">🔒</span>}
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
