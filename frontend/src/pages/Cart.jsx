import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useCartStore } from '../store';
import { FiTrash2, FiMinus, FiPlus, FiArrowRight } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Cart = () => {
  const { items, subtotal, isLoading, updateQuantity, removeFromCart } = useCartStore();

  const handleUpdateQty = async (id, current, change, max) => {
    const newQty = current + change;
    if (newQty < 1 || newQty > max) return;
    try {
      await updateQuantity(id, newQty);
    } catch (err) {
      toast.error(err.message || 'Error updating quantity');
    }
  };

  const handleRemove = async (id) => {
    try {
      await removeFromCart(id);
      toast.success('Item removed');
    } catch (err) {
      toast.error('Error removing item');
    }
  };

  if (isLoading) return <div className="container" style={{ padding: '5rem 0', textAlign: 'center' }}>Loading cart...</div>;

  if (items.length === 0) {
    return (
      <div className="container" style={{ padding: '8rem 1.5rem', textAlign: 'center', maxWidth: '600px' }}>
        <Helmet><title>Your Cart | ShopLK</title></Helmet>
        <div style={{ width: '120px', height: '120px', background: 'var(--bg-surface-alt)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
          <FiTrash2 size={48} color="var(--text-muted)" />
        </div>
        <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Your Cart is Empty</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1.1rem' }}>Looks like you haven't added anything to your cart yet.</p>
        <Link to="/products" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>Continue Shopping</Link>
      </div>
    );
  }

  const shipping = subtotal > 5000 ? 0 : 350;
  const total = subtotal + shipping;

  return (
    <div className="container" style={{ padding: '3rem 1.5rem', animation: 'fadeIn 0.5s ease' }}>
      <Helmet><title>Your Cart ({items.length}) | ShopLK</title></Helmet>
      
      <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>Shopping Cart</h1>

      <div className="cart-grid">
        
        {/* Cart Items List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {items.map((item) => {
            const getImageUrl = (img) => {
              if (!img) return 'https://placehold.co/200x200';
              if (img.startsWith('http') || img.startsWith('data:')) return img;
              return import.meta.env.VITE_API_URL?.replace('/api', '') + img;
            };
            return (
            <div key={item.id} className="card" style={{ display: 'flex', gap: '1.5rem', padding: '1.5rem', alignItems: 'center' }}>
              <Link to={`/product/${item.slug}`} className="cart-item-img">
                <img 
                  src={getImageUrl(item.images && item.images[0])} 
                  alt={item.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              </Link>
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link to={`/product/${item.slug}`} style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>
                  {item.name}
                </Link>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>Sold by: {item.seller_name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                    <button onClick={() => handleUpdateQty(item.id, item.quantity, -1, item.stock)} style={{ padding: '0.5rem 0.8rem', background: 'var(--bg-surface-alt)' }}><FiMinus /></button>
                    <span style={{ padding: '0 1rem', fontWeight: 500 }}>{item.quantity}</span>
                    <button onClick={() => handleUpdateQty(item.id, item.quantity, 1, item.stock)} style={{ padding: '0.5rem 0.8rem', background: 'var(--bg-surface-alt)' }}><FiPlus /></button>
                  </div>
                  <button onClick={() => handleRemove(item.id)} className="btn-icon" style={{ border: 'none', color: 'var(--accent-danger)' }} title="Remove">
                    <FiTrash2 />
                  </button>
                </div>
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>Rs. {(item.sale_price || item.price).toLocaleString()}</div>
                {item.quantity > 1 && (
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    Total: Rs. {((item.sale_price || item.price) * item.quantity).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>

        {/* Order Summary Sidebar */}
        <div className="card" style={{ padding: '2rem', position: 'sticky', top: '100px' }}>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>Order Summary</h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            <span>Subtotal ({items.length} items)</span>
            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Rs. {subtotal.toLocaleString()}</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            <span>Shipping Fee</span>
            <span style={{ fontWeight: 500, color: shipping === 0 ? 'var(--accent-success)' : 'var(--text-primary)' }}>
              {shipping === 0 ? 'Free' : `Rs. ${shipping.toLocaleString()}`}
            </span>
          </div>
          
          {shipping > 0 && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', padding: '0.8rem', background: 'var(--bg-surface-alt)', borderRadius: '8px' }}>
              Add Rs. {(5000 - subtotal).toLocaleString()} more to your cart to get Free Shipping!
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', margin: '1.5rem 0 2rem', paddingTop: '1.5rem', borderTop: '2px dashed var(--border-color)' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>Total</span>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>Rs. {total.toLocaleString()}</span>
          </div>

          <Link to="/checkout" className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', textAlign: 'center', display: 'block' }}>
            Proceed to Checkout <FiArrowRight />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Cart;
