import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiLock, FiEye, FiEyeOff, FiArrowLeft } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../utils/api';

const ChangePassword = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return toast.error('New passwords do not match!');
    }
    setLoading(true);
    try {
      const res = await api.put('/users/change-password', {
        oldPassword,
        newPassword,
      });
      if (res.success) {
        toast.success('Password changed successfully!');
        navigate('/profile');
      } else {
        toast.error(res.message || 'Failed to change password');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page container">
      <Helmet><title>Change Password | ShoppingLK</title></Helmet>

      <section className="auth-intro">
        <p className="eyebrow">Security</p>
        <h1>Change Password</h1>
        <p>Update your password regularly to keep your account secure.</p>
        <div style={{ marginTop: '24px' }}>
          <Link to="/profile" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '14px' }}>
            <FiArrowLeft style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Back to Profile
          </Link>
        </div>
      </section>

      <section className="auth-card">
        <h2>Set New Password</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Current Password
            <span className="input-shell">
              <FiLock />
              <input
                type={showOld ? 'text' : 'password'}
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Current password"
              />
              <button
                type="button"
                className="input-icon-button"
                onClick={() => setShowOld(!showOld)}
              >
                {showOld ? <FiEyeOff /> : <FiEye />}
              </button>
            </span>
          </label>

          <label>
            New Password
            <span className="input-shell">
              <FiLock />
              <input
                type={showNew ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Must be at least 8 characters with numbers & uppercase"
              />
              <button
                type="button"
                className="input-icon-button"
                onClick={() => setShowNew(!showNew)}
              >
                {showNew ? <FiEyeOff /> : <FiEye />}
              </button>
            </span>
          </label>

          <label>
            Confirm New Password
            <span className="input-shell">
              <FiLock />
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
              />
              <button
                type="button"
                className="input-icon-button"
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? <FiEyeOff /> : <FiEye />}
              </button>
            </span>
          </label>

          <button type="submit" disabled={loading} className="btn btn-primary auth-submit">
            {loading ? 'Changing Password...' : 'Change Password'}
          </button>
        </form>
      </section>
    </div>
  );
};

export default ChangePassword;
