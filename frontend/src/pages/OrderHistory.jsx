import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiShoppingBag, FiTruck, FiCheckCircle, FiClock, FiXCircle, FiArrowLeft, FiMessageCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../utils/api';

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await api.get('/orders');
        if (res.success) {
          setOrders(res.data || []);
        } else {
          toast.error(res.message || 'Failed to fetch orders');
        }
      } catch (err) {
        toast.error(err.message || 'Failed to load order history');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <FiCheckCircle style={{ color: '#16a34a' }} />;
      case 'shipped': return <FiTruck style={{ color: '#2563eb' }} />;
      case 'pending': return <FiClock style={{ color: '#d97706' }} />;
      case 'cancelled': return <FiXCircle style={{ color: '#dc2626' }} />;
      default: return <FiClock style={{ color: '#666' }} />;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'completed': return 'badge badge-success';
      case 'shipped': return 'badge badge-primary';
      case 'pending': return 'badge badge-warning';
      case 'cancelled': return 'badge badge-danger';
      default: return 'badge badge-secondary';
    }
  };

  return (
    <div className="container" style={{ padding: '40px 20px', maxWidth: '1000px' }}>
      <Helmet><title>Order History | ShoppingLK</title></Helmet>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Link to="/profile" style={{ display: 'flex', alignItems: 'center', color: '#666', textDecoration: 'none' }}>
          <FiArrowLeft size={20} style={{ marginRight: '6px' }} /> Back to Account
        </Link>
      </div>

      <h1 style={{ marginBottom: '8px' }}>Order History</h1>
      <p style={{ color: '#666', marginBottom: '32px' }}>Track status and review your previous orders here.</p>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center', border: '1px dashed #ddd', borderRadius: '12px' }}>
          <FiShoppingBag size={48} style={{ color: '#ccc', marginBottom: '16px' }} />
          <h3>No orders found</h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>You haven't placed any orders yet.</p>
          <Link to="/products" className="btn btn-primary">Start Shopping</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {orders.map((order) => (
            <div 
              key={order.id} 
              style={{
                background: '#fff',
                border: '1px solid #eee',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}
            >
              <div 
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid #f5f5f5',
                  paddingBottom: '16px',
                  marginBottom: '16px',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px' }}>Order #{order.order_number}</h3>
                  <span style={{ fontSize: '13px', color: '#888' }}>
                    Placed on: {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {getStatusIcon(order.status)}
                  <span className={getStatusClass(order.status)} style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>
                    {order.status}
                  </span>
                </div>
              </div>

              {/* Order Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                {order.items && order.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                    <div>
                      <strong>{item.name}</strong> 
                      {item.variant && <span style={{ color: '#888', fontSize: '12px', marginLeft: '6px' }}>({item.variant})</span>}
                      <span style={{ color: '#888', marginLeft: '8px' }}>× {item.quantity}</span>
                    </div>
                    <div>Rs. {item.total}</div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div 
                style={{
                  borderTop: '1px solid #f5f5f5',
                  paddingTop: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ fontSize: '13px', color: '#666' }}>
                  <div>Shipping Method: {order.payment_method}</div>
                  <div>Address: {order.shipping_address?.address || order.shipping_address?.line1}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '14px', color: '#666', marginRight: '12px' }}>Total:</span>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#111' }}>Rs. {order.total}</span>
                </div>
              </div>

              {/* Action WhatsApp Support */}
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <a 
                  href={`https://wa.me/94776338514?text=Hello%20ShoppingLK,%20I%20have%20a%20question%20about%20my%20order%20%23${order.order_number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    padding: '6px 12px',
                    borderColor: '#25D366',
                    color: '#25D366'
                  }}
                >
                  <FiMessageCircle size={16} /> Contact Support
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
