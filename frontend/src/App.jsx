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

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="products" element={<Products />} />
        <Route path="category/:categorySlug" element={<Products />} />
        <Route path="product/:slug" element={<ProductDetails />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="wishlist" element={<Wishlist />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
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
