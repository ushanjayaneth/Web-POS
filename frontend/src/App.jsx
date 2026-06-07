import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Register from './pages/Register';
import Products from './pages/Products';
import Wishlist from './pages/Wishlist';

// Route Guards
import PrivateRoute from './components/PrivateRoute';
import SellerRoute from './components/SellerRoute';

// Customer Pages
import Profile from './pages/Profile';
import OrderHistory from './pages/OrderHistory';
import ChangePassword from './pages/ChangePassword';
import OrderConfirmation from './pages/OrderConfirmation';
import VerifyEmail from './pages/VerifyEmail';

// Seller Pages
import SellerLogin from './pages/seller/SellerLogin';
import SellerRegister from './pages/seller/SellerRegister';
import SellerDashboard from './pages/seller/SellerDashboard';
import SellerProducts from './pages/seller/SellerProducts';
import SellerOrders from './pages/seller/SellerOrders';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* Public Routes */}
        <Route index element={<Home />} />
        <Route path="products" element={<Products />} />
        <Route path="category/:categorySlug" element={<Products />} />
        <Route path="product/:slug" element={<ProductDetails />} />
        <Route path="cart" element={<Cart />} />
        <Route path="wishlist" element={<Wishlist />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="verify-email" element={<VerifyEmail />} />

        {/* Private Customer Routes */}
        <Route path="checkout" element={<PrivateRoute><Checkout /></PrivateRoute>} />
        <Route path="profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="order-history" element={<PrivateRoute><OrderHistory /></PrivateRoute>} />
        <Route path="change-password" element={<PrivateRoute><ChangePassword /></PrivateRoute>} />
        <Route path="order-confirmation" element={<PrivateRoute><OrderConfirmation /></PrivateRoute>} />

        {/* Seller Portal Routes */}
        <Route path="seller/login" element={<SellerLogin />} />
        <Route path="seller/register" element={<SellerRegister />} />
        
        {/* Protected Seller Portal Routes */}
        <Route path="seller/dashboard" element={<SellerRoute><SellerDashboard /></SellerRoute>} />
        <Route path="seller/products" element={<SellerRoute><SellerProducts /></SellerRoute>} />
        <Route path="seller/orders" element={<SellerRoute><SellerOrders /></SellerRoute>} />

        {/* 404 Route */}
        <Route
          path="*"
          element={(
            <div className="container empty-state page-empty">
              <h1>Page not found</h1>
              <p>The page you are looking for does not exist.</p>
            </div>
          )}
        />
      </Route>
    </Routes>
  );
};

export default App;
