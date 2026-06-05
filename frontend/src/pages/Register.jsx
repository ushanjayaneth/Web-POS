import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiEye, FiEyeOff, FiLock, FiMail, FiPhone, FiUser } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store';

const Register = () => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((state) => state.register);
  const navigate = useNavigate();

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const res = await register(formData);
      if (res.success) {
        toast.success('Account created');
        navigate('/');
      } else {
        toast.error(res.message || 'Registration failed');
      }
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page container">
      <Helmet><title>Create Account | ShoppingLK</title></Helmet>

      <section className="auth-intro">
        <p className="eyebrow">Join ShoppingLK</p>
        <h1>Create your shopping account.</h1>
        <p>Save your wishlist, keep your cart synced, and checkout faster.</p>
      </section>

      <section className="auth-card">
        <h2>Create account</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="two-field-row">
            <label>
              First name
              <span className="input-shell">
                <FiUser />
                <input
                  type="text"
                  name="first_name"
                  required
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="First name"
                />
              </span>
            </label>

            <label>
              Last name
              <span className="input-shell">
                <FiUser />
                <input
                  type="text"
                  name="last_name"
                  required
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Last name"
                />
              </span>
            </label>
          </div>

          <label>
            Email
            <span className="input-shell">
              <FiMail />
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
              />
            </span>
          </label>

          <label>
            Phone
            <span className="input-shell">
              <FiPhone />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="071 234 5678"
              />
            </span>
          </label>

          <label>
            Password
            <span className="input-shell">
              <FiLock />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                required
                minLength="8"
                value={formData.password}
                onChange={handleChange}
                placeholder="At least 8 characters"
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
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </section>
    </div>
  );
};

export default Register;
