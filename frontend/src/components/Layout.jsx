import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  FiGrid,
  FiHeart,
  FiHome,
  FiLogOut,
  FiMenu,
  FiSearch,
  FiShoppingCart,
  FiUser,
  FiX,
} from 'react-icons/fi';
import { Toaster } from 'react-hot-toast';
import { useAuthStore, useCartStore } from '../store';
import { assetBaseUrl } from '../utils/catalog';

const Layout = () => {
  const { user, isAuthenticated, logout, fetchUser } = useAuthStore();
  const { itemCount, fetchCart } = useCartStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (isAuthenticated) fetchCart();
  }, [isAuthenticated, fetchCart]);

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    navigate('/');
  };

  const submitSearch = (event) => {
    event.preventDefault();
    const query = search.trim();
    if (!query) return;
    navigate(`/products?search=${encodeURIComponent(query)}`);
    setSearch('');
    setMenuOpen(false);
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <Toaster position="top-center" />

      <header className="site-header">
        <div className="container nav-shell">
          <Link to="/" className="brand" onClick={closeMenu} aria-label="ShoppingLK home">
            <span className="brand-mark">S</span>
            <span className="brand-text">ShoppingLK</span>
          </Link>

          <nav className="desktop-nav" aria-label="Main navigation">
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/products">Products</NavLink>
            <NavLink to="/wishlist">Wishlist</NavLink>
          </nav>

          <form className="site-search desktop-search" onSubmit={submitSearch}>
            <FiSearch aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products"
              aria-label="Search products"
            />
          </form>

          <div className="nav-actions desktop-actions">
            {isAuthenticated ? (
              <>
                <Link to="/wishlist" className="icon-button" aria-label="Wishlist">
                  <FiHeart />
                </Link>
                <Link to="/cart" className="icon-button cart-link" aria-label="Cart">
                  <FiShoppingCart />
                  {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
                </Link>
                {user?.avatar ? (
                  <span className="user-avatar">
                    <img src={`${assetBaseUrl}${user.avatar}`} alt={user.first_name || 'User'} />
                  </span>
                ) : (
                  <span className="user-avatar" aria-label="Signed in">
                    <FiUser />
                  </span>
                )}
                <button type="button" className="icon-button" onClick={handleLogout} aria-label="Logout">
                  <FiLogOut />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-secondary">Login</Link>
                <Link to="/register" className="btn btn-primary">Create account</Link>
              </>
            )}
          </div>

          <div className="mobile-actions">
            <Link to="/cart" className="icon-button cart-link" aria-label="Cart">
              <FiShoppingCart />
              {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
            </Link>
            <button
              type="button"
              className="icon-button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <FiX /> : <FiMenu />}
            </button>
          </div>
        </div>

        <div className="mobile-search-row">
          <div className="container">
            <form className="site-search" onSubmit={submitSearch}>
              <FiSearch aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products"
                aria-label="Search products"
              />
            </form>
          </div>
        </div>

        {menuOpen && (
          <div className="mobile-menu">
            <div className="container mobile-menu-panel">
              <NavLink to="/" end onClick={closeMenu}>Home</NavLink>
              <NavLink to="/products" onClick={closeMenu}>Products</NavLink>
              <NavLink to="/wishlist" onClick={closeMenu}>Wishlist</NavLink>
              <NavLink to="/cart" onClick={closeMenu}>Cart</NavLink>
              {isAuthenticated ? (
                <button type="button" onClick={handleLogout}>Logout</button>
              ) : (
                <>
                  <NavLink to="/login" onClick={closeMenu}>Login</NavLink>
                  <NavLink to="/register" onClick={closeMenu}>Create account</NavLink>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <Link to="/" className="brand footer-brand">
              <span className="brand-mark">S</span>
              <span className="brand-text">ShoppingLK</span>
            </Link>
            <p>Curated products, clear prices, and simple ordering for customers across Sri Lanka.</p>
          </div>
          <div>
            <h3>Shop</h3>
            <Link to="/products">All products</Link>
            <Link to="/wishlist">Wishlist</Link>
            <Link to="/cart">Cart</Link>
          </div>
          <div>
            <h3>Account</h3>
            <Link to="/login">Login</Link>
            <Link to="/register">Create account</Link>
          </div>
          <div>
            <h3>Service</h3>
            <p>Islandwide delivery</p>
            <p>WhatsApp checkout</p>
            <p>Secure account access</p>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} ShoppingLK. All rights reserved.</span>
        </div>
      </footer>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        <NavLink to="/" end>
          <FiHome />
          <span>Home</span>
        </NavLink>
        <NavLink to="/products">
          <FiGrid />
          <span>Products</span>
        </NavLink>
        <NavLink to="/wishlist">
          <FiHeart />
          <span>Wishlist</span>
        </NavLink>
        <NavLink to="/cart" className="cart-link">
          <FiShoppingCart />
          {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
          <span>Cart</span>
        </NavLink>
      </nav>
    </>
  );
};

export default Layout;
