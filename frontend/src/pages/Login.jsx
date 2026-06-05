import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiEye, FiEyeOff, FiLock, FiMail } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        toast.success('Logged in successfully');
        navigate('/');
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
      <Helmet><title>Login | ShoppingLK</title></Helmet>

      <section className="auth-intro">
        <p className="eyebrow">Welcome back</p>
        <h1>Login to continue shopping.</h1>
        <p>Access your cart, wishlist, and checkout details securely.</p>
      </section>

      <section className="auth-card">
        <h2>Login</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Email
            <span className="input-shell">
              <FiMail />
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
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
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Your password"
              />
              <button
                type="button"
                className="input-icon-button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </span>
          </label>

          <button type="submit" disabled={loading} className="btn btn-primary auth-submit">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="auth-switch">
          New to ShoppingLK? <Link to="/register">Create an account</Link>
        </p>
      </section>
    </div>
  );
};

export default Login;
