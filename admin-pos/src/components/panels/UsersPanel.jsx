import React, { useState, useEffect, useCallback } from 'react';
import adminApi from '../../utils/adminApi';

const StatusBadge = ({ isBanned, isVerified }) => {
  if (isBanned) return (
    <span style={{ background:'#8b5cf622', color:'#8b5cf6', padding:'2px 10px', borderRadius:20, fontSize:12, fontWeight:700 }}>
      🚫 Banned
    </span>
  );
  if (isVerified) return (
    <span style={{ background:'#10b98122', color:'#10b981', padding:'2px 10px', borderRadius:20, fontSize:12, fontWeight:700 }}>
      ✅ Verified
    </span>
  );
  return (
    <span style={{ background:'#f59e0b22', color:'#f59e0b', padding:'2px 10px', borderRadius:20, fontSize:12, fontWeight:700 }}>
      ⏳ Unverified
    </span>
  );
};

const ReasonModal = ({ onConfirm, onCancel }) => {
  const [reason, setReason] = useState('');
  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.7)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:999,
    }}>
      <div style={{ background:'#1e293b', borderRadius:16, padding:28, width:420, boxShadow:'0 25px 60px rgba(0,0,0,0.5)' }}>
        <h3 style={{ margin:'0 0 16px', color:'#f1f5f9' }}>Ban User — Enter Reason</h3>
        <textarea
          value={reason} onChange={e => setReason(e.target.value)}
          placeholder="Enter ban reason (min 5 chars)..."
          rows={3}
          style={{
            width:'100%', background:'#0f172a', color:'#e2e8f0',
            border:'1px solid #334155', borderRadius:8, padding:'10px 12px',
            resize:'vertical', fontSize:14, boxSizing:'border-box',
          }}
        />
        <div style={{ display:'flex', gap:10, marginTop:16, justifyContent:'flex-end' }}>
          <button onClick={onCancel} style={{
            padding:'8px 20px', borderRadius:8, border:'1px solid #475569',
            background:'transparent', color:'#94a3b8', cursor:'pointer', fontWeight:600,
          }}>Cancel</button>
          <button
            onClick={() => reason.trim().length >= 5 && onConfirm(reason.trim())}
            disabled={reason.trim().length < 5}
            style={{
              padding:'8px 20px', borderRadius:8, border:'none',
              background: reason.trim().length >= 5 ? '#ef4444' : '#475569',
              color:'#fff', cursor: reason.trim().length >= 5 ? 'pointer' : 'default', fontWeight:700,
            }}
          >Ban User</button>
        </div>
      </div>
    </div>
  );
};

export default function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [banModal, setBanModal] = useState(null); // user object

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers();
      if (res.success) setUsers(res.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter(u => {
    const matchFilter =
      filter === 'all' ? true :
      filter === 'banned' ? u.is_banned :
      filter === 'verified' ? u.is_verified && !u.is_banned :
      !u.is_verified && !u.is_banned;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.includes(q);
    return matchFilter && matchSearch;
  });

  const handleBan = async (user, reason) => {
    try {
      await adminApi.banUser(user.id, reason);
      alert('🚫 User banned.');
      setBanModal(null);
      load();
    } catch (err) { alert('Failed: ' + err.message); }
  };

  const handleUnban = async (user) => {
    if (!window.confirm(`Unban ${user.first_name} ${user.last_name}?`)) return;
    try {
      await adminApi.unbanUser(user.id);
      alert('✅ User unbanned.');
      load();
    } catch (err) { alert('Failed: ' + err.message); }
  };

  const styles = {
    input: {
      flex:1, minWidth:200, padding:'10px 14px', borderRadius:10,
      background:'#1e293b', border:'1px solid #334155', color:'#e2e8f0',
      fontSize:14, outline:'none',
    },
    select: {
      padding:'10px 14px', borderRadius:10,
      background:'#1e293b', border:'1px solid #334155', color:'#e2e8f0',
      fontSize:14, outline:'none', cursor:'pointer',
    },
    table: { width:'100%', borderCollapse:'collapse' },
    th: { textAlign:'left', padding:'10px 14px', color:'#64748b', fontSize:12,
      fontWeight:700, textTransform:'uppercase', borderBottom:'1px solid #1e293b' },
    td: { padding:'12px 14px', color:'#e2e8f0', fontSize:14, borderBottom:'1px solid #1e293b17' },
  };

  /* stats */
  const bannedCount = users.filter(u => u.is_banned).length;
  const verifiedCount = users.filter(u => u.is_verified && !u.is_banned).length;

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
      <div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid #334155',
        borderTopColor:'#6366f1', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div>
      {/* Stats cards */}
      <div style={{ display:'flex', gap:14, marginBottom:20, flexWrap:'wrap' }}>
        {[
          { label:'Total Users', value:users.length, color:'#6366f1' },
          { label:'Verified', value:verifiedCount, color:'#10b981' },
          { label:'Banned', value:bannedCount, color:'#8b5cf6' },
          { label:'Unverified', value:users.length - verifiedCount - bannedCount, color:'#f59e0b' },
        ].map(s => (
          <div key={s.label} style={{
            flex:1, minWidth:120, background:'#1e293b', borderRadius:12, padding:'16px 20px',
            borderLeft:`4px solid ${s.color}`,
          }}>
            <div style={{ color:'#64748b', fontSize:12, fontWeight:700, marginBottom:4 }}>{s.label}</div>
            <div style={{ color:s.color, fontSize:26, fontWeight:800 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search users…" style={styles.input}
        />
        <select value={filter} onChange={e => setFilter(e.target.value)} style={styles.select}>
          <option value="all">All Users</option>
          <option value="verified">Verified</option>
          <option value="unverified">Unverified</option>
          <option value="banned">Banned</option>
        </select>
        <button onClick={load} style={{
          padding:'10px 16px', borderRadius:10, border:'1px solid #334155',
          background:'transparent', color:'#94a3b8', cursor:'pointer', fontWeight:600,
        }}>↻ Refresh</button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{ textAlign:'center', color:'#64748b', padding:48, fontSize:15 }}>No users found.</div>
      ) : (
        <div style={{ overflowX:'auto', borderRadius:12, background:'#1e293b' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['User', 'Email', 'Phone', 'Role', 'Status', 'Joined', 'Last Login', 'Actions'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}
                  onMouseEnter={e => e.currentTarget.style.background='#ffffff08'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}
                >
                  <td style={styles.td}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{
                        width:36, height:36, borderRadius:'50%',
                        background:'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        color:'#fff', fontWeight:700, fontSize:14, flexShrink:0,
                      }}>
                        {u.first_name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div style={{ fontWeight:700, color:'#f1f5f9' }}>{u.first_name} {u.last_name}</div>
                        <div style={{ fontSize:11, color:'#64748b' }}>{u.id?.slice(0,8)}…</div>
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>{u.email}</td>
                  <td style={styles.td}>{u.phone || '—'}</td>
                  <td style={{ ...styles.td, textTransform:'capitalize' }}>{u.role || 'customer'}</td>
                  <td style={styles.td}>
                    <StatusBadge isBanned={u.is_banned} isVerified={u.is_verified} />
                  </td>
                  <td style={{ ...styles.td, fontSize:12, color:'#94a3b8' }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ ...styles.td, fontSize:12, color:'#94a3b8' }}>
                    {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                  </td>
                  <td style={styles.td}>
                    {u.is_banned ? (
                      <button onClick={() => handleUnban(u)} style={{
                        padding:'5px 14px', borderRadius:6, border:'none',
                        background:'#0ea5e9', color:'#fff', cursor:'pointer', fontWeight:600, fontSize:13,
                      }}>Unban</button>
                    ) : (
                      <button onClick={() => setBanModal(u)} style={{
                        padding:'5px 14px', borderRadius:6, border:'none',
                        background:'#8b5cf6', color:'#fff', cursor:'pointer', fontWeight:600, fontSize:13,
                      }}>Ban</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {banModal && (
        <ReasonModal
          onConfirm={reason => handleBan(banModal, reason)}
          onCancel={() => setBanModal(null)}
        />
      )}
    </div>
  );
}
