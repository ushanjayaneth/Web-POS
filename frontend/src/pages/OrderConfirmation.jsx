import React, { useEffect } from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiCheckCircle, FiMessageCircle, FiArrowRight } from 'react-icons/fi';

const OrderConfirmation = () => {
  const location = useLocation();
  const orderData = location.state?.order;
  const whatsappUrl = location.state?.whatsapp_url;

  useEffect(() => {
    // Automatically attempt to open the WhatsApp URL on load
    if (whatsappUrl) {
      const timer = setTimeout(() => {
        window.open(whatsappUrl, '_blank');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [whatsappUrl]);

  if (!orderData) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container success-state page-empty" style={{ padding: '60px 20px', maxWidth: '600px', textAlign: 'center' }}>
      <Helmet><title>Order Confirmed | ShoppingLK</title></Helmet>

      <FiCheckCircle size={64} style={{ color: '#16a34a', marginBottom: '24px' }} />
      <h1 style={{ color: '#16a34a', marginBottom: '16px' }}>Order Placed Successfully!</h1>
      <p style={{ fontSize: '16px', color: '#555', marginBottom: '24px', lineHeight: '1.6' }}>
        Thank you for your order, <strong>{orderData.customer_name}</strong>! Your order number is <strong>#{orderData.order_number}</strong>.
      </p>

      <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '12px', border: '1px solid #eee', marginBottom: '32px', textAlign: 'left' }}>
        <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '16px' }}>Summary</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: '#666' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Order Number:</span>
            <strong>#{orderData.order_number}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Total:</span>
            <strong>Rs. {orderData.total}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Payment Method:</span>
            <strong>{orderData.payment_method}</strong>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
        {whatsappUrl && (
          <a 
            href={whatsappUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn btn-primary"
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '12px 24px', 
              background: '#25D366', 
              borderColor: '#25D366',
              color: '#fff',
              fontWeight: 'bold',
              textDecoration: 'none',
              borderRadius: '8px'
            }}
          >
            <FiMessageCircle size={20} /> Open WhatsApp to Confirm
          </a>
        )}
        
        <p style={{ fontSize: '13px', color: '#888' }}>
          Opening WhatsApp automatically in a few seconds... If it doesn't open, click the button above.
        </p>

        <Link to="/order-history" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '16px' }}>
          Go to Order History <FiArrowRight />
        </Link>
      </div>
    </div>
  );
};

export default OrderConfirmation;
