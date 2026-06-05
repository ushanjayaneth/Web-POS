import React, { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { FiSearch, FiShoppingCart, FiUser, FiHeart, FiLogOut, FiMenu, FiX, FiHome, FiGrid } from 'react-icons/fi';
import { useAuthStore, useCartStore } from '../store';
import { Toaster } from 'react-hot-toast';

const Layout = () => {
  const { user, isAuthenticated, logout, fetchUser } = useAuthStore();
  const { itemCount, fetchCart } = useCartStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    }
  }, [isAuthenticated, fetchCart]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      navigate(`/products?search=${encodeURIComponent(e.target.value.trim())}`);
      setMenuOpen(false);
    }
  };

  return (
    <>
      <Toaster position="top-center" />
      <nav className="navbar">
        <div className="container nav-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          {/* Logo */}
          <Link to="/" className="logo" style={{ flexShrink: 0, fontSize: '1.2rem', fontWeight: '800' }}>
            <span style={{ color: 'var(--text-primary)' }}>Hello, ShoppingLK! 🛒</span>
          </Link>

          {/* Search — hide on very small screens */}
          <div className="search-bar nav-search-hide">
            <FiSearch className="search-icon" />
            <input type="text" className="search-input" placeholder="Search for products..." onKeyDown={handleSearch} />
          </div>

          {/* Desktop Actions */}
          <div className="nav-actions nav-desktop-only">
            {isAuthenticated ? (
              <>
                <Link to="/wishlist" className="btn-icon nav-item" title="Wishlist"><FiHeart size={20} /></Link>
                <Link to="/cart" className="btn-icon nav-item" title="Cart">
                  <div style={{ position: 'relative' }}>
                    <FiShoppingCart size={20} />
                    {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
                  </div>
                </Link>
                <Link to="/profile" className="btn-icon nav-item" title="Profile">
                  {user?.avatar ? (
                    <img src={import.meta.env.VITE_API_URL.replace('/api', '') + user.avatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <FiUser size={20} />
                  )}
                </Link>
                <button onClick={handleLogout} className="btn-icon nav-item" title="Logout"><FiLogOut size={20} /></button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-secondary">Login</Link>
                <Link to="/register" className="btn btn-primary">Sign Up</Link>
              </>
            )}
          </div>

          {/* Mobile: Cart + Hamburger */}
          <div className="nav-mobile-only" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {isAuthenticated && (
              <Link to="/cart" className="btn-icon nav-item" style={{ position: 'relative' }}>
                <FiShoppingCart size={20} />
                {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
              </Link>
            )}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="btn-icon nav-item"
              aria-label="Menu"
            >
              {menuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="nav-mobile-search">
          <div className="container" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
            <div style={{ position: 'relative' }}>
              <FiSearch style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input type="text" className="search-input" placeholder="Search for products..." style={{ width: '100%', paddingLeft: '3rem' }} onKeyDown={handleSearch} />
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {menuOpen && (
          <div className="mobile-menu" onClick={() => setMenuOpen(false)}>
            <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem' }}>
              {isAuthenticated ? (
                <>
                  <Link to="/profile" className="mobile-menu-item"><FiUser size={18} /> My Profile</Link>
                  <Link to="/wishlist" className="mobile-menu-item"><FiHeart size={18} /> Wishlist</Link>
                  <button onClick={handleLogout} className="mobile-menu-item" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', textAlign: 'left' }}>
                    <FiLogOut size={18} /> Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="mobile-menu-item">Login</Link>
                  <Link to="/register" className="mobile-menu-item">Sign Up</Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      <main style={{ minHeight: 'calc(100vh - 300px)' }}>
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-col">
              <Link to="/" className="logo" style={{ marginBottom: '1.5rem' }}>
                <span style={{ color: 'var(--text-primary)' }}>Shop</span>LK
              </Link>
              <p style={{ color: 'var(--text-muted)' }}>Sri Lanka's premier e-commerce destination for premium quality products.</p>
            </div>
            <div className="footer-col">
              <h4>Shop Departments</h4>
              <div className="footer-links">
                <Link to="/category/electronics">Electronics</Link>
                <Link to="/category/fashion">Fashion & Apparel</Link>
                <Link to="/category/home-living">Home & Living</Link>
                <Link to="/category/beauty">Beauty & Health</Link>
              </div>
            </div>
            <div className="footer-col">
              <h4>Customer Service</h4>
              <div className="footer-links">
                <Link to="/help">Help Center</Link>
                <Link to="/track-order">Track Your Order</Link>
                <Link to="/returns">Returns & Refunds</Link>
                <Link to="/contact">Contact Us</Link>
              </div>
            </div>
          </div>
          <div className="copyright">
            <p>&copy; {new Date().getFullYear()} ShopLK. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <nav className="bottom-nav">
        <Link to="/" className="bottom-nav-item active">
          <FiHome size={22} />
          <span>Home</span>
        </Link>
        <Link to="/products" className="bottom-nav-item">
          <FiGrid size={22} />
          <span>Products</span>
        </Link>
        <Link to="/cart" className="bottom-nav-item" style={{ position: 'relative' }}>
          <FiShoppingCart size={22} />
          {itemCount > 0 && <span className="cart-badge" style={{ top: '-5px', right: '10px' }}>{itemCount}</span>}
          <span>Cart</span>
        </Link>
        <Link to="/profile" className="bottom-nav-item">
          <FiUser size={22} />
          <span>Profile</span>
        </Link>
      </nav>
    </>
  );
};

export default Layout;
