import React, { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Search, Building2, Trash2, Plus, X } from 'lucide-react';
import adminApi from '../utils/adminApi';

// ── CUSTOMER RETURNS ──────────────────────────────────────────────
const CustomerReturns = () => {
  const [billId, setBillId] = useState('');
  const [sale, setSale] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [returnModal, setReturnModal] = useState(null); // { itemIdx, item }

  const searchBill = async () => {
    if (!billId.trim()) return;
    setSearching(true);
    setSearchError('');
    setSale(null);
    try {
      const res = await adminApi.getSales();
      const found = (res.data || []).find(s => s.id === billId.trim() || s.billId === billId.trim());
      if (!found) { setSearchError('❌ Bill not found. Check the ID.'); return; }
      setSale(found);
    } catch (e) {
      setSearchError(e.message || 'Failed to search.');
    } finally {
      setSearching(false);
    }
  };

  const executeReturn = async (type) => {
    if (!returnModal || !sale) return;
    setProcessing(true);
    try {
      await adminApi.processReturn(sale.id, returnModal.itemIdx, type);
      // Refresh the sale record
      const res = await adminApi.getSales();
      const updated = (res.data || []).find(s => s.id === sale.id);
      setSale(updated || null);
      setReturnModal(null);
      alert(type === 'refund'
        ? `✅ Cash Refund processed! Give Rs. ${(returnModal.item.price || 0).toFixed(2)} to customer.`
        : '✅ Credit added. Go to POS to apply it to the next sale.');
    } catch (e) {
      alert(e.message || 'Failed to process return.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      {/* Search bar */}
      <div className="bg-[#0d1117] border border-gray-800 rounded-2xl p-5 mb-4">
        <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3">🔍 Search Previous Sale</h3>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Enter Bill ID (e.g. -OiAbc123...)..."
            value={billId}
            onChange={e => setBillId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchBill()}
            className="flex-1 bg-[#060a0f] border border-gray-800 text-white rounded-xl px-4 py-2.5 font-mono text-sm focus:border-cyan-500 outline-none placeholder-gray-700"
          />
          <button
            onClick={searchBill}
            disabled={searching}
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black px-5 py-2.5 rounded-xl font-black text-sm transition-all disabled:opacity-50"
          >
            <Search size={16} />
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>
        {searchError && <p className="mt-3 text-red-400 text-sm font-bold">{searchError}</p>}
      </div>

      {/* Bill result */}
      {sale && (
        <div className="bg-[#0d1117] border border-gray-800 rounded-2xl overflow-hidden">
          <div className="flex justify-between items-center px-5 py-3 bg-[#060a0f] border-b border-gray-800">
            <div>
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Bill: </span>
              <span className="font-mono text-white text-sm">{sale.billId || sale.id}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wider ${
                sale.status === 'returned' ? 'bg-red-500/20 text-red-400' :
                sale.status === 'partial_return' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-green-500/20 text-green-400'
              }`}>{sale.status}</span>
              <span className="text-gray-600 text-xs">{new Date(sale.created_at).toLocaleString()}</span>
            </div>
          </div>

          <div className="divide-y divide-gray-800/50">
            {(sale.items || []).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02]">
                <div>
                  <div className={`text-sm font-bold ${item.price === 0 ? 'line-through text-gray-600' : 'text-white'}`}>
                    {item.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {item.quantity}× — Rs. {(item.price || 0).toFixed(2)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-black text-sm text-white">
                    Rs. {((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                  </span>
                  {(item.price || 0) > 0 ? (
                    <button
                      onClick={() => setReturnModal({ itemIdx: idx, item })}
                      className="flex items-center gap-1 border border-red-500/50 text-red-400 hover:bg-red-500/10 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    >
                      <RotateCcw size={12} /> Return
                    </button>
                  ) : (
                    <span className="text-xs text-gray-600 font-bold">Returned</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center px-5 py-3 border-t border-gray-800 bg-[#060a0f]">
            <span className="text-gray-500 text-xs font-bold uppercase">Total</span>
            <span className="font-mono font-black text-white">Rs. {(sale.total || 0).toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Return type modal */}
      {returnModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d1117] border border-gray-700 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-white">↩ Process Return</h3>
              <button onClick={() => setReturnModal(null)} className="text-gray-600 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="bg-[#060a0f] rounded-xl p-4 mb-5 text-sm text-gray-300">
              <p>Returning: <strong className="text-white">{returnModal.item.name}</strong></p>
              <p className="mt-1">Qty: {returnModal.item.quantity} · Amount: <strong className="text-red-400">Rs. {(returnModal.item.price || 0).toFixed(2)}</strong></p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                disabled={processing}
                onClick={() => executeReturn('exchange')}
                className="w-full bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/20 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
              >
                🔄 Exchange (Add to Cart as Credit)
              </button>
              <button
                disabled={processing}
                onClick={() => executeReturn('refund')}
                className="w-full bg-red-500/10 border border-red-500/40 text-red-400 hover:bg-red-500/20 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
              >
                💰 Cash Refund (Return Money)
              </button>
            </div>
            <p className="mt-4 text-xs text-yellow-600 font-bold text-center">
              ⚠️ Stock will be restored automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ── SUPPLIER RETURNS ──────────────────────────────────────────────
const SupplierReturns = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ supplier_name: '', item_name: '', quantity: 1, amount: '', reason: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminApi.getSupplierReturns();
      setReturns(res.data || []);
    } catch (e) {
      alert(e.message || 'Failed to load supplier returns.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = returns.filter(r =>
    r.supplier_name?.toLowerCase().includes(searchQ.toLowerCase()) ||
    r.item_name?.toLowerCase().includes(searchQ.toLowerCase())
  );

  const handleSave = async () => {
    if (!form.supplier_name.trim() || !form.item_name.trim()) {
      alert('Supplier name and item name are required.'); return;
    }
    setSaving(true);
    try {
      await adminApi.createSupplierReturn({
        ...form,
        quantity: parseInt(form.quantity) || 1,
        amount: parseFloat(form.amount) || 0,
      });
      setForm({ supplier_name: '', item_name: '', quantity: 1, amount: '', reason: '' });
      setShowForm(false);
      await load();
    } catch (e) {
      alert(e.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this record?')) return;
    try {
      await adminApi.deleteSupplierReturn(id);
      setReturns(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      alert(e.message || 'Failed to delete.');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <input
          type="text"
          placeholder="🔍 Search items, supplier..."
          value={searchQ}
          onChange={e => setSearchQ(e.target.value)}
          className="flex-1 bg-[#060a0f] border border-gray-800 text-white rounded-xl px-4 py-2.5 text-sm focus:border-purple-500 outline-none placeholder-gray-700"
        />
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all"
        >
          <Plus size={16} /> Add Supplier Return
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-600">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-700">
          <Building2 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No supplier returns logged.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(r => (
            <div key={r.id} className="bg-[#0d1117] border border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white text-sm">{r.item_name}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  <span className="text-purple-400 font-bold">{r.supplier_name}</span>
                  {r.reason && <span> · {r.reason}</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-mono font-black text-white text-sm">Rs. {(r.amount || 0).toFixed(2)}</div>
                <div className="text-xs text-gray-600">Qty: {r.quantity}</div>
              </div>
              <div className="text-xs text-gray-700 flex-shrink-0">
                {new Date(r.created_at).toLocaleDateString()}
              </div>
              <button
                onClick={() => handleDelete(r.id)}
                className="text-gray-700 hover:text-red-400 transition-colors flex-shrink-0"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d1117] border border-gray-700 rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-black text-white">🏢 New Supplier Return</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-600 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              {[
                { id: 'supplier_name', label: 'Supplier Name *', type: 'text', placeholder: 'e.g. Samsung Lanka' },
                { id: 'item_name', label: 'Item Name *', type: 'text', placeholder: 'e.g. Galaxy A55 Display' },
                { id: 'quantity', label: 'Quantity', type: 'number', placeholder: '1' },
                { id: 'amount', label: 'Amount (Rs.)', type: 'number', placeholder: '0.00' },
                { id: 'reason', label: 'Reason (optional)', type: 'text', placeholder: 'Defective, wrong item...' },
              ].map(f => (
                <div key={f.id}>
                  <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={form[f.id]}
                    onChange={e => setForm(prev => ({ ...prev, [f.id]: e.target.value }))}
                    className="mt-1 w-full bg-[#060a0f] border border-gray-800 text-white rounded-xl px-4 py-2.5 text-sm focus:border-purple-500 outline-none placeholder-gray-700"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 bg-[#060a0f] border border-gray-800 text-gray-400 py-3 rounded-xl font-bold text-sm hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
              >
                {saving ? 'Saving...' : '💾 Save Return'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── MAIN RETURNS PAGE ─────────────────────────────────────────────
const Returns = () => {
  const [activeTab, setActiveTab] = useState('customer');

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="mb-6">
        <h2 className="text-3xl font-extrabold text-white flex items-center gap-2">
          <RotateCcw className="text-yellow-400" size={28} />
          Returns <span className="text-yellow-400">Management</span>
        </h2>
        <p className="text-gray-500 mt-1 font-medium">Process customer refunds/exchanges and log supplier returns.</p>
      </div>

      {/* Tab switcher */}
      <div className="flex bg-[#0a0a0a] border border-gray-800 rounded-xl p-1 mb-6 w-fit">
        {[
          { id: 'customer', label: '🛒 Customer Returns' },
          { id: 'supplier', label: '🏢 Supplier Returns' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-yellow-500/20 text-yellow-400 shadow' : 'text-gray-500 hover:text-white'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'customer' ? <CustomerReturns /> : <SupplierReturns />}
    </div>
  );
};

export default Returns;
