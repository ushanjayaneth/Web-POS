import React, { useState, useEffect, useCallback } from 'react';
import adminApi from '../../utils/adminApi';

/* ─── tiny helpers ─── */
const badge = {
  pending:  { bg: '#f59e0b22', color: '#f59e0b', label: 'Pending' },
  approved: { bg: '#10b98122', color: '#10b981', label: 'Approved' },
  rejected: { bg: '#ef444422', color: '#ef4444', label: 'Rejected' },
  banned:   { bg: '#8b5cf622', color: '#8b5cf6', label: 'Banned'  },
};
const StatusBadge = ({ status }) => {
  const s = badge[status] || badge.pending;
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
      whiteSpace: 'nowrap',
    }}>{s.label}</span>
  );
};

const approvalBadge = {
  pending:  { bg: '#f59e0b22', color: '#f59e0b', label: '⏳ Pending' },
  approved: { bg: '#10b98122', color: '#10b981', label: '✅ Approved' },
  rejected: { bg: '#ef444422', color: '#ef4444', label: '❌ Rejected' },
};

/* ─── Modal for reason input ─── */
const ReasonModal = ({ title, onConfirm, onCancel }) => {
  const [reason, setReason] = useState('');
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 16,
    }}>
      <div style={{
        background: '#1e293b', borderRadius: 16, padding: 24,
        width: '100%', maxWidth: 420, boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
      }}>
        <h3 style={{ margin: '0 0 16px', color: '#f1f5f9', fontSize: 16 }}>{title}</h3>
        <textarea
          value={reason} onChange={e => setReason(e.target.value)}
          placeholder="Enter reason (min 5 characters)..."
          rows={3}
          style={{
            width: '100%', background: '#0f172a', color: '#e2e8f0',
            border: '1px solid #334155', borderRadius: 8, padding: '10px 12px',
            resize: 'vertical', fontSize: 14, boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            padding: '8px 20px', borderRadius: 8, border: '1px solid #475569',
            background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 600,
          }}>Cancel</button>
          <button
            onClick={() => reason.trim().length >= 5 && onConfirm(reason.trim())}
            disabled={reason.trim().length < 5}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none',
              background: reason.trim().length >= 5 ? '#ef4444' : '#475569',
              color: '#fff', cursor: reason.trim().length >= 5 ? 'pointer' : 'default',
              fontWeight: 700,
            }}
          >Confirm</button>
        </div>
      </div>
    </div>
  );
};

/* ─── Seller Detail Drawer ─── */
const SellerDrawer = ({ seller, onClose, onAction }) => {
  if (!seller) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', justifyContent: 'flex-end', zIndex: 900,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: '100%', maxWidth: 420, background: '#1e293b', height: '100%',
        overflowY: 'auto', padding: 24, boxShadow: '-8px 0 40px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, color: '#f1f5f9', fontSize: 18 }}>Seller Details</h2>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: '#94a3b8',
            fontSize: 22, cursor: 'pointer',
          }}>✕</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, color: '#fff', fontWeight: 700,
          }}>
            {seller.business_name?.[0]?.toUpperCase() || 'S'}
          </div>
          <div>
            <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 16 }}>{seller.business_name}</div>
            <div style={{ color: '#94a3b8', fontSize: 13 }}>{seller.owner_name}</div>
            <div style={{ marginTop: 4 }}><StatusBadge status={seller.status} /></div>
          </div>
        </div>

        {[
          ['📧 Email', seller.email],
          ['📱 Phone', seller.phone],
          ['🪪 NIC / BR', seller.nic_br],
          ['📍 Address', seller.address],
          ['📅 Registered', seller.created_at ? new Date(seller.created_at).toLocaleString() : '—'],
          ['🏦 Bank', seller.bank_name || '—'],
          ['🔢 Account No', seller.account_number || '—'],
        ].map(([k, v]) => (
          <div key={k} style={{
            display: 'flex', gap: 10, marginBottom: 10,
            padding: '10px 12px', background: '#0f172a', borderRadius: 8,
          }}>
            <span style={{ color: '#64748b', minWidth: 100, fontSize: 12, flexShrink: 0 }}>{k}</span>
            <span style={{ color: '#e2e8f0', fontSize: 13, wordBreak: 'break-all' }}>{v || '—'}</span>
          </div>
        ))}

        {seller.description && (
          <div style={{ padding: '10px 12px', background: '#0f172a', borderRadius: 8, marginBottom: 10 }}>
            <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>Shop Description</div>
            <div style={{ color: '#e2e8f0', fontSize: 13, lineHeight: '1.5' }}>{seller.description}</div>
          </div>
        )}

        {seller.categories && Array.isArray(seller.categories) && seller.categories.length > 0 && (
          <div style={{ padding: '10px 12px', background: '#0f172a', borderRadius: 8, marginBottom: 10 }}>
            <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>Selling Categories</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {seller.categories.map((cat, idx) => (
                <span key={idx} style={{
                  background: '#6366f122', color: '#818cf8', border: '1px solid #6366f133',
                  padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                }}>{cat}</span>
              ))}
            </div>
          </div>
        )}

        {seller.ban_reason && (
          <div style={{
            background: '#ef444422', border: '1px solid #ef444466',
            borderRadius: 8, padding: '10px 12px', marginBottom: 16,
          }}>
            <div style={{ color: '#ef4444', fontSize: 13, fontWeight: 700 }}>Ban Reason</div>
            <div style={{ color: '#fca5a5', fontSize: 13 }}>{seller.ban_reason}</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          {seller.status === 'pending' && (<>
            <button onClick={() => onAction('approve', seller)} style={{
              padding: '12px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 15,
            }}>✅ Approve Seller</button>
            <button onClick={() => onAction('reject', seller)} style={{
              padding: '12px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 15,
            }}>❌ Reject Application</button>
          </>)}
          {seller.status === 'approved' && (
            <button onClick={() => onAction('ban', seller)} style={{
              padding: '12px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 15,
            }}>🚫 Ban Seller</button>
          )}
          {seller.status === 'banned' && (
            <button onClick={() => onAction('unban', seller)} style={{
              padding: '12px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
              color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 15,
            }}>✅ Unban Seller</button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════ */
export default function SellersPanel() {
  const [sellers, setSellers] = useState([]);
  const [sellerProducts, setSellerProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('applications');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [modal, setModal] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sr, spr] = await Promise.all([
        adminApi.getSellers(),
        adminApi.getSellerProducts(),
      ]);
      if (sr.success) setSellers(sr.data);
      if (spr.success) setSellerProducts(spr.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = sellers.filter(s => {
    const matchStatus = filter === 'all' || s.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || s.business_name?.toLowerCase().includes(q)
      || s.email?.toLowerCase().includes(q) || s.owner_name?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const handleAction = async (type, seller, reason) => {
    try {
      if (type === 'approve')         await adminApi.approveSeller(seller.id);
      else if (type === 'reject') {
        if (!reason) { setModal({ type, seller }); return; }
        await adminApi.rejectSeller(seller.id, reason);
      } else if (type === 'ban') {
        if (!reason) { setModal({ type, seller }); return; }
        await adminApi.banSeller(seller.id, reason);
      } else if (type === 'unban')    await adminApi.unbanSeller(seller.id);
      else if (type === 'approve_product') await adminApi.approveProduct(seller.id);
      else if (type === 'reject_product') {
        if (!reason) { setModal({ type, seller }); return; }
        await adminApi.rejectProduct(seller.id, reason);
      }
      setSelectedSeller(null);
      setModal(null);
      load();
    } catch (err) {
      alert('Operation failed: ' + err.message);
    }
  };

  const pendingCount = sellers.filter(s => s.status === 'pending').length;
  const pendingProductsCount = sellerProducts.filter(p => p.approval_status === 'pending').length;

  const S = {
    container: { padding: '0 2px' },
    tabBtn: (active) => ({
      padding: isMobile ? '8px 14px' : '8px 18px',
      borderRadius: 10, border: 'none', cursor: 'pointer',
      background: active ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#1e293b',
      color: active ? '#fff' : '#94a3b8', fontWeight: 700,
      fontSize: isMobile ? 13 : 14, position: 'relative', transition: 'all 0.2s',
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }),
    badge: {
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: 18, height: 18, borderRadius: 9, background: '#ef4444',
      color: '#fff', fontSize: 10, fontWeight: 800, padding: '0 4px',
    },
    input: {
      flex: 1, minWidth: 0, padding: '9px 12px', borderRadius: 10,
      background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0',
      fontSize: 14, outline: 'none',
    },
    select: {
      padding: '9px 12px', borderRadius: 10, flexShrink: 0,
      background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0',
      fontSize: 13, outline: 'none', cursor: 'pointer',
    },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: {
      textAlign: 'left', padding: '10px 14px', color: '#64748b',
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
      borderBottom: '1px solid #334155', whiteSpace: 'nowrap',
    },
    td: { padding: '12px 14px', color: '#e2e8f0', fontSize: 13, borderBottom: '1px solid #1e293b55' },
    actionBtn: (bg) => ({
      padding: '5px 12px', borderRadius: 6, border: 'none',
      background: bg, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 12,
      whiteSpace: 'nowrap',
    }),
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        border: '3px solid #334155', borderTopColor: '#6366f1',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={S.container}>
      <style>{`
        .sp-card{background:#1e293b;border-radius:14px;padding:16px;border:1px solid #334155;margin-bottom:10px;transition:border-color .15s}
        .sp-card:hover{border-color:#6366f1}
        .sp-row{display:flex;justify-content:space-between;align-items:flex-start;padding:5px 0;border-bottom:1px solid #33415533}
        .sp-row:last-of-type{border-bottom:none}
        .sp-label{font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;min-width:72px;padding-right:8px;flex-shrink:0;padding-top:1px}
        .sp-value{font-size:13px;color:#e2e8f0;text-align:right;word-break:break-all}
        .sp-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;padding-top:12px;border-top:1px solid #334155}
        .sp-acts button{flex:1;min-width:80px;padding:9px 8px;border-radius:8px;border:none;font-weight:700;font-size:13px;cursor:pointer;transition:opacity .15s}
        .sp-acts button:hover{opacity:.85}
      `}</style>

      {/* ── Sub-tabs row ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <button style={S.tabBtn(tab === 'applications')} onClick={() => setTab('applications')}>
          {isMobile ? 'Applications' : 'Seller Applications'}
          {pendingCount > 0 && <span style={S.badge}>{pendingCount}</span>}
        </button>
        <button style={S.tabBtn(tab === 'products')} onClick={() => setTab('products')}>
          {isMobile ? 'Products' : 'Product Approvals'}
          {pendingProductsCount > 0 && <span style={S.badge}>{pendingProductsCount}</span>}
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={load} style={{
          padding: '8px 14px', borderRadius: 10, border: '1px solid #334155',
          background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 600, fontSize: 13,
        }}>↻{!isMobile && ' Refresh'}</button>
      </div>

      {/* ═══ APPLICATIONS TAB ═══ */}
      {tab === 'applications' && (<>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search seller…" style={S.input} />
          <select value={filter} onChange={e => setFilter(e.target.value)} style={S.select}>
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="banned">Banned</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: 48, fontSize: 15 }}>No sellers found.</div>
        ) : isMobile ? (
          /* ── MOBILE CARDS ── */
          <div>
            {filtered.map(s => (
              <div key={s.id} className="sp-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, color: '#fff', fontWeight: 700,
                  }}>{s.business_name?.[0]?.toUpperCase() || 'S'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.business_name}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{s.id?.slice(0, 12)}…</div>
                  </div>
                  <StatusBadge status={s.status} />
                </div>

                {[
                  ['Owner',  s.owner_name],
                  ['Email',  s.email],
                  ['Phone',  s.phone],
                  ['Type',   s.business_type || '—'],
                  ['Joined', s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'],
                ].map(([label, val]) => (
                  <div key={label} className="sp-row">
                    <span className="sp-label">{label}</span>
                    <span className="sp-value">{val || '—'}</span>
                  </div>
                ))}

                <div className="sp-acts">
                  <button onClick={() => setSelectedSeller(s)} style={{ background: '#334155', color: '#e2e8f0' }}>
                    Details
                  </button>
                  {s.status === 'pending' && (<>
                    <button onClick={() => handleAction('approve', s)} style={{ background: '#10b981', color: '#fff' }}>✓ Approve</button>
                    <button onClick={() => handleAction('reject', s)} style={{ background: '#ef4444', color: '#fff' }}>✗ Reject</button>
                  </>)}
                  {s.status === 'approved' && (
                    <button onClick={() => handleAction('ban', s)} style={{ background: '#8b5cf6', color: '#fff' }}>🚫 Ban</button>
                  )}
                  {s.status === 'banned' && (
                    <button onClick={() => handleAction('unban', s)} style={{ background: '#0ea5e9', color: '#fff' }}>✅ Unban</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── DESKTOP TABLE ── */
          <div style={{ overflowX: 'auto', borderRadius: 12, background: '#1e293b' }}>
            <table style={S.table}>
              <thead>
                <tr>{['Business','Owner','Contact','Type','Status','Joined','Actions'].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}
                    onMouseEnter={e => e.currentTarget.style.background = '#ffffff08'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={S.td}>
                      <div style={{ fontWeight: 700, color: '#f1f5f9' }}>{s.business_name}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{s.id?.slice(0, 8)}…</div>
                    </td>
                    <td style={S.td}>{s.owner_name}</td>
                    <td style={S.td}>
                      <div>{s.email}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>{s.phone}</div>
                    </td>
                    <td style={S.td}>{s.business_type || '—'}</td>
                    <td style={S.td}><StatusBadge status={s.status} /></td>
                    <td style={{ ...S.td, fontSize: 12, color: '#94a3b8' }}>
                      {s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td style={S.td}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button onClick={() => setSelectedSeller(s)} style={S.actionBtn('#334155')}>Details</button>
                        {s.status === 'pending' && (<>
                          <button onClick={() => handleAction('approve', s)} style={S.actionBtn('#10b981')}>✓ Approve</button>
                          <button onClick={() => handleAction('reject', s)} style={S.actionBtn('#ef4444')}>✗ Reject</button>
                        </>)}
                        {s.status === 'approved' && <button onClick={() => handleAction('ban', s)} style={S.actionBtn('#8b5cf6')}>Ban</button>}
                        {s.status === 'banned' && <button onClick={() => handleAction('unban', s)} style={S.actionBtn('#0ea5e9')}>Unban</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>)}

      {/* ═══ PRODUCT APPROVALS TAB ═══ */}
      {tab === 'products' && (<>
        <div style={{ marginBottom: 12, color: '#94a3b8', fontSize: 13 }}>
          {pendingProductsCount} product(s) awaiting review
        </div>

        {sellerProducts.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: 48 }}>No seller products.</div>
        ) : isMobile ? (
          /* ── MOBILE PRODUCT CARDS ── */
          <div>
            {sellerProducts.map(p => {
              const ab = approvalBadge[p.approval_status] || approvalBadge.pending;
              return (
                <div key={p.id} className="sp-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    {p.cover_image ? (
                      <img src={p.cover_image} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 48, height: 48, borderRadius: 10, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>📦</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <span style={{ background: ab.bg, color: ab.color, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{ab.label}</span>
                    </div>
                  </div>

                  {[
                    ['Seller',    p.seller_name || p.seller_id?.slice(0, 10)],
                    ['Price',     `Rs. ${(p.price || 0).toLocaleString()}`],
                    ['Stock',     p.stock ?? '—'],
                    ['Category',  p.category_slug || '—'],
                    ['Added',     p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'],
                  ].map(([label, val]) => (
                    <div key={label} className="sp-row">
                      <span className="sp-label">{label}</span>
                      <span className="sp-value">{val}</span>
                    </div>
                  ))}

                  {p.approval_status === 'pending' && (
                    <div className="sp-acts">
                      <button onClick={() => handleAction('approve_product', p)} style={{ background: '#10b981', color: '#fff' }}>✓ Approve</button>
                      <button onClick={() => handleAction('reject_product', p)} style={{ background: '#ef4444', color: '#fff' }}>✗ Reject</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* ── DESKTOP PRODUCT TABLE ── */
          <div style={{ overflowX: 'auto', borderRadius: 12, background: '#1e293b' }}>
            <table style={S.table}>
              <thead>
                <tr>{['Product','Seller','Price','Stock','Category','Status','Actions'].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {sellerProducts.map(p => {
                  const ab = approvalBadge[p.approval_status] || approvalBadge.pending;
                  return (
                    <tr key={p.id}
                      onMouseEnter={e => e.currentTarget.style.background = '#ffffff08'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={S.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {p.cover_image && <img src={p.cover_image} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8 }} />}
                          <div>
                            <div style={{ fontWeight: 700, color: '#f1f5f9' }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>Added: {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={S.td}>{p.seller_name || p.seller_id?.slice(0, 10)}</td>
                      <td style={S.td}>Rs. {(p.price || 0).toLocaleString()}</td>
                      <td style={S.td}>{p.stock ?? '—'}</td>
                      <td style={S.td}>{p.category_slug || '—'}</td>
                      <td style={S.td}>
                        <span style={{ background: ab.bg, color: ab.color, padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{ab.label}</span>
                      </td>
                      <td style={S.td}>
                        {p.approval_status === 'pending' ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => handleAction('approve_product', p)} style={S.actionBtn('#10b981')}>✓ Approve</button>
                            <button onClick={() => handleAction('reject_product', p)} style={S.actionBtn('#ef4444')}>✗ Reject</button>
                          </div>
                        ) : <span style={{ color: '#64748b', fontSize: 13 }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </>)}

      {/* Modals */}
      {modal && (
        <ReasonModal
          title={
            modal.type === 'reject' ? 'Reject Seller — Enter Reason' :
            modal.type === 'ban'    ? 'Ban Seller — Enter Reason' :
            'Reject Product — Enter Reason'
          }
          onConfirm={reason => handleAction(modal.type, modal.seller, reason)}
          onCancel={() => setModal(null)}
        />
      )}

      <SellerDrawer
        seller={selectedSeller}
        onClose={() => setSelectedSeller(null)}
        onAction={handleAction}
      />
    </div>
  );
}
