import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiEye, FiEyeOff, FiLock, FiMail } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useSellerAuthStore } from '../../store';

const SellerLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const sellerLogin = useSellerAuthStore((state) => state.sellerLogin);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await sellerLogin(email, password);
      if (res.success) {
        toast.success('Seller logged in successfully');
        navigate('/seller/dashboard');
      } else {
        toast.error(res.message || 'Login failed');
      }
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page container">
      <Helmet><title>Seller Login | ShoppingLK</title></Helmet>

      <section className="auth-intro">
        <p className="eyebrow">Seller Portal</p>
        <h1>Grow your business with ShoppingLK.</h1>
        <p>Log in to manage your inventory, process customer orders, and track your store's performance.</p>
      </section>

      <section className="auth-card">
        <h2>Seller Login</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Business Email
            <span className="input-shell">
              <FiMail />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seller@yourbusiness.com"
              />
            </span>
          </label>

          <label>
            Password
            <span className="input-shell">
              <FiLock />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
              />
              <button
                type="button"
                className="input-icon-button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </span>
          </label>

          <button type="submit" disabled={loading} className="btn btn-primary auth-submit">
            {loading ? 'Logging in...' : 'Seller Login'}
          </button>
        </form>

        <p className="auth-switch">
          Want to sell with us? <Link to="/seller/register">Apply for a seller account</Link>
        </p>
      </section>
    </div>
  );
};

export default SellerLogin;
