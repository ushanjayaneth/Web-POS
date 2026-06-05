import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import api from '../utils/api';
import { useCartStore } from '../store';
import { FiShoppingCart, FiHeart, FiStar, FiFilter } from 'react-icons/fi';
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
        </div>
        <div className="product-price-row">
          <span className="price-current">LKR {product.sale_price ? product.sale_price.toLocaleString() : product.price.toLocaleString()}</span>
          {product.sale_price && <span className="price-old">LKR {product.price.toLocaleString()}</span>}
        </div>
      </div>
    </Link>
  );
};

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { categorySlug } = useParams();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search');

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        let endpoint = '/products?limit=100';
        if (categorySlug) endpoint += `&category=${categorySlug}`;
        if (searchQuery) endpoint += `&search=${searchQuery}`;
        
        const res = await api.get(endpoint);
        if (res.success) {
          setProducts(res.data);
        }
      } catch (err) {
        toast.error('Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [categorySlug, searchQuery]);

  return (
    <div style={{ padding: '3rem 1.5rem', minHeight: '80vh' }} className="container">
      <Helmet>
        <title>{categorySlug ? `${categorySlug.toUpperCase()} - ShopLK` : 'All Products - ShopLK'}</title>
      </Helmet>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', margin: 0 }}>
          {searchQuery ? `Search Results for "${searchQuery}"` : categorySlug ? categorySlug.toUpperCase() : 'All Products'}
        </h1>
        <div style={{ color: 'var(--text-secondary)' }}>
          {products.length} {products.length === 1 ? 'Product' : 'Products'} Found
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem 0', fontSize: '1.2rem', color: 'var(--primary)' }}>Loading products...</div>
      ) : products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '5rem 0', background: 'var(--bg-card)', borderRadius: '16px', border: 'var(--border-glass)' }}>
          <h2 style={{ marginBottom: '1rem' }}>No products found</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>We couldn't find any products matching your criteria.</p>
          <Link to="/" className="btn btn-primary">Go Back Home</Link>
        </div>
      ) : (
        <div className="grid-cols-4">
          {products.map(product => (
            <ProductCard key={product.uuid || product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Products;
