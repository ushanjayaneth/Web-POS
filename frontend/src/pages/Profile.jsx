import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiUser, FiPhone, FiMail, FiLock, FiCalendar } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store';
import api from '../utils/api';

const Profile = () => {
  const { user, fetchUser } = useAuthStore();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.put('/users/profile', {
        first_name: firstName,
        last_name: lastName,
        phone,
      });
      if (res.success) {
        toast.success('Profile updated successfully!');
        await fetchUser();
      } else {
        toast.error(res.message || 'Failed to update profile');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container empty-state page-empty">
        <p>Loading user profile...</p>
      </div>
    );
  }

  return (
    <div className="auth-page container">
      <Helmet><title>My Profile | ShoppingLK</title></Helmet>

      <section className="auth-intro">
        <p className="eyebrow">My Account</p>
        <h1>Hello, {user.first_name}!</h1>
        <p>Manage your profile, update contact information, and review account settings.</p>
        <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link to="/order-history" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '14px' }}>
            Order History
          </Link>
          <Link to="/change-password" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '14px' }}>
            <FiLock style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Change Password
          </Link>
        </div>
      </section>

      <section className="auth-card">
        <h2>Account Details</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <label>
              First Name
              <span className="input-shell">
                <FiUser />
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                />
              </span>
            </label>

            <label>
              Last Name
              <span className="input-shell">
                <FiUser />
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                />
              </span>
            </label>
          </div>

          <label>
            Email Address (Cannot change)
            <span className="input-shell" style={{ opacity: 0.7, background: '#f5f5f5' }}>
              <FiMail />
              <input
                type="email"
                disabled
                value={user.email}
              />
            </span>
          </label>

          <label>
            Phone Number
            <span className="input-shell">
              <FiPhone />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07XXXXXXXX"
              />
            </span>
          </label>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666', fontSize: '13px', margin: '8px 0 16px 0' }}>
            <FiCalendar />
            <span>Member since: {new Date(user.created_at).toLocaleDateString()}</span>
            {user.is_verified === 1 ? (
              <span style={{ color: '#16a34a', fontWeight: 'bold', marginLeft: 'auto' }}>Verified Account ✅</span>
            ) : (
              <span style={{ color: '#dc2626', fontWeight: 'bold', marginLeft: 'auto' }}>Email Not Verified ⚠️</span>
            )}
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary auth-submit">
            {loading ? 'Saving Changes...' : 'Save Changes'}
          </button>
        </form>
      </section>
    </div>
  );
};

export default Profile;
