import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useCartStore } from '../store';
import toast from 'react-hot-toast';
import { FiCheckCircle } from 'react-icons/fi';

const Checkout = () => {
  const { items, subtotal, clearCart } = useCartStore();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    city: ''
  });
  
  const [isSuccess, setIsSuccess] = useState(false);

  const shipping = subtotal > 5000 ? 0 : 350;
  const total = subtotal + shipping;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (items.length === 0) {
      toast.error('Your cart is empty!');
      return;
    }

    // Format the message for WhatsApp
    let message = `🛒 *New Order Received!*\n\n`;
    message += `👤 *Customer Details*\n`;
    message += `Name: ${formData.name}\n`;
    message += `Phone: ${formData.phone}\n`;
    message += `Address: ${formData.address}, ${formData.city}\n\n`;
    
    message += `📦 *Order Items*\n`;
    items.forEach(item => {
      message += `▪ ${item.quantity}x ${item.name} - Rs. ${((item.sale_price || item.price) * item.quantity).toLocaleString()}\n`;
    });
    
    message += `\n💰 *Subtotal:* Rs. ${subtotal.toLocaleString()}\n`;
    message += `🚚 *Shipping:* ${shipping === 0 ? 'Free' : `Rs. ${shipping.toLocaleString()}`}\n`;
    message += `💵 *Total Amount:* Rs. ${total.toLocaleString()}\n\n`;
    message += `📍 *Please send this order to the above address.*`;

    // Show success UI immediately
    setIsSuccess(true);
    await clearCart();

    // Redirect to WhatsApp after 2 seconds
    setTimeout(() => {
      const whatsappUrl = `https://wa.me/94776338514?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      navigate('/');
    }, 2000);
  };

  if (isSuccess) {
    return (
      <div className="container" style={{ padding: '8rem 1.5rem', textAlign: 'center', maxWidth: '600px', animation: 'fadeIn 0.5s ease' }}>
        <div style={{ width: '100px', height: '100px', background: 'var(--accent-success)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', color: 'white' }}>
          <FiCheckCircle size={50} />
        </div>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Order Placed Successfully!</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', marginBottom: '2rem' }}>
          Thank you for your order. We are redirecting you to WhatsApp to securely forward your order details to our team.
        </p>
        <div style={{ padding: '1rem', background: 'var(--bg-surface-alt)', borderRadius: '12px', color: 'var(--text-muted)' }}>
          Redirecting to WhatsApp in a few seconds...
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '3rem 1.5rem', animation: 'fadeIn 0.5s ease' }}>
      <Helmet><title>Checkout | ShopLK</title></Helmet>
      
      <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>Checkout</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '3rem', alignItems: 'start' }}>
        {/* Checkout Form */}
        <div className="card" style={{ padding: '2.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>Shipping Details</h2>
          
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input type="text" name="name" required value={formData.name} onChange={handleChange} className="input-field" placeholder="John Doe" />
            </div>
            
            <div className="input-group">
              <label className="input-label">Phone Number (WhatsApp)</label>
              <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} className="input-field" placeholder="071 234 5678" />
            </div>
            
            <div className="input-group">
              <label className="input-label">Delivery Address</label>
              <textarea name="address" required value={formData.address} onChange={handleChange} className="input-field" placeholder="No 123, Main Street" rows="3" style={{ resize: 'vertical' }}></textarea>
            </div>

            <div className="input-group">
              <label className="input-label">City</label>
              <input type="text" name="city" required value={formData.city} onChange={handleChange} className="input-field" placeholder="Colombo 05" />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1.2rem', fontSize: '1.2rem', marginTop: '1rem' }}>
              Confirm & Place Order
            </button>
          </form>
        </div>

        {/* Order Summary Sidebar */}
        <div className="card" style={{ padding: '2rem', position: 'sticky', top: '100px', background: 'var(--bg-surface-alt)' }}>
          <h3 style={{ fontSize: '1.3rem', marginBottom: '1.5rem' }}>Order Summary ({items.length} items)</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem', maxHeight: '300px', overflowY: 'auto' }}>
            {items.map(item => {
              const getImageUrl = (img) => {
                if (!img) return 'https://placehold.co/100x100';
                if (img.startsWith('http') || img.startsWith('data:')) return img;
                return import.meta.env.VITE_API_URL?.replace('/api', '') + img;
              };
              return (
              <div key={item.id} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <img src={getImageUrl(item.images && item.images[0])} alt={item.name} style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Qty: {item.quantity}</div>
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Rs. {((item.sale_price || item.price) * item.quantity).toLocaleString()}</div>
              </div>
              );
            })}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            <span>Subtotal</span>
            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Rs. {subtotal.toLocaleString()}</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            <span>Shipping Fee</span>
            <span style={{ fontWeight: 500, color: shipping === 0 ? 'var(--accent-success)' : 'var(--text-primary)' }}>
              {shipping === 0 ? 'Free' : `Rs. ${shipping.toLocaleString()}`}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', margin: '1.5rem 0 0', paddingTop: '1.5rem', borderTop: '2px dashed var(--border-color)' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>Total</span>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>Rs. {total.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
