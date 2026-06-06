import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiArrowRight, FiRefreshCw, FiShield, FiShoppingBag, FiTruck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../utils/api';
import ProductCard from '../components/ProductCard';

const fallbackDepartments = [
  { name: 'Electronics', slug: 'electronics' },
  { name: 'Fashion', slug: 'fashion' },
  { name: 'Home & Living', slug: 'home-living' },
  { name: 'Beauty', slug: 'beauty' },
];

const Home = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const prodRes = await api.get(`/products?limit=12&_ts=${Date.now()}`);
        if (prodRes.success) setProducts(prodRes.data || []);
      } catch {
        toast.error('Store products could not be loaded');
      } finally {
        setLoading(false);
      }
    };

    const fetchCategories = async () => {
      try {
        const catRes = await api.get(`/categories?_ts=${Date.now()}`);
        if (catRes.success) {
          setCategories((catRes.data || []).filter((category) => category.is_active !== 0));
        }
      } catch {
        setCategories([]);
      }
    };

    fetchData();
    fetchCategories();

    const refreshTimer = window.setInterval(fetchData, 15000);
    const refreshOnFocus = () => fetchData();
    window.addEventListener('focus', refreshOnFocus);

    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener('focus', refreshOnFocus);
    };
  }, []);

  const departments = useMemo(() => {
    if (categories.length > 0) return categories.slice(0, 8);
    return fallbackDepartments;
  }, [categories]);

  return (
    <>
      <Helmet>
        <title>ShoppingLK | Online Shopping in Sri Lanka</title>
        <meta
          name="description"
          content="Shop electronics, fashion, home essentials and more with ShoppingLK."
        />
      </Helmet>

      <section className="hero">
        <div className="hero-image" aria-hidden="true" />
        <div className="container hero-content">
          <p className="eyebrow">Sri Lankan online store</p>
          <h1>ShoppingLK</h1>
          <p className="hero-lede">
            A clean shopping experience for everyday products, quick ordering, and islandwide delivery.
          </p>
          <div className="hero-actions">
            <Link to="/products" className="btn btn-primary">
              <FiShoppingBag />
              Shop products
            </Link>
            <Link to="/cart" className="btn btn-light">
              View cart
              <FiArrowRight />
            </Link>
          </div>
        </div>
      </section>

      <section className="service-strip">
        <div className="container service-grid">
          <div className="service-item">
            <FiTruck />
            <div>
              <strong>Islandwide delivery</strong>
              <span>Fast dispatch for confirmed orders</span>
            </div>
          </div>
          <div className="service-item">
            <FiShield />
            <div>
              <strong>Secure accounts</strong>
              <span>Protected login and cart access</span>
            </div>
          </div>
          <div className="service-item">
            <FiRefreshCw />
            <div>
              <strong>Fresh catalog</strong>
              <span>New stock appears as it is published</span>
            </div>
          </div>
        </div>
      </section>

      <section className="container section-block">
        <div className="section-header">
          <div>
            <p className="eyebrow">Departments</p>
            <h2 className="section-title">Shop by category</h2>
          </div>
          <Link to="/products" className="text-link">
            Browse all <FiArrowRight />
          </Link>
        </div>

        <div className="department-grid">
          {departments.map((category) => (
            <Link
              to={category.slug ? `/category/${category.slug}` : '/products'}
              className="department-card"
              key={category.uuid || category.id || category.slug || category.name}
            >
              <span>{category.name}</span>
              <FiArrowRight />
            </Link>
          ))}
        </div>
      </section>

      <section className="container section-block">
        <div className="section-header">
          <div>
            <p className="eyebrow">Latest arrivals</p>
            <h2 className="section-title">Available products</h2>
          </div>
          {products.length > 0 && (
            <Link to="/products" className="text-link">
              View all <FiArrowRight />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="catalog-state">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <FiShoppingBag />
            <h2>Products are coming soon</h2>
            <p>New items will appear here as soon as they are published.</p>
            <Link to="/products" className="btn btn-primary">Visit catalog</Link>
          </div>
        ) : (
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product.uuid || product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </>
  );
};

export default Home;
