import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, Search } from 'lucide-react';
import adminApi from '../utils/adminApi';

const Loans = () => {
  const [loans, setLoans] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const loadLoans = async () => {
    try {
      const res = await adminApi.getSales();
      const loanList = (res.data || [])
        .filter(sale => sale.payment_method === 'loan' && sale.status === 'unpaid')
        .sort((a, b) => b.created_at - a.created_at);
      setLoans(loanList);
    } catch (error) {
      alert(error.message || 'Failed to load loans.');
    }
  };

  useEffect(() => {
    loadLoans();
  }, []);

  const handleSettleLoan = async (loan) => {
    if (window.confirm(`Are you sure you want to settle this loan for ${loan.customer_name}? Amount: Rs.${loan.total}`)) {
      try {
        await adminApi.settleLoan(loan.id);
        await loadLoans();
        alert('Loan settled successfully!');
      } catch (error) {
        console.error('Failed to settle loan:', error);
        alert('Failed to settle loan.');
      }
    }
  };

  const filteredLoans = loans.filter(loan => 
    loan.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalOutstanding = loans.reduce((sum, loan) => sum + loan.total, 0);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-white">Credit & <span className="text-brand-green">Loans</span></h2>
          <p className="text-gray-500 mt-1 font-medium">Manage unpaid credit sales and settle customer loans.</p>
        </div>
        <div className="bg-[#151515] border border-gray-800 px-6 py-3 rounded-xl flex items-center gap-4">
          <div className="bg-[#3d2e0b] p-2 rounded-lg text-[#ffc85c]">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Outstanding</p>
            <p className="text-2xl font-black text-white">Rs. {totalOutstanding.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-brand-card rounded-2xl border border-gray-800 p-6">
        <div className="mb-6 relative w-1/3 min-w-[300px]">
          <Search className="absolute left-4 top-3.5 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search customer name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-[#0a0a0a] text-white rounded-xl border border-gray-800 focus:border-brand-green focus:ring-1 focus:ring-brand-green outline-none transition-all placeholder-gray-600 font-medium text-sm"
          />
        </div>

        {filteredLoans.length === 0 ? (
          <div className="py-12 text-center border border-gray-800 border-dashed rounded-xl">
            <BookOpen className="mx-auto h-12 w-12 text-gray-600 mb-3" />
            <p className="text-gray-500 font-medium">No unpaid loans found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500 font-bold">
                  <th className="pb-4 pl-4">Date</th>
                  <th className="pb-4">Customer Name</th>
                  <th className="pb-4">Items</th>
                  <th className="pb-4">Amount</th>
                  <th className="pb-4 text-right pr-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {filteredLoans.map(loan => (
                  <tr key={loan.id} className="hover:bg-[#0a0a0a]/50 transition-colors">
                    <td className="py-4 pl-4 text-sm text-gray-400">{new Date(loan.created_at).toLocaleString()}</td>
                    <td className="py-4 text-sm font-bold text-white">{loan.customer_name}</td>
                    <td className="py-4 text-sm text-gray-400">
                      {loan.items?.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                    </td>
                    <td className="py-4 text-sm font-black text-[#ffc85c]">Rs. {loan.total}</td>
                    <td className="py-4 text-right pr-4">
                      <button 
                        onClick={() => handleSettleLoan(loan)}
                        className="bg-brand-green hover:bg-[#92ff00] text-black px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 ml-auto transition-all"
                      >
                        <CheckCircle size={14} /> Settle
                      </button>
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

export default Loans;
