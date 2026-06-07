import React, { useState, useEffect, useCallback } from 'react';
import adminApi from '../../utils/adminApi';

const Section = ({ title, icon, children }) => (
  <div style={{
    background: '#1e293b', borderRadius: 14, padding: '22px 24px',
    marginBottom: 20, border: '1px solid #334155',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: 16, fontWeight: 700 }}>{title}</h3>
    </div>
    {children}
  </div>
);

const Field = ({ label, hint, children }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{
      display: 'block', color: '#94a3b8', fontSize: 12,
      fontWeight: 700, textTransform: 'uppercase', marginBottom: 5,
    }}>{label}</label>
    {children}
    {hint && <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>{hint}</div>}
  </div>
);

const inputStyle = {
  width: '100%', background: '#0f172a', color: '#e2e8f0',
  border: '1px solid #334155', borderRadius: 8, padding: '10px 14px',
  fontSize: 14, boxSizing: 'border-box', outline: 'none',
};

export default function SettingsPanel() {
  const [settings, setSettings] = useState({
    shop_name: '', whatsapp_number: '', shop_address: '',
    free_delivery_threshold: '', delivery_fee: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getSettings();
      if (res.success && res.data) {
        const d = res.data.shop_settings || res.data;
        setSettings(prev => ({
          ...prev,
          shop_name: d.shop_name || '',
          whatsapp_number: d.whatsapp_number || '',
          shop_address: d.shop_address || '',
          free_delivery_threshold: d.free_delivery_threshold ?? '',
          delivery_fee: d.delivery_fee ?? '',
        }));
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => {
    setSaved(false);
    setSettings(prev => ({ ...prev, [k]: v }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        shop_name: settings.shop_name,
        whatsapp_number: settings.whatsapp_number,
        shop_address: settings.shop_address,
        free_delivery_threshold: settings.free_delivery_threshold !== '' ? Number(settings.free_delivery_threshold) : 0,
        delivery_fee: settings.delivery_fee !== '' ? Number(settings.delivery_fee) : 0,
      };
      await adminApi.updateSettings(payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert('Failed to save settings: ' + err.message);
    }
    setSaving(false);
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        border: '3px solid #334155', borderTopColor: '#6366f1',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ maxWidth: 700 }}>
      {/* Shop Identity */}
      <Section title="Shop Identity" icon="🏪">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Shop Name" hint="Shown on emails and receipts">
            <input value={settings.shop_name} onChange={e => set('shop_name', e.target.value)}
              placeholder="ShoppingLK" style={inputStyle} />
          </Field>
          <Field label="WhatsApp Support Number" hint="E.g. 94776338514 (with country code, no +)">
            <input value={settings.whatsapp_number} onChange={e => set('whatsapp_number', e.target.value)}
              placeholder="94776338514" style={inputStyle} />
          </Field>
          <div style={{ gridColumn: '1/-1' }}>
            <Field label="Shop Address" hint="Displayed on invoices">
              <textarea value={settings.shop_address} onChange={e => set('shop_address', e.target.value)}
                rows={2} placeholder="No. 123, Main Street, Colombo 03"
                style={{ ...inputStyle, resize: 'vertical' }} />
            </Field>
          </div>
        </div>
      </Section>

      {/* Delivery Settings */}
      <Section title="Delivery & Shipping" icon="🚚">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Free Delivery Threshold (Rs.)" hint="Orders above this get free delivery">
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: '#64748b', fontSize: 13,
              }}>Rs.</span>
              <input type="number" value={settings.free_delivery_threshold}
                onChange={e => set('free_delivery_threshold', e.target.value)}
                placeholder="5000" min="0" style={{ ...inputStyle, paddingLeft: 40 }} />
            </div>
          </Field>
          <Field label="Delivery Fee (Rs.)" hint="Charged when below threshold">
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: '#64748b', fontSize: 13,
              }}>Rs.</span>
              <input type="number" value={settings.delivery_fee}
                onChange={e => set('delivery_fee', e.target.value)}
                placeholder="300" min="0" style={{ ...inputStyle, paddingLeft: 40 }} />
            </div>
          </Field>
        </div>

        {/* Preview */}
        {(settings.free_delivery_threshold || settings.delivery_fee) && (
          <div style={{
            marginTop: 14, padding: '12px 16px', background: '#0f172a',
            borderRadius: 8, border: '1px solid #334155', fontSize: 13,
          }}>
            <span style={{ color: '#94a3b8' }}>Preview: </span>
            <span style={{ color: '#10b981', fontWeight: 700 }}>Free delivery</span>
            <span style={{ color: '#e2e8f0' }}> on orders above </span>
            <span style={{ color: '#6366f1', fontWeight: 700 }}>Rs. {Number(settings.free_delivery_threshold || 0).toLocaleString()}</span>
            <span style={{ color: '#e2e8f0' }}>, otherwise </span>
            <span style={{ color: '#f59e0b', fontWeight: 700 }}>Rs. {Number(settings.delivery_fee || 0).toLocaleString()}</span>
            <span style={{ color: '#e2e8f0' }}> delivery fee.</span>
          </div>
        )}
      </Section>

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14, alignItems: 'center' }}>
        {saved && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            color: '#10b981', fontWeight: 700, fontSize: 14,
            animation: 'fadeIn 0.3s ease',
          }}>
            <span>✅</span> Settings saved successfully!
          </div>
        )}
        <button onClick={load} style={{
          padding: '12px 24px', borderRadius: 10, border: '1px solid #334155',
          background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 600,
        }}>↻ Reload</button>
        <button onClick={save} disabled={saving} style={{
          padding: '12px 28px', borderRadius: 10, border: 'none',
          background: saving ? '#475569' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: '#fff', cursor: saving ? 'default' : 'pointer', fontWeight: 700,
          fontSize: 15, boxShadow: saving ? 'none' : '0 4px 20px rgba(99,102,241,0.4)',
          transition: 'all 0.2s',
        }}>
          {saving ? 'Saving…' : '💾 Save Settings'}
        </button>
      </div>

      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
