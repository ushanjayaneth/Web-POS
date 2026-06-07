import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSellerAuthStore } from '../store';

const SellerRoute = ({ children }) => {
  const { isSellerAuthenticated, isSellerLoading, fetchSeller } = useSellerAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (!isSellerAuthenticated && localStorage.getItem('sellerAccessToken')) {
      fetchSeller();
    }
  }, [isSellerAuthenticated, fetchSeller]);

  const hasToken = localStorage.getItem('sellerAccessToken');

  if (isSellerLoading && hasToken) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!isSellerAuthenticated && !hasToken) {
    return <Navigate to="/seller/login" state={{ from: location }} replace />;
  }

  return children;
};

export default SellerRoute;
