import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiCheckCircle, FiShoppingBag } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useCartStore } from '../store';
import { formatCurrency, getImageUrl } from '../utils/catalog';

const Checkout = () => {
  const { items, subtotal, clearCart } = useCartStore();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    district: 'Colombo',
  });
  const [isSuccess, setIsSuccess] = useState(false);

  // Sri Lankan Courier Charges:
  // Western Province (Colombo, Gampaha, Kalutara): Rs. 350
  // Outstations: Rs. 450
  // Free above Rs. 5000
  const isWesternProvince = ['colombo', 'gampaha', 'kalutara'].includes(formData.district.toLowerCase());
  const baseShipping = isWesternProvince ? 350 : 450;
  const shipping = subtotal > 5000 ? 0 : baseShipping;
  const total = subtotal + shipping;

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const buildOrderMessage = () => {
    const lines = [
      'New Order Received',
      '',
      'Customer Details',
      `Name: ${formData.name}`,
      `Phone: ${formData.phone}`,
      `Address: ${formData.address}, ${formData.city}, ${formData.district}`,
      '',
      'Order Items',
      ...items.map((item) => {
        const amount = Number(item.sale_price || item.price || 0) * Number(item.quantity || 1);
        return `${item.quantity} x ${item.name} - ${formatCurrency(amount)}`;
      }),
      '',
      `Subtotal: ${formatCurrency(subtotal)}`,
      `Shipping: ${shipping === 0 ? 'Free' : formatCurrency(shipping)}`,
      `Total: ${formatCurrency(total)}`,
      '',
      'Please confirm this order.',
    ];

    return lines.join('\n');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    const message = buildOrderMessage();
    setIsSuccess(true);

    try {
      await clearCart();
    } catch {
      toast.error('Cart could not be cleared automatically');
    }

    setTimeout(() => {
      window.open(`https://wa.me/94776338514?text=${encodeURIComponent(message)}`, '_blank');
      navigate('/');
    }, 1600);
  };

  if (isSuccess) {
    return (
      <div className="container success-state page-empty">
        <Helmet><title>Order Placed | ShoppingLK</title></Helmet>
        <FiCheckCircle />
        <h1>Order placed</h1>
        <p>We are opening WhatsApp so you can send the order to our team.</p>
        <span>Redirecting...</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container empty-state page-empty">
        <Helmet><title>Checkout | ShoppingLK</title></Helmet>
        <FiShoppingBag />
        <h1>Your cart is empty</h1>
        <p>Add products before starting checkout.</p>
        <Link to="/products" className="btn btn-primary">Shop products</Link>
      </div>
    );
  }

  return (
    <div className="container checkout-page">
      <Helmet><title>Checkout | ShoppingLK</title></Helmet>

      <div className="page-heading">
        <p className="eyebrow">Checkout</p>
        <h1>Delivery details</h1>
      </div>

      <div className="checkout-layout">
        <section className="form-panel">
          <h2>Shipping information</h2>
          <form onSubmit={handleSubmit} className="checkout-form">
            <label>
              Full name
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your name"
                required
              />
            </label>
            <label>
              WhatsApp phone number
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="071 234 5678"
                required
              />
            </label>
            <label>
              Delivery address
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Street address"
                rows="4"
                required
              />
            </label>
            <label>
              District (දිස්ත්‍රික්කය)
              <select
                name="district"
                value={formData.district}
                onChange={handleChange}
                required
              >
                <option value="Colombo">Colombo (කොළඹ)</option>
                <option value="Gampaha">Gampaha (ගම්පහ)</option>
                <option value="Kalutara">Kalutara (කළුතර)</option>
                <option value="Kandy">Kandy (මහනුවර)</option>
                <option value="Matale">Matale (මාතලේ)</option>
                <option value="Nuwara Eliya">Nuwara Eliya (නුවරඑළිය)</option>
                <option value="Galle">Galle (ගාල්ල)</option>
                <option value="Matara">Matara (මාතර)</option>
                <option value="Hambantota">Hambantota (හම්බන්තොට)</option>
                <option value="Jaffna">Jaffna (යාපනය)</option>
                <option value="Kilinochchi">Kilinochchi (කිලිනොච්චිය)</option>
                <option value="Mannar">Mannar (මන්නාරම)</option>
                <option value="Vavuniya">Vavuniya (වවුනියාව)</option>
                <option value="Mullaitivu">Mullaitivu (මුලතිව්)</option>
                <option value="Batticaloa">Batticaloa (මඩකලපුව)</option>
                <option value="Ampara">Ampara (අම්පාර)</option>
                <option value="Trincomalee">Trincomalee (ත්‍රිකුණාමලය)</option>
                <option value="Kurunegala">Kurunegala (කුරුණෑගල)</option>
                <option value="Puttalam">Puttalam (පුත්තලම)</option>
                <option value="Anuradhapura">Anuradhapura (අනුරාධපුරය)</option>
                <option value="Polonnaruwa">Polonnaruwa (පොළොන්නරුව)</option>
                <option value="Badulla">Badulla (බදුල්ල)</option>
                <option value="Moneragala">Moneragala (මොනරාගල)</option>
                <option value="Ratnapura">Ratnapura (රත්නපුරය)</option>
                <option value="Kegalle">Kegalle (කෑගල්ල)</option>
              </select>
            </label>
            <label>
              City / Suburb (නගරය)
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="City (e.g. Maharagama)"
                required
              />
            </label>
            <button type="submit" className="btn btn-primary checkout-button">
              Confirm order
            </button>
          </form>
        </section>

        <aside className="summary-panel">
          <h2>Order summary</h2>
          <div className="checkout-items">
            {items.map((item) => {
              const amount = Number(item.sale_price || item.price || 0) * Number(item.quantity || 1);
              return (
                <div className="checkout-item" key={item.id}>
                  <img src={getImageUrl(item.images?.[0])} alt={item.name} />
                  <div>
                    <strong>{item.name}</strong>
                    <span>Qty {item.quantity}</span>
                  </div>
                  <b>{formatCurrency(amount)}</b>
                </div>
              );
            })}
          </div>
          <div className="summary-line">
            <span>Subtotal</span>
            <strong>{formatCurrency(subtotal)}</strong>
          </div>
          <div className="summary-line">
            <span>Shipping</span>
            <strong>{shipping === 0 ? 'Free' : formatCurrency(shipping)}</strong>
          </div>
          <div className="summary-total">
            <span>Total</span>
            <strong>{formatCurrency(total)}</strong>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Checkout;
