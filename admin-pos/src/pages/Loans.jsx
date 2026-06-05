import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BookOpen, Search, Plus, X, Camera, ChevronRight, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import adminApi from '../utils/adminApi';

// ─── helpers ──────────────────────────────────────────────────────
const esc = s => String(s || '');
const fmt = n => Number(n || 0).toFixed(2);
const isOverdue = (loan) => {
  if (loan.status === 'cleared' || (loan.totalAmount - loan.paidAmount) <= 0) return false;
  if (loan.installments?.length) return loan.installments.some(i => !i.paid && new Date(i.dueDate) < new Date());
  return loan.dueDate && new Date(loan.dueDate) < new Date();
};

// ─── Photo slot ───────────────────────────────────────────────────
const PhotoSlot = ({ label, icon, value, onChange }) => {
  const inputRef = useRef();
  const compress = (file) => {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const max = 600;
          const scale = Math.min(1, max / img.width);
          const c = document.createElement('canvas');
          c.width = img.width * scale; c.height = img.height * scale;
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.82));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };
  const handleFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const data = await compress(file);
    onChange(data);
  };
  const onDrop = e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); };
  const onPaste = e => {
    for (const item of e.clipboardData?.items || []) {
      if (item.type.startsWith('image/')) { handleFile(item.getAsFile()); return; }
    }
  };

  return (
    <div
      onClick={() => !value && inputRef.current.click()}
      onDragOver={e => e.preventDefault()}
      onDrop={onDrop}
      onPaste={onPaste}
      tabIndex={0}
      className={`relative w-28 h-28 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden cursor-pointer transition-all select-none ${value ? 'border-transparent' : 'border-gray-700 hover:border-cyan-500/50 bg-[#060a0f]'}`}
    >
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { handleFile(e.target.files[0]); e.target.value = ''; }} />
      {value ? (
        <>
          <img src={value} alt={label} className="w-full h-full object-cover" />
          <button
            onClick={e => { e.stopPropagation(); onChange(null); }}
            className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
          >✕</button>
        </>
      ) : (
        <div className="text-center text-gray-600 text-xs p-2">
          <div className="text-2xl mb-1">{icon}</div>
          <div className="font-bold">{label}</div>
          <div className="text-[10px] mt-0.5 opacity-60">drag / paste / click</div>
        </div>
      )}
    </div>
  );
};

// ─── Loan Card ────────────────────────────────────────────────────
const LoanCard = ({ loan, currency, onPay, onMarkInstallment, onMarkCleared, onDelete }) => {
  const pct = loan.totalAmount > 0 ? Math.min(100, (loan.paidAmount / loan.totalAmount) * 100) : 0;
  const remaining = loan.totalAmount - loan.paidAmount;
  const cleared = loan.status === 'cleared' || remaining <= 0;
  const overdue = !cleared && isOverdue(loan);
  const borderColor = cleared ? 'border-emerald-500/30' : overdue ? 'border-red-500/30' : 'border-white/10';

  return (
    <div className={`border ${borderColor} bg-[#0a0a0f] rounded-xl p-4 mb-3`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-white text-sm">{esc(loan.description || 'Loan')}</span>
            {cleared && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">Cleared ✓</span>}
            {overdue && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold">⚠ Overdue</span>}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            📅 {new Date(loan.createdAt || loan.created_at).toLocaleDateString()}
            {loan.installments?.length ? ` · ${loan.installments.length} installments` : ' · No installment plan'}
          </div>
          {loan.items && <div className="text-xs text-gray-500 mt-1">🛍 {esc(loan.items)}</div>}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {!cleared && (
            <button onClick={() => onPay(loan)} className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-all">
              💰 Pay
            </button>
          )}
          {!cleared ? (
            <button onClick={() => onMarkCleared(loan.id)} className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-all">
              ✓ Clear
            </button>
          ) : (
            <button onClick={() => onDelete(loan.id)} className="text-gray-700 hover:text-red-400 p-1.5 transition-colors">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Amounts */}
      <div className="grid grid-cols-3 gap-3 mt-3">
        {[['Total', fmt(loan.totalAmount), 'text-white'], ['Paid', fmt(loan.paidAmount), 'text-emerald-400'], ['Remaining', fmt(Math.max(0, remaining)), remaining > 0 ? 'text-red-400' : 'text-emerald-400']].map(([lbl, val, col]) => (
          <div key={lbl} className="text-center bg-[#060a0f] rounded-lg py-2">
            <div className="text-[10px] text-gray-600 font-bold uppercase">{lbl}</div>
            <div className={`font-mono font-black text-sm ${col}`}>{currency} {val}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all" style={{ width: `${pct.toFixed(1)}%` }} />
      </div>
      <div className="text-right text-[10px] text-gray-700 mt-0.5">{pct.toFixed(0)}% paid</div>

      {/* Payment history */}
      {loan.paymentHistory?.length > 0 && (
        <div className="mt-3 border-t border-gray-800/50 pt-3">
          <div className="text-[10px] text-gray-600 font-bold uppercase mb-1">Payment History</div>
          {loan.paymentHistory.slice(-4).reverse().map((p, i) => (
            <div key={i} className="flex justify-between text-xs py-1 border-b border-gray-800/30">
              <span className="text-gray-500">{new Date(p.date).toLocaleDateString()} {p.note ? `— ${p.note}` : ''}</span>
              <span className="font-mono font-bold text-emerald-400">+{currency} {fmt(p.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Installments */}
      {loan.installments?.length > 0 && (
        <div className="mt-3 border-t border-gray-800/50 pt-3">
          <div className="text-[10px] text-gray-600 font-bold uppercase mb-2">📅 Installment Schedule</div>
          {loan.installments.map((inst, i) => {
            const due = new Date(inst.dueDate);
            const daysLeft = Math.ceil((due - new Date()) / (1000 * 60 * 60 * 24));
            let color = 'text-gray-500';
            let badge = due.toLocaleDateString();
            if (inst.paid) { color = 'text-emerald-400'; badge = `✓ Paid ${inst.paidDate ? new Date(inst.paidDate).toLocaleDateString() : ''}`; }
            else if (daysLeft < 0) { color = 'text-red-400'; badge = `⚠ ${Math.abs(daysLeft)}d overdue`; }
            else if (daysLeft <= 7) { color = 'text-yellow-400'; badge = `⏰ Due in ${daysLeft}d`; }
            return (
              <div key={i} className="flex items-center gap-3 py-1.5 border-b border-gray-800/20">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${inst.paid ? 'bg-emerald-500' : daysLeft < 0 ? 'bg-red-500' : daysLeft <= 7 ? 'bg-yellow-500' : 'bg-gray-600'}`} />
                <div className="flex-1 text-xs text-gray-400">Installment {i + 1} — {currency} {fmt(inst.amount)}</div>
                <div className={`text-[10px] font-bold ${color}`}>{badge}</div>
                {!inst.paid && !cleared && (
                  <button onClick={() => onMarkInstallment(loan.id, i)} className="text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 px-2 py-1 rounded font-bold transition-all">
                    ✓
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Main Loans Page ──────────────────────────────────────────────
const Loans = () => {
  const [customers, setCustomers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [activeCustomerId, setActiveCustomerId] = useState(null);
  const [searchQ, setSearchQ] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal states
  const [custModal, setCustModal] = useState(null); // null | 'add' | customerId
  const [loanModal, setLoanModal] = useState(null); // null | { customerId }
  const [payModal, setPayModal] = useState(null);   // null | loan object

  // Forms
  const [custForm, setCustForm] = useState({ name: '', phone: '', address: '', notes: '', photo1: null, photo2: null });
  const [loanForm, setLoanForm] = useState({ description: '', items: '', totalAmount: '', paidAmount: '0', dueDate: '', instCount: '0', instEvery: '1', instStart: '' });
  const [payForm, setPayForm] = useState({ amount: '', note: '', date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);

  const currency = 'Rs.';

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [custsRes, loansRes] = await Promise.all([adminApi.getLoanCustomers(), adminApi.getLoans()]);
      setCustomers(custsRes.data || []);
      setLoans(loansRes.data || []);
    } catch (e) {
      alert(e.message || 'Failed to load loan data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Stats
  const activeLoans = loans.filter(l => l.status !== 'cleared');
  const totalOwed = activeLoans.reduce((s, l) => s + (l.totalAmount - l.paidAmount), 0);
  const overdueCount = activeLoans.filter(l => isOverdue(l)).length;

  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(searchQ.toLowerCase()) ||
    c.phone?.toLowerCase().includes(searchQ.toLowerCase())
  );

  const activeCustomer = customers.find(c => c.id === activeCustomerId);
  const customerLoans = loans.filter(l => l.customerId === activeCustomerId).sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));

  // ── Save Customer ────────────────────────────────────────────────
  const saveCustomer = async () => {
    if (!custForm.name.trim()) { alert('Name required'); return; }
    setSaving(true);
    try {
      if (custModal === 'add') {
        await adminApi.createLoanCustomer(custForm);
      } else {
        await adminApi.updateLoanCustomer(custModal, custForm);
      }
      setCustModal(null);
      await load();
    } catch (e) {
      alert(e.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const openCustModal = (id = null) => {
    const cust = id ? customers.find(c => c.id === id) : null;
    setCustForm(cust ? { name: cust.name || '', phone: cust.phone || '', address: cust.address || '', notes: cust.notes || '', photo1: cust.photo1 || null, photo2: cust.photo2 || null } : { name: '', phone: '', address: '', notes: '', photo1: null, photo2: null });
    setCustModal(id || 'add');
  };

  const deleteCustomer = async (id) => {
    const hasActive = loans.some(l => l.customerId === id && l.status !== 'cleared');
    if (!window.confirm(`${hasActive ? '⚠️ This customer has active loans. ' : ''}Delete customer and all their loans?`)) return;
    try {
      await adminApi.deleteLoanCustomer(id);
      if (activeCustomerId === id) setActiveCustomerId(null);
      await load();
    } catch (e) { alert(e.message || 'Failed to delete.'); }
  };

  // ── Save Loan ────────────────────────────────────────────────────
  const saveLoan = async () => {
    if (!loanModal?.customerId) return;
    const total = parseFloat(loanForm.totalAmount) || 0;
    if (!total) { alert('Enter loan amount'); return; }
    const initPay = parseFloat(loanForm.paidAmount) || 0;
    const count = parseInt(loanForm.instCount) || 0;
    const every = parseInt(loanForm.instEvery) || 1;
    const startStr = loanForm.instStart;
    let installments = [];
    if (count > 0 && startStr) {
      const instAmt = (total - initPay) / count;
      for (let i = 0; i < count; i++) {
        const d = new Date(startStr);
        d.setMonth(d.getMonth() + i * every);
        installments.push({ dueDate: d.toISOString().split('T')[0], amount: parseFloat(instAmt.toFixed(2)), paid: false });
      }
    }
    setSaving(true);
    try {
      await adminApi.createLoan({
        customerId: loanModal.customerId,
        description: loanForm.description || 'Loan',
        items: loanForm.items || null,
        totalAmount: total,
        paidAmount: initPay,
        dueDate: loanForm.dueDate || null,
        installments,
      });
      setLoanModal(null);
      setLoanForm({ description: '', items: '', totalAmount: '', paidAmount: '0', dueDate: '', instCount: '0', instEvery: '1', instStart: '' });
      await load();
    } catch (e) {
      alert(e.message || 'Failed to save loan.');
    } finally {
      setSaving(false);
    }
  };

  // ── Record Payment ───────────────────────────────────────────────
  const recordPayment = async () => {
    if (!payModal) return;
    const amt = parseFloat(payForm.amount) || 0;
    if (!amt) { alert('Enter payment amount'); return; }
    setSaving(true);
    try {
      await adminApi.recordLoanPayment(payModal.id, { amount: amt, note: payForm.note, date: payForm.date });
      setPayModal(null);
      setPayForm({ amount: '', note: '', date: new Date().toISOString().split('T')[0] });
      await load();
    } catch (e) {
      alert(e.message || 'Failed to record payment.');
    } finally {
      setSaving(false);
    }
  };

  const markInstallmentPaid = async (loanId, idx) => {
    try {
      await adminApi.markInstallmentPaid(loanId, idx);
      await load();
    } catch (e) { alert(e.message || 'Failed.'); }
  };

  const markCleared = async (loanId) => {
    if (!window.confirm('Mark this loan as fully cleared?')) return;
    try {
      await adminApi.updateLoan(loanId, { status: 'cleared' });
      await load();
    } catch (e) { alert(e.message || 'Failed.'); }
  };

  const deleteLoan = async (loanId) => {
    if (!window.confirm('Remove this loan record permanently?')) return;
    try {
      await adminApi.deleteLoan(loanId);
      await load();
    } catch (e) { alert(e.message || 'Failed.'); }
  };

  const defaultInstStart = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── LEFT: Customer List ──────────────────────── */}
      <div className="w-72 flex-shrink-0 border-r border-gray-800/50 flex flex-col bg-[#060a0f]">
        {/* Stats strip */}
        <div className="px-4 py-3 border-b border-gray-800/50 grid grid-cols-3 gap-2">
          <div className="text-center">
            <div className="text-[10px] text-gray-600 font-bold uppercase">Owed</div>
            <div className="font-mono font-black text-red-400 text-sm">{currency} {fmt(totalOwed)}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-gray-600 font-bold uppercase">Active</div>
            <div className="font-black text-white text-sm">{activeLoans.length}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-gray-600 font-bold uppercase">Overdue</div>
            <div className={`font-black text-sm ${overdueCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{overdueCount}</div>
          </div>
        </div>

        {/* Search + Add */}
        <div className="p-3 border-b border-gray-800/50 flex gap-2">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-2.5 text-gray-600" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-[#0a0a0a] border border-gray-800 text-white rounded-lg text-xs focus:border-cyan-500 outline-none placeholder-gray-700"
            />
          </div>
          <button onClick={() => openCustModal()} className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 p-2 rounded-lg transition-all">
            <Plus size={16} />
          </button>
        </div>

        {/* Customer list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-600 text-xs">Loading...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-10 text-gray-700 text-xs px-4">
              <BookOpen size={28} className="mx-auto mb-2 opacity-30" />
              <p>No customers yet.<br />Add a customer to start.</p>
            </div>
          ) : filteredCustomers.map(c => {
            const cLoans = loans.filter(l => l.customerId === c.id && l.status !== 'cleared');
            const owed = cLoans.reduce((s, l) => s + (l.totalAmount - l.paidAmount), 0);
            const hasOverdue = cLoans.some(l => isOverdue(l));
            const isActive = activeCustomerId === c.id;
            return (
              <div
                key={c.id}
                onClick={() => setActiveCustomerId(c.id)}
                className={`flex items-center gap-3 px-3 py-3 cursor-pointer border-b border-gray-800/30 transition-all ${isActive ? 'bg-cyan-500/10 border-l-2 border-l-cyan-500' : 'hover:bg-white/[0.02]'}`}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-600 to-purple-600 flex items-center justify-center font-black text-sm text-white flex-shrink-0">
                  {(c.name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white text-sm truncate">{c.name}</div>
                  <div className="text-xs text-gray-600 truncate">{c.phone || '—'}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`text-xs font-bold font-mono ${owed > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {owed > 0 ? `${currency} ${fmt(owed)}` : '✓'}
                  </div>
                  {hasOverdue && <div className="text-[9px] text-red-500 font-bold">⚠ OVERDUE</div>}
                  <div className="text-[9px] text-gray-700">{cLoans.length} loan{cLoans.length !== 1 ? 's' : ''}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT: Customer Detail ───────────────────── */}
      <div className="flex-1 overflow-y-auto p-5">
        {!activeCustomer ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-700">
            <BookOpen size={48} className="mb-4 opacity-20" />
            <p className="text-sm">Select a customer to view loans</p>
          </div>
        ) : (
          <>
            {/* Customer header */}
            <div className="bg-[#0a0a0f] border border-gray-800 rounded-2xl p-4 mb-4 flex items-start gap-4">
              <div className="flex gap-2 flex-shrink-0">
                {(activeCustomer.photo1 || activeCustomer.photo2) ? (
                  <>
                    {activeCustomer.photo1 && <img src={activeCustomer.photo1} alt="ID" className="w-14 h-14 rounded-xl object-cover border border-gray-700" />}
                    {activeCustomer.photo2 && <img src={activeCustomer.photo2} alt="Photo" className="w-14 h-14 rounded-xl object-cover border border-gray-700" />}
                  </>
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-600 to-purple-600 flex items-center justify-center font-black text-2xl text-white">
                    {(activeCustomer.name || '?')[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xl font-black text-white">{activeCustomer.name}</div>
                <div className="text-sm text-gray-500 mt-0.5">
                  📞 {activeCustomer.phone || '—'} &nbsp;·&nbsp; 🏠 {activeCustomer.address || '—'}
                </div>
                {activeCustomer.notes && <div className="text-xs text-gray-600 mt-1">📝 {activeCustomer.notes}</div>}
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <button onClick={() => setLoanModal({ customerId: activeCustomer.id })} className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-all">
                  ➕ New Loan
                </button>
                <button onClick={() => openCustModal(activeCustomer.id)} className="bg-[#0a0a0a] border border-gray-800 text-gray-400 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all">
                  ✏️ Edit
                </button>
                <button onClick={() => deleteCustomer(activeCustomer.id)} className="text-gray-700 hover:text-red-400 p-1.5 transition-colors self-end">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Loans header */}
            <div className="text-xs text-gray-600 font-bold uppercase tracking-wider mb-3">
              LOANS ({customerLoans.length})
            </div>

            {customerLoans.length === 0 ? (
              <div className="text-center py-10 text-gray-700 text-sm border border-gray-800 border-dashed rounded-xl">
                No loans yet for this customer.
              </div>
            ) : customerLoans.map(loan => (
              <LoanCard
                key={loan.id}
                loan={loan}
                currency={currency}
                onPay={l => { setPayModal(l); setPayForm({ amount: '', note: '', date: new Date().toISOString().split('T')[0] }); }}
                onMarkInstallment={markInstallmentPaid}
                onMarkCleared={markCleared}
                onDelete={deleteLoan}
              />
            ))}
          </>
        )}
      </div>

      {/* ══ CUSTOMER FORM MODAL ══════════════════════════════════════ */}
      {custModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d1117] border border-gray-700 rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-black text-white">{custModal === 'add' ? '👤 Add Customer' : '✏️ Edit Customer'}</h3>
              <button onClick={() => setCustModal(null)} className="text-gray-600 hover:text-white"><X size={20} /></button>
            </div>

            {/* Photo slots */}
            <div className="flex gap-3 mb-4">
              <PhotoSlot label="ID Photo" icon="🪪" value={custForm.photo1} onChange={v => setCustForm(p => ({ ...p, photo1: v }))} />
              <PhotoSlot label="Photo 2" icon="📷" value={custForm.photo2} onChange={v => setCustForm(p => ({ ...p, photo2: v }))} />
            </div>

            <div className="space-y-3">
              {[
                { id: 'name', label: 'Full Name *', type: 'text', placeholder: 'Customer name' },
                { id: 'phone', label: 'Phone', type: 'tel', placeholder: '07X XXXXXXX' },
                { id: 'address', label: 'Address', type: 'text', placeholder: 'Address' },
              ].map(f => (
                <div key={f.id}>
                  <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} value={custForm[f.id]} onChange={e => setCustForm(p => ({ ...p, [f.id]: e.target.value }))}
                    className="mt-1 w-full bg-[#060a0f] border border-gray-800 text-white rounded-xl px-4 py-2.5 text-sm focus:border-cyan-500 outline-none placeholder-gray-700" />
                </div>
              ))}
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Notes</label>
                <textarea value={custForm.notes} onChange={e => setCustForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                  className="mt-1 w-full bg-[#060a0f] border border-gray-800 text-white rounded-xl px-4 py-2.5 text-sm focus:border-cyan-500 outline-none resize-none placeholder-gray-700" />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setCustModal(null)} className="flex-1 bg-[#060a0f] border border-gray-800 text-gray-400 py-3 rounded-xl font-bold text-sm hover:text-white">Cancel</button>
              <button onClick={saveCustomer} disabled={saving} className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-black py-3 rounded-xl font-black text-sm disabled:opacity-50">
                {saving ? 'Saving...' : '💾 Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ NEW LOAN MODAL ═══════════════════════════════════════════ */}
      {loanModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d1117] border border-gray-700 rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-black text-white">💳 New Loan</h3>
              <button onClick={() => setLoanModal(null)} className="text-gray-600 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              {[
                { id: 'description', label: 'Description *', type: 'text', placeholder: 'e.g. Samsung A55, charger...' },
                { id: 'items', label: 'Items Borrowed (details)', type: 'text', placeholder: 'Optional details' },
              ].map(f => (
                <div key={f.id}>
                  <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} value={loanForm[f.id]} onChange={e => setLoanForm(p => ({ ...p, [f.id]: e.target.value }))}
                    className="mt-1 w-full bg-[#060a0f] border border-gray-800 text-white rounded-xl px-4 py-2.5 text-sm focus:border-cyan-500 outline-none placeholder-gray-700" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                {[{ id: 'totalAmount', label: `Total Loan (${currency}) *`, placeholder: '0.00' }, { id: 'paidAmount', label: `Initial Payment (${currency})`, placeholder: '0.00' }].map(f => (
                  <div key={f.id}>
                    <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">{f.label}</label>
                    <input type="number" min="0" step="0.5" placeholder={f.placeholder} value={loanForm[f.id]} onChange={e => setLoanForm(p => ({ ...p, [f.id]: e.target.value }))}
                      className="mt-1 w-full bg-[#060a0f] border border-gray-800 text-white rounded-xl px-4 py-2.5 text-sm focus:border-cyan-500 outline-none placeholder-gray-700" />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Simple Due Date (optional)</label>
                <input type="date" value={loanForm.dueDate} onChange={e => setLoanForm(p => ({ ...p, dueDate: e.target.value }))}
                  className="mt-1 w-full bg-[#060a0f] border border-gray-800 text-white rounded-xl px-4 py-2.5 text-sm focus:border-cyan-500 outline-none" />
              </div>

              <div className="border-t border-gray-800/50 pt-3">
                <div className="text-sm font-bold text-cyan-400 mb-3">📅 Installment Plan (optional)</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">No. of Installments</label>
                    <input type="number" min="0" max="60" value={loanForm.instCount} onChange={e => setLoanForm(p => ({ ...p, instCount: e.target.value }))}
                      placeholder="0 = no plan"
                      className="mt-1 w-full bg-[#060a0f] border border-gray-800 text-white rounded-xl px-4 py-2.5 text-sm focus:border-cyan-500 outline-none placeholder-gray-700" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Every (months)</label>
                    <input type="number" min="1" max="12" value={loanForm.instEvery} onChange={e => setLoanForm(p => ({ ...p, instEvery: e.target.value }))}
                      className="mt-1 w-full bg-[#060a0f] border border-gray-800 text-white rounded-xl px-4 py-2.5 text-sm focus:border-cyan-500 outline-none" />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">First Installment Date</label>
                  <input type="date" defaultValue={defaultInstStart} value={loanForm.instStart || defaultInstStart} onChange={e => setLoanForm(p => ({ ...p, instStart: e.target.value }))}
                    className="mt-1 w-full bg-[#060a0f] border border-gray-800 text-white rounded-xl px-4 py-2.5 text-sm focus:border-cyan-500 outline-none" />
                </div>
                {parseInt(loanForm.instCount) > 0 && parseFloat(loanForm.totalAmount) > 0 && (
                  <div className="mt-2 text-xs text-cyan-400 bg-cyan-500/10 px-3 py-2 rounded-lg">
                    ✅ {loanForm.instCount} installments of {currency} {((parseFloat(loanForm.totalAmount) - (parseFloat(loanForm.paidAmount) || 0)) / parseInt(loanForm.instCount)).toFixed(2)} each, every {loanForm.instEvery} month(s)
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setLoanModal(null)} className="flex-1 bg-[#060a0f] border border-gray-800 text-gray-400 py-3 rounded-xl font-bold text-sm hover:text-white">Cancel</button>
              <button onClick={saveLoan} disabled={saving} className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-black py-3 rounded-xl font-black text-sm disabled:opacity-50">
                {saving ? 'Saving...' : '💾 Create Loan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ PAYMENT MODAL ════════════════════════════════════════════ */}
      {payModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d1117] border border-gray-700 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-white">💰 Record Payment</h3>
              <button onClick={() => setPayModal(null)} className="text-gray-600 hover:text-white"><X size={20} /></button>
            </div>
            <div className="bg-[#060a0f] rounded-xl p-4 mb-4 text-sm">
              <div className="font-bold text-white">{payModal.description || 'Loan'}</div>
              <div className="text-gray-500 mt-1">Remaining: <strong className="text-red-400">{currency} {fmt(payModal.totalAmount - payModal.paidAmount)}</strong></div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Payment Amount ({currency}) *</label>
                <input autoFocus type="number" min="0.01" step="0.5" placeholder={fmt(payModal.totalAmount - payModal.paidAmount)} value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))}
                  className="mt-1 w-full bg-[#060a0f] border border-gray-800 text-white rounded-xl px-4 py-2.5 text-sm focus:border-cyan-500 outline-none placeholder-gray-700" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Note (optional)</label>
                <input type="text" placeholder="e.g. Cash, Bank transfer..." value={payForm.note} onChange={e => setPayForm(p => ({ ...p, note: e.target.value }))}
                  className="mt-1 w-full bg-[#060a0f] border border-gray-800 text-white rounded-xl px-4 py-2.5 text-sm focus:border-cyan-500 outline-none placeholder-gray-700" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Date</label>
                <input type="date" value={payForm.date} onChange={e => setPayForm(p => ({ ...p, date: e.target.value }))}
                  className="mt-1 w-full bg-[#060a0f] border border-gray-800 text-white rounded-xl px-4 py-2.5 text-sm focus:border-cyan-500 outline-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setPayModal(null)} className="flex-1 bg-[#060a0f] border border-gray-800 text-gray-400 py-3 rounded-xl font-bold text-sm hover:text-white">Cancel</button>
              <button onClick={recordPayment} disabled={saving} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-xl font-black text-sm disabled:opacity-50">
                {saving ? 'Saving...' : '✅ Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Loans;
