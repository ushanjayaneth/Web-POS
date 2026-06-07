import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiBox, FiShoppingBag, FiLayers, FiDollarSign, FiPlus, FiLogOut, FiSettings } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useSellerAuthStore } from '../../store';
import api from '../../utils/api';

const SellerDashboard = () => {
  const { seller, sellerLogout } = useSellerAuthStore();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, ordRes] = await Promise.all([
          api.get('/sellers/products'),
          api.get('/sellers/orders')
        ]);
        if (prodRes.success) setProducts(prodRes.data || []);
        if (ordRes.success) setOrders(ordRes.data || []);
      } catch (err) {
        toast.error('Failed to load seller dashboard details.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogout = async () => {
    await sellerLogout();
    toast.success('Logged out from Seller Portal');
    navigate('/seller/login');
  };

  // Stats calculation
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.is_active === 1 && p.approval_status === 'approved').length;
  const pendingProducts = products.filter(p => p.approval_status === 'pending').length;
  const totalOrders = orders.length;
  const totalEarnings = orders.reduce((sum, o) => sum + (o.seller_subtotal || 0), 0);

  if (!seller) {
    return (
      <div className="container empty-state page-empty">
        <p>Loading seller session...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '40px 20px', maxWidth: '1200px' }}>
      <Helmet><title>Seller Dashboard | ShoppingLK</title></Helmet>

      {/* Header Panel */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <p className="eyebrow" style={{ color: '#16a34a', textTransform: 'uppercase', fontWeight: 'bold' }}>Seller Dashboard</p>
          <h1 style={{ margin: 0, fontSize: '28px' }}>{seller.business_name}</h1>
          <p style={{ color: '#666', marginTop: '4px' }}>Welcome back, {seller.owner_name}!</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleLogout} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <FiLogOut /> Logout
          </button>
        </div>
      </header>

      {/* Navigation Toggles */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #eee', paddingBottom: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <Link to="/seller/dashboard" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '14px' }}>Overview</Link>
        <Link to="/seller/products" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '14px' }}>My Products</Link>
        <Link to="/seller/orders" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '14px' }}>Customer Orders</Link>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
        </div>
      ) : (
        <>
          {/* Statistics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '40px' }}>
            <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.01)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#666', marginBottom: '12px' }}>
                <span>Total Earnings</span>
                <FiDollarSign size={20} style={{ color: '#16a34a' }} />
              </div>
              <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>Rs. {totalEarnings.toLocaleString()}</h3>
            </div>

            <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.01)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#666', marginBottom: '12px' }}>
                <span>Total Orders</span>
                <FiShoppingBag size={20} style={{ color: '#2563eb' }} />
              </div>
              <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>{totalOrders}</h3>
            </div>

            <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.01)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#666', marginBottom: '12px' }}>
                <span>Active Products</span>
                <FiBox size={20} style={{ color: '#059669' }} />
              </div>
              <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>{activeProducts} / {totalProducts}</h3>
            </div>

            <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.01)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#666', marginBottom: '12px' }}>
                <span>Pending Approvals</span>
                <FiLayers size={20} style={{ color: '#d97706' }} />
              </div>
              <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>{pendingProducts}</h3>
            </div>
          </div>

          {/* Quick Actions & Recent Orders */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px', alignItems: 'start', flexWrap: 'wrap' }}>
            {/* Recent Orders Panel */}
            <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '24px' }}>
              <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>Recent Orders</h2>
              {orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#888' }}>
                  No orders placed for your products yet.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #eee', color: '#666' }}>
                        <th style={{ padding: '12px 8px' }}>Order #</th>
                        <th style={{ padding: '12px 8px' }}>Date</th>
                        <th style={{ padding: '12px 8px' }}>Customer</th>
                        <th style={{ padding: '12px 8px' }}>Your Items</th>
                        <th style={{ padding: '12px 8px' }}>Earning</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 5).map((o) => (
                        <tr key={o.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                          <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>#{o.order_number}</td>
                          <td style={{ padding: '12px 8px' }}>{new Date(o.created_at).toLocaleDateString()}</td>
                          <td style={{ padding: '12px 8px' }}>{o.customer_name}</td>
                          <td style={{ padding: '12px 8px' }}>{o.items.reduce((sum, item) => sum + item.quantity, 0)} items</td>
                          <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>Rs. {o.seller_subtotal}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {orders.length > 5 && (
                    <div style={{ marginTop: '16px', textAlign: 'right' }}>
                      <Link to="/seller/orders" style={{ color: '#16a34a', textDecoration: 'none', fontWeight: 'bold', fontSize: '13px' }}>
                        View All Orders →
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Actions Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '24px' }}>
                <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Quick Actions</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <Link to="/seller/products" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <FiPlus /> Add New Product
                  </Link>
                  <Link to="/seller/orders" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <FiShoppingBag /> View My Orders
                  </Link>
                </div>
              </div>

              {/* Status card */}
              <div style={{ background: '#fcfcfc', border: '1px solid #eee', borderRadius: '12px', padding: '20px', fontSize: '13px', color: '#666', lineHeight: '1.5' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#111' }}>Store Information</h4>
                <div>Email: {seller.email}</div>
                <div>Category: {Array.isArray(seller.categories) ? seller.categories.join(', ') : seller.categories}</div>
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Status: 
                  <span style={{ color: '#16a34a', fontWeight: 'bold' }}>Active ✅</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SellerDashboard;
