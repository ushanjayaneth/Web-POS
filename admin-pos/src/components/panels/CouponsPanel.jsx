import React, { useState, useEffect, useCallback } from 'react';
import adminApi from '../../utils/adminApi';

const emptyForm = {
  code: '', type: 'percentage', value: '', min_order: '', max_uses: '', expires_at: '',
};

const CouponModal = ({ initial, onSave, onClose }) => {
  const [form, setForm] = useState(initial || emptyForm);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.code || !form.value) { alert('Code and Value are required.'); return; }
    setSaving(true);
    try {
      const payload = {
        code: form.code.toUpperCase(),
        type: form.type,
        value: Number(form.value),
        min_order: form.min_order ? Number(form.min_order) : 0,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      };
      if (initial?.id) {
        await adminApi.updateCoupon(initial.id, payload);
      } else {
        await adminApi.createCoupon(payload);
      }
      onSave();
    } catch (err) { alert('Failed: ' + err.message); }
    setSaving(false);
  };

  const inputStyle = {
    width:'100%', background:'#0f172a', color:'#e2e8f0', border:'1px solid #334155',
    borderRadius:8, padding:'10px 12px', fontSize:14, boxSizing:'border-box', outline:'none',
  };
  const labelStyle = { display:'block', color:'#94a3b8', fontSize:12, fontWeight:700,
    marginBottom:4, textTransform:'uppercase' };

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.7)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:999,
    }}>
      <div style={{ background:'#1e293b', borderRadius:16, padding:28, width:460, boxShadow:'0 25px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
          <h3 style={{ margin:0, color:'#f1f5f9', fontSize:18 }}>
            {initial?.id ? 'Edit Coupon' : 'Create New Coupon'}
          </h3>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:'#94a3b8', fontSize:20, cursor:'pointer' }}>✕</button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <div style={{ gridColumn:'1/-1' }}>
            <label style={labelStyle}>Coupon Code *</label>
            <input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())}
              placeholder="e.g. SAVE20" style={inputStyle} disabled={!!initial?.id} />
          </div>
          <div>
            <label style={labelStyle}>Discount Type *</label>
            <select value={form.type} onChange={e => set('type', e.target.value)} style={{ ...inputStyle, cursor:'pointer' }}>
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount (Rs.)</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Value *</label>
            <input type="number" value={form.value} onChange={e => set('value', e.target.value)}
              placeholder={form.type === 'percentage' ? '20' : '500'} style={inputStyle} min="0.01" step="0.01" />
          </div>
          <div>
            <label style={labelStyle}>Min Order (Rs.)</label>
            <input type="number" value={form.min_order} onChange={e => set('min_order', e.target.value)}
              placeholder="0" style={inputStyle} min="0" />
          </div>
          <div>
            <label style={labelStyle}>Max Uses</label>
            <input type="number" value={form.max_uses} onChange={e => set('max_uses', e.target.value)}
              placeholder="Unlimited" style={inputStyle} min="1" />
          </div>
          <div style={{ gridColumn:'1/-1' }}>
            <label style={labelStyle}>Expires At</label>
            <input type="datetime-local" value={form.expires_at} onChange={e => set('expires_at', e.target.value)}
              style={inputStyle} />
          </div>
        </div>

        {/* Preview */}
        {form.code && form.value && (
          <div style={{
            marginTop:16, padding:'10px 14px', background:'#0f172a',
            borderRadius:8, border:'1px solid #334155',
          }}>
            <span style={{ color:'#94a3b8', fontSize:12 }}>Preview: </span>
            <strong style={{ color:'#6366f1', letterSpacing:2 }}>{form.code}</strong>
            <span style={{ color:'#e2e8f0', marginLeft:8 }}>
              — {form.type === 'percentage' ? `${form.value}% off` : `Rs. ${form.value} off`}
              {form.min_order ? ` (min Rs. ${form.min_order})` : ''}
              {form.max_uses ? ` | ${form.max_uses} uses` : ''}
            </span>
          </div>
        )}

        <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{
            padding:'10px 22px', borderRadius:8, border:'1px solid #475569',
            background:'transparent', color:'#94a3b8', cursor:'pointer', fontWeight:600,
          }}>Cancel</button>
          <button onClick={submit} disabled={saving} style={{
            padding:'10px 22px', borderRadius:8, border:'none',
            background:'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color:'#fff', cursor:'pointer', fontWeight:700, opacity: saving ? 0.7 : 1,
          }}>
            {saving ? 'Saving…' : initial?.id ? 'Update Coupon' : 'Create Coupon'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function CouponsPanel() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalData, setModalData] = useState(null); // null | {} | existing coupon
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getCoupons();
      if (res.success) setCoupons(res.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = coupons.filter(c => {
    const q = search.toLowerCase();
    return !q || c.code?.toLowerCase().includes(q);
  });

  const toggleActive = async (c) => {
    try {
      await adminApi.updateCoupon(c.id, { is_active: c.is_active ? 0 : 1 });
      load();
    } catch {}
  };

  const deleteCoupon = async (c) => {
    if (!window.confirm(`Delete coupon "${c.code}"?`)) return;
    try {
      await adminApi.deleteCoupon(c.id);
      load();
    } catch (err) { alert('Failed: ' + err.message); }
  };

  const styles = {
    th: { textAlign:'left', padding:'10px 14px', color:'#64748b', fontSize:12,
      fontWeight:700, textTransform:'uppercase', borderBottom:'1px solid #1e293b' },
    td: { padding:'12px 14px', color:'#e2e8f0', fontSize:14, borderBottom:'1px solid #1e293b17' },
  };

  const isExpired = (c) => c.expires_at && c.expires_at < Date.now();
  const isExhausted = (c) => c.max_uses && c.uses_count >= c.max_uses;

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
      <div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid #334155',
        borderTopColor:'#6366f1', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div>
      {/* top row */}
      <div style={{ display:'flex', gap:10, marginBottom:20, alignItems:'center', flexWrap:'wrap' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search coupon code…"
          style={{ flex:1, minWidth:200, padding:'10px 14px', borderRadius:10,
            background:'#1e293b', border:'1px solid #334155', color:'#e2e8f0', fontSize:14, outline:'none' }}
        />
        <button onClick={load} style={{
          padding:'10px 16px', borderRadius:10, border:'1px solid #334155',
          background:'transparent', color:'#94a3b8', cursor:'pointer', fontWeight:600,
        }}>↻ Refresh</button>
        <button onClick={() => setModalData({})} style={{
          padding:'10px 20px', borderRadius:10, border:'none',
          background:'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color:'#fff', cursor:'pointer', fontWeight:700, fontSize:14,
        }}>+ New Coupon</button>
      </div>

      {/* Stats */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        {[
          { label:'Total', value:coupons.length, color:'#6366f1' },
          { label:'Active', value:coupons.filter(c => c.is_active && !isExpired(c) && !isExhausted(c)).length, color:'#10b981' },
          { label:'Expired', value:coupons.filter(isExpired).length, color:'#ef4444' },
          { label:'Exhausted', value:coupons.filter(isExhausted).length, color:'#f59e0b' },
        ].map(s => (
          <div key={s.label} style={{
            flex:1, minWidth:100, background:'#1e293b', borderRadius:10,
            padding:'12px 16px', borderLeft:`4px solid ${s.color}`,
          }}>
            <div style={{ color:'#64748b', fontSize:12, fontWeight:700, marginBottom:2 }}>{s.label}</div>
            <div style={{ color:s.color, fontSize:22, fontWeight:800 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{ textAlign:'center', color:'#64748b', padding:48 }}>
          No coupons found. <button onClick={() => setModalData({})} style={{
            background:'none', border:'none', color:'#6366f1', cursor:'pointer', fontWeight:700, fontSize:14,
          }}>Create one →</button>
        </div>
      ) : (
        <div style={{ overflowX:'auto', borderRadius:12, background:'#1e293b' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['Code', 'Type & Value', 'Min Order', 'Uses', 'Expires', 'Status', 'Actions'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const expired = isExpired(c);
                const exhausted = isExhausted(c);
                const effectiveStatus = expired ? 'expired' : exhausted ? 'exhausted' : c.is_active ? 'active' : 'disabled';
                const statusMeta = {
                  active:    { bg:'#10b98122', color:'#10b981', label:'Active' },
                  disabled:  { bg:'#64748b22', color:'#94a3b8', label:'Disabled' },
                  expired:   { bg:'#ef444422', color:'#ef4444', label:'Expired' },
                  exhausted: { bg:'#f59e0b22', color:'#f59e0b', label:'Exhausted' },
                }[effectiveStatus];

                return (
                  <tr key={c.id}
                    onMouseEnter={e => e.currentTarget.style.background='#ffffff08'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}
                  >
                    <td style={styles.td}>
                      <span style={{
                        fontFamily:'monospace', fontWeight:800, fontSize:15,
                        color:'#6366f1', letterSpacing:1,
                      }}>{c.code}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ color:'#f1f5f9', fontWeight:700 }}>
                        {c.type === 'percentage' ? `${c.value}%` : `Rs. ${c.value}`}
                      </span>
                      <div style={{ fontSize:11, color:'#64748b', textTransform:'capitalize' }}>{c.type}</div>
                    </td>
                    <td style={styles.td}>
                      {c.min_order ? `Rs. ${c.min_order.toLocaleString()}` : '—'}
                    </td>
                    <td style={styles.td}>
                      <span style={{ color:'#e2e8f0' }}>{c.uses_count || 0}</span>
                      {c.max_uses && <span style={{ color:'#64748b' }}> / {c.max_uses}</span>}
                    </td>
                    <td style={{ ...styles.td, fontSize:12, color: expired ? '#ef4444' : '#94a3b8' }}>
                      {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'No expiry'}
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        background:statusMeta.bg, color:statusMeta.color,
                        padding:'2px 10px', borderRadius:20, fontSize:12, fontWeight:700,
                      }}>{statusMeta.label}</span>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        <button onClick={() => setModalData(c)} style={{
                          padding:'5px 12px', borderRadius:6, border:'none',
                          background:'#334155', color:'#e2e8f0', cursor:'pointer', fontWeight:600, fontSize:13,
                        }}>Edit</button>
                        <button onClick={() => toggleActive(c)} style={{
                          padding:'5px 12px', borderRadius:6, border:'none',
                          background: c.is_active ? '#64748b' : '#10b981',
                          color:'#fff', cursor:'pointer', fontWeight:600, fontSize:13,
                        }}>{c.is_active ? 'Disable' : 'Enable'}</button>
                        <button onClick={() => deleteCoupon(c)} style={{
                          padding:'5px 12px', borderRadius:6, border:'none',
                          background:'#ef4444', color:'#fff', cursor:'pointer', fontWeight:600, fontSize:13,
                        }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalData !== null && (
        <CouponModal
          initial={modalData.id ? modalData : null}
          onSave={() => { setModalData(null); load(); }}
          onClose={() => setModalData(null)}
        />
      )}
    </div>
  );
}
