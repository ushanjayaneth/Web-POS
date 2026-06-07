import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiCheckCircle, FiXCircle, FiLoader } from 'react-icons/fi';
import api from '../utils/api';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Verification token is missing.');
        return;
      }
      try {
        const res = await api.post('/auth/verify-email', { token });
        if (res.success) {
          setStatus('success');
          setMessage(res.message || 'Your email has been verified successfully!');
        } else {
          setStatus('error');
          setMessage(res.message || 'Verification failed. Invalid or expired token.');
        }
      } catch (err) {
        setStatus('error');
        setMessage(err.message || 'An error occurred during verification. Please try again.');
      }
    };
    verifyToken();
  }, [token]);

  return (
    <div className="container page-empty" style={{ padding: '60px 20px', maxWidth: '500px', textAlign: 'center' }}>
      <Helmet><title>Verify Email | ShoppingLK</title></Helmet>

      {status === 'verifying' && (
        <>
          <FiLoader size={48} className="animate-spin" style={{ color: '#059669', marginBottom: '20px' }} />
          <h1>Verifying your email</h1>
          <p>Please wait while we verify your email address...</p>
        </>
      )}

      {status === 'success' && (
        <>
          <FiCheckCircle size={64} style={{ color: '#10b981', marginBottom: '24px' }} />
          <h1 style={{ color: '#10b981' }}>Email Verified!</h1>
          <p style={{ margin: '16px 0 24px', color: '#666' }}>{message}</p>
          <Link to="/login" className="btn btn-primary">Login to your Account</Link>
        </>
      )}

      {status === 'error' && (
        <>
          <FiXCircle size={64} style={{ color: '#ef4444', marginBottom: '24px' }} />
          <h1 style={{ color: '#ef4444' }}>Verification Failed</h1>
          <p style={{ margin: '16px 0 24px', color: '#666' }}>{message}</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link to="/login" className="btn btn-secondary">Go to Login</Link>
            <Link to="/" className="btn btn-primary">Home</Link>
          </div>
        </>
      )}
    </div>
  );
};

export default VerifyEmail;
