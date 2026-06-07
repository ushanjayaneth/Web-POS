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
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
    }}>
      <div style={{
        background: '#1e293b', borderRadius: 16, padding: 28,
        width: 420, boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
      }}>
        <h3 style={{ margin: '0 0 16px', color: '#f1f5f9' }}>{title}</h3>
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
        width: 420, background: '#1e293b', height: '100%',
        overflowY: 'auto', padding: 28, boxShadow: '-8px 0 40px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, color: '#f1f5f9', fontSize: 20 }}>Seller Details</h2>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: '#94a3b8',
            fontSize: 22, cursor: 'pointer',
          }}>✕</button>
        </div>

        {/* Avatar & Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, color: '#fff', fontWeight: 700, flexShrink: 0,
          }}>
            {seller.business_name?.[0]?.toUpperCase() || 'S'}
          </div>
          <div>
            <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 18 }}>{seller.business_name}</div>
            <div style={{ color: '#94a3b8', fontSize: 13 }}>{seller.owner_name}</div>
            <div style={{ marginTop: 4 }}><StatusBadge status={seller.status} /></div>
          </div>
        </div>

        {/* Info Grid */}
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
            display: 'flex', gap: 10, marginBottom: 12,
            padding: '10px 14px', background: '#0f172a', borderRadius: 8,
          }}>
            <span style={{ color: '#64748b', minWidth: 110, fontSize: 13 }}>{k}</span>
            <span style={{ color: '#e2e8f0', fontSize: 13, wordBreak: 'break-all' }}>{v || '—'}</span>
          </div>
        ))}

        {/* Business Description */}
        {seller.description && (
          <div style={{
            padding: '10px 14px', background: '#0f172a', borderRadius: 8, marginBottom: 12,
          }}>
            <div style={{ color: '#64748b', fontSize: 12, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>Shop Description</div>
            <div style={{ color: '#e2e8f0', fontSize: 13, lineHeight: '1.4' }}>{seller.description}</div>
          </div>
        )}

        {/* Categories to Sell */}
        {seller.categories && Array.isArray(seller.categories) && seller.categories.length > 0 && (
          <div style={{
            padding: '10px 14px', background: '#0f172a', borderRadius: 8, marginBottom: 12,
          }}>
            <div style={{ color: '#64748b', fontSize: 12, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>Selling Categories</div>
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
            borderRadius: 8, padding: '10px 14px', marginBottom: 16,
          }}>
            <div style={{ color: '#ef4444', fontSize: 13, fontWeight: 700 }}>Ban Reason</div>
            <div style={{ color: '#fca5a5', fontSize: 13 }}>{seller.ban_reason}</div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
          {seller.status === 'pending' && (
            <>
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
            </>
          )}
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
  const [tab, setTab] = useState('applications'); // applications | products
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [modal, setModal] = useState(null); // { type, seller }

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

  /* filter sellers */
  const filtered = sellers.filter(s => {
    const matchStatus = filter === 'all' || s.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || s.business_name?.toLowerCase().includes(q)
      || s.email?.toLowerCase().includes(q) || s.owner_name?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  /* action dispatcher */
  const handleAction = async (type, seller, reason) => {
    try {
      if (type === 'approve') {
        await adminApi.approveSeller(seller.id);
        alert('✅ Seller approved!');
      } else if (type === 'reject') {
        if (!reason) { setModal({ type, seller }); return; }
        await adminApi.rejectSeller(seller.id, reason);
        alert('Seller application rejected.');
      } else if (type === 'ban') {
        if (!reason) { setModal({ type, seller }); return; }
        await adminApi.banSeller(seller.id, reason);
        alert('🚫 Seller banned.');
      } else if (type === 'unban') {
        await adminApi.unbanSeller(seller.id);
        alert('✅ Seller unbanned.');
      } else if (type === 'approve_product') {
        await adminApi.approveProduct(seller.id); // seller here is the product
        alert('✅ Product approved and now live.');
      } else if (type === 'reject_product') {
        if (!reason) { setModal({ type, seller }); return; }
        await adminApi.rejectProduct(seller.id, reason);
        alert('Product rejected.');
      }
      setSelectedSeller(null);
      setModal(null);
      load();
    } catch (err) {
      alert('Operation failed: ' + err.message);
    }
  };

  /* counts for tab badges */
  const pendingCount = sellers.filter(s => s.status === 'pending').length;
  const pendingProductsCount = sellerProducts.filter(p => p.approval_status === 'pending').length;

  const styles = {
    container: { padding: '0 4px' },
    topRow: { display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' },
    tabBtn: (active) => ({
      padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
      background: active ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#1e293b',
      color: active ? '#fff' : '#94a3b8', fontWeight: 700, fontSize: 14,
      position: 'relative', transition: 'all 0.2s',
    }),
    badge: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 20, height: 20, borderRadius: '50%', background: '#ef4444',
      color: '#fff', fontSize: 11, fontWeight: 800, marginLeft: 6 },
    input: {
      flex: 1, minWidth: 200, padding: '10px 14px', borderRadius: 10,
      background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0',
      fontSize: 14, outline: 'none',
    },
    select: {
      padding: '10px 14px', borderRadius: 10,
      background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0',
      fontSize: 14, outline: 'none', cursor: 'pointer',
    },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '10px 14px', color: '#64748b', fontSize: 12,
      fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid #1e293b' },
    td: { padding: '12px 14px', color: '#e2e8f0', fontSize: 14,
      borderBottom: '1px solid #1e293b17' },
    actionBtn: (color) => ({
      padding: '5px 14px', borderRadius: 6, border: 'none',
      background: color, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13,
    }),
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%',
        border: '3px solid #334155', borderTopColor: '#6366f1',
        animation: 'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={styles.container}>
      {/* sub-tabs */}
      <div style={styles.topRow}>
        <button style={styles.tabBtn(tab === 'applications')} onClick={() => setTab('applications')}>
          Seller Applications
          {pendingCount > 0 && <span style={styles.badge}>{pendingCount}</span>}
        </button>
        <button style={styles.tabBtn(tab === 'products')} onClick={() => setTab('products')}>
          Product Approvals
          {pendingProductsCount > 0 && <span style={styles.badge}>{pendingProductsCount}</span>}
        </button>

        <div style={{ flex: 1 }} />
        <button onClick={load} style={{
          padding: '10px 16px', borderRadius: 10, border: '1px solid #334155',
          background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 600,
        }}>↻ Refresh</button>
      </div>

      {/* ═══ APPLICATIONS TAB ═══ */}
      {tab === 'applications' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Search seller…" style={styles.input}
            />
            <select value={filter} onChange={e => setFilter(e.target.value)} style={styles.select}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="banned">Banned</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: 48, fontSize: 15 }}>
              No sellers found.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: 12, background: '#1e293b' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {['Business', 'Owner', 'Contact', 'Type', 'Status', 'Joined', 'Actions'].map(h => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id} style={{ cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#ffffff08'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={styles.td}>
                        <div style={{ fontWeight: 700, color: '#f1f5f9' }}>{s.business_name}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{s.id?.slice(0, 8)}…</div>
                      </td>
                      <td style={styles.td}>{s.owner_name}</td>
                      <td style={styles.td}>
                        <div>{s.email}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>{s.phone}</div>
                      </td>
                      <td style={styles.td}>{s.business_type || '—'}</td>
                      <td style={styles.td}><StatusBadge status={s.status} /></td>
                      <td style={styles.td} style={{ ...styles.td, fontSize: 12, color: '#94a3b8' }}>
                        {s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button onClick={() => setSelectedSeller(s)}
                            style={styles.actionBtn('#334155')}>Details</button>
                          {s.status === 'pending' && (
                            <>
                              <button onClick={() => handleAction('approve', s)}
                                style={styles.actionBtn('#10b981')}>✓ Approve</button>
                              <button onClick={() => handleAction('reject', s)}
                                style={styles.actionBtn('#ef4444')}>✗ Reject</button>
                            </>
                          )}
                          {s.status === 'approved' && (
                            <button onClick={() => handleAction('ban', s)}
                              style={styles.actionBtn('#8b5cf6')}>Ban</button>
                          )}
                          {s.status === 'banned' && (
                            <button onClick={() => handleAction('unban', s)}
                              style={styles.actionBtn('#0ea5e9')}>Unban</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ═══ PRODUCT APPROVALS TAB ═══ */}
      {tab === 'products' && (
        <>
          <div style={{ marginBottom: 14, color: '#94a3b8', fontSize: 14 }}>
            {pendingProductsCount} product(s) awaiting review
          </div>
          {sellerProducts.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: 48 }}>No seller products.</div>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: 12, background: '#1e293b' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {['Product', 'Seller', 'Price', 'Stock', 'Category', 'Status', 'Actions'].map(h => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sellerProducts.map(p => {
                    const ab = approvalBadge[p.approval_status] || approvalBadge.pending;
                    return (
                      <tr key={p.id}
                        onMouseEnter={e => e.currentTarget.style.background = '#ffffff08'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={styles.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {p.cover_image && (
                              <img src={p.cover_image} alt="" style={{
                                width: 44, height: 44, objectFit: 'cover',
                                borderRadius: 8, background: '#0f172a',
                              }} />
                            )}
                            <div>
                              <div style={{ fontWeight: 700, color: '#f1f5f9' }}>{p.name}</div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>
                                Added: {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={styles.td}>{p.seller_name || p.seller_id?.slice(0, 10)}</td>
                        <td style={styles.td}>Rs. {(p.price || 0).toLocaleString()}</td>
                        <td style={styles.td}>{p.stock ?? '—'}</td>
                        <td style={styles.td}>{p.category_slug || '—'}</td>
                        <td style={styles.td}>
                          <span style={{
                            background: ab.bg, color: ab.color,
                            padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                          }}>{ab.label}</span>
                        </td>
                        <td style={styles.td}>
                          {p.approval_status === 'pending' && (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => handleAction('approve_product', p)}
                                style={styles.actionBtn('#10b981')}>✓ Approve</button>
                              <button onClick={() => handleAction('reject_product', p)}
                                style={styles.actionBtn('#ef4444')}>✗ Reject</button>
                            </div>
                          )}
                          {p.approval_status !== 'pending' && (
                            <span style={{ color: '#64748b', fontSize: 13 }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {modal && (
        <ReasonModal
          title={
            modal.type === 'reject' ? 'Reject Seller — Enter Reason' :
            modal.type === 'ban' ? 'Ban Seller — Enter Reason' :
            'Reject Product — Enter Reason'
          }
          onConfirm={reason => handleAction(modal.type, modal.seller, reason)}
          onCancel={() => setModal(null)}
        />
      )}

      {/* Detail Drawer */}
      <SellerDrawer
        seller={selectedSeller}
        onClose={() => setSelectedSeller(null)}
        onAction={handleAction}
      />
    </div>
  );
}
