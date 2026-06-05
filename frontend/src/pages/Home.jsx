import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import api from '../utils/api';
import { useCartStore } from '../store';
import { FiShoppingCart, FiHeart, FiStar } from 'react-icons/fi';
import toast from 'react-hot-toast';

const ProductCard = ({ product }) => {
  const { addToCart } = useCartStore();

  const handleAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await addToCart(product.id || product.uuid, 1);
      toast.success('Added to cart!');
    } catch (err) {
      toast.error(err.message || 'Failed to add');
    }
  };

  const getImageUrl = (img) => {
    if (!img) return 'https://placehold.co/400x400/F1F3F5/868E96?text=No+Image';
    if (img.startsWith('http') || img.startsWith('data:')) return img;
    return import.meta.env.VITE_API_URL?.replace('/api', '') + img;
  };

  const imgUrl = getImageUrl(product.images?.[0]);

  return (
    <Link to={`/product/${product.slug}`} className="card product-card animate-fade-in">
      <div className="product-image-wrap">
        <img src={imgUrl} alt={product.name} className="product-image" loading="lazy" />
        <div className="product-badges">
          {product.is_featured === 1 && !product.sale_price && <span className="badge badge-new">Featured</span>}
          {product.sale_price && product.price > product.sale_price && (
            <span className="badge badge-sale">
              -{Math.round(((product.price - product.sale_price) / product.price) * 100)}%
            </span>
          )}
        </div>
        <div className="product-actions">
          <button className="btn-icon" onClick={async (e) => { 
            e.preventDefault(); 
            e.stopPropagation(); 
            try {
              const res = await api.post('/wishlist/toggle', { product_id: product.id || product.uuid });
              if (res.success) toast.success(res.message, { icon: '❤️' });
              else toast.error('Please login to use wishlist');
            } catch (e) {
              toast.error('Please login to use wishlist');
            }
          }}>
            <FiHeart />
          </button>
          <button className="btn-icon" onClick={handleAdd}>
            <FiShoppingCart />
          </button>
        </div>
      </div>
      <div className="product-info">
        <div className="product-category">{product.category_name}</div>
        <h3 className="product-title">{product.name}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px' }}>
          <FiStar fill="#FAB005" color="#FAB005" size={14} />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{(product.rating_avg || 0).toFixed(1)}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({product.rating_count || 0})</span>
        </div>
        <div className="product-price-row">
          <span className="price-current">LKR {product.sale_price ? product.sale_price.toLocaleString() : product.price.toLocaleString()}</span>
          {product.sale_price && <span className="price-old">LKR {product.price.toLocaleString()}</span>}
        </div>
      </div>
    </Link>
  );
};

const Home = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          api.get('/products?limit=8'),
          api.get('/categories')
        ]);
        if (prodRes.success) setProducts(prodRes.data);
        if (catRes.success) {
          const electronicsOnly = catRes.data.filter(c => c.slug === 'electronics');
          setCategories(electronicsOnly);
        }
      } catch (err) {
        toast.error('Failed to load data');
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

      {/* Hero Section */}
      <section style={{ 
        padding: 'clamp(3rem, 8vw, 6rem) 0',
        position: 'relative',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div className="container" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '2rem' }}>
          <div style={{ flex: '1 1 280px', minWidth: '0' }}>
            <h1 style={{ fontSize: 'clamp(2rem, 8vw, 3.8rem)', marginBottom: '1.5rem', letterSpacing: '-1px', color: '#FFF', lineHeight: '1.1' }}>
              Discover <span style={{ color: 'var(--primary)' }}>Premium</span> Products For Your Lifestyle.
            </h1>
            <p style={{ fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)', color: 'var(--text-secondary)', marginBottom: '2.5rem', maxWidth: '600px', lineHeight: 1.6 }}>
              Experience shopping like never before. Curated collections, exclusive deals, and fast islandwide delivery.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link to="/products" className="btn btn-primary" style={{ padding: '0.9rem 1.8rem', fontSize: '1rem' }}>Shop Now</Link>
              <Link to="/products" className="btn btn-secondary" style={{ padding: '0.9rem 1.8rem', fontSize: '1rem' }}>Explore Categories</Link>
            </div>
          </div>
          <div style={{ flex: '1 1 280px', minWidth: '0', width: '100%' }}>
            <div style={{ position: 'relative', height: 'auto', aspectRatio: '4/3', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
              <img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1470&auto=format&fit=crop" alt="Premium Lifestyle" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        </div>
      </section>


      {/* Categories */}
      <section className="container" style={{ padding: '5rem 1.5rem' }}>
        <div className="section-header">
          <h2 className="section-title">Shop by Category</h2>
        </div>
        <div className="categories-grid">
          {categories.slice(0, 8).map((cat, index) => {
            const colors = ['#2563EB', '#F97316', '#EC4899', '#22C55E', '#A855F7', '#06B6D4', '#EAB308', '#EF4444'];
            return (
              <Link to={`/category/${cat.slug}`} key={cat.uuid} className="category-card">
                <div className="category-icon" style={{ background: colors[index % colors.length] }}>{cat.icon || '🛍️'}</div>
                <div className="category-name">{cat.name}</div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Flash Sale */}
      <section className="container" style={{ padding: '0 1.5rem 3rem' }}>
        <div className="section-header" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h2 className="section-title" style={{ fontSize: '1.8rem', textTransform: 'none', letterSpacing: '0' }}><span style={{ color: '#EAB308', textShadow: 'none' }}>⚡</span> Flash Sale</h2>
            <div style={{ background: '#EF4444', color: 'white', padding: '4px 12px', borderRadius: '4px', fontWeight: 700, fontSize: '0.9rem' }}>02 : 45 : 30</div>
          </div>
          <Link to="/products" style={{ color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>View All <span>→</span></Link>
        </div>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>
        ) : (
          <div className="grid-cols-4">
            {products.slice(0, 6).map(product => (
              <ProductCard key={product.uuid || product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Best Sellers */}
      <section className="container" style={{ padding: '0 1.5rem 5rem' }}>
        <div className="section-header" style={{ marginBottom: '1.5rem' }}>
          <h2 className="section-title" style={{ fontSize: '1.8rem', textTransform: 'none', letterSpacing: '0', color: '#FFF' }}>Best Sellers</h2>
          <Link to="/products" style={{ color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>View All <span>→</span></Link>
        </div>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>
        ) : (
          <div className="grid-cols-4">
            {products.slice(6, 12).map(product => (
              <ProductCard key={product.uuid || product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
