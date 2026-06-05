import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import api from '../utils/api';
import ProductCard from '../components/ProductCard';

const Home = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          api.get('/products?limit=12'),
          api.get('/categories'),
        ]);

        if (prodRes.success) setProducts(prodRes.data || []);
        if (catRes.success) setCategories((catRes.data || []).filter((cat) => cat.is_active !== 0));
      } catch {
        toast.error('Failed to load store data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <Helmet>
        <title>ShopLK | Sri Lanka's Premier Online Marketplace</title>
        <meta name="description" content="Buy electronics, fashion, home appliances and more at ShopLK. Fast delivery and premium quality." />
      </Helmet>

      <section className="home-hero">
        <div className="container home-hero-inner">
          <div className="home-hero-copy">
            <p className="catalog-kicker">Fresh from the POS catalog</p>
            <h1>Shop products added live from your store counter.</h1>
            <p>
              Products published from the admin POS appear here automatically with responsive cards, clean pricing,
              and mobile-ready shopping controls.
            </p>
            <div className="home-hero-actions">
              <Link to="/products" className="btn btn-primary">Shop Products</Link>
              <Link to="/cart" className="btn btn-secondary">View Cart</Link>
            </div>
          </div>
          <div className="home-hero-media">
            <img src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1470&auto=format&fit=crop" alt="Online shopping desk" />
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="container store-section">
          <div className="section-header">
            <h2 className="section-title">Shop by Category</h2>
          </div>
          <div className="categories-grid">
            {categories.slice(0, 8).map((cat, index) => {
              const colors = ['#2563EB', '#F97316', '#EC4899', '#22C55E', '#A855F7', '#06B6D4', '#EAB308', '#EF4444'];
              return (
                <Link to={`/category/${cat.slug}`} key={cat.uuid || cat.id || cat.slug} className="category-card">
                  <div className="category-icon" style={{ background: colors[index % colors.length] }}>{cat.icon || 'SHOP'}</div>
                  <div className="category-name">{cat.name}</div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="container store-section product-showcase">
        <div className="section-header">
          <div>
            <p className="catalog-kicker">Available now</p>
            <h2 className="section-title">Latest Products</h2>
          </div>
          <Link to="/products" className="view-all-link">View All</Link>
        </div>

        {loading ? (
          <div className="catalog-state">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="catalog-empty compact">
            <h2>No products yet</h2>
            <p>Add active products from the POS system to publish them on the website.</p>
          </div>
        ) : (
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product.uuid || product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
