import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiShoppingCart, FiTrash2 } from 'react-icons/fi';
import api from '../utils/api';
import { useCartStore, useAuthStore } from '../store';
import toast from 'react-hot-toast';

const Wishlist = () => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Please login to view your wishlist');
      navigate('/login');
      return;
    }
    fetchWishlist();
  }, [isAuthenticated, navigate]);

  const fetchWishlist = async () => {
    try {
      const res = await api.get('/wishlist');
      if (res.success) {
        setWishlist(res.data);
      }
    } catch (err) {
      toast.error('Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (productId) => {
    try {
      const res = await api.post('/wishlist/toggle', { product_id: productId });
      if (res.success) {
        setWishlist(wishlist.filter(item => item.id !== productId));
        toast.success('Removed from wishlist');
      }
    } catch (err) {
      toast.error('Failed to remove item');
    }
  };

  const handleAddToCart = async (productId) => {
    try {
      await addToCart(productId, 1);
      toast.success('Added to cart!');
    } catch (err) {
      toast.error(err.message || 'Failed to add to cart');
    }
  };

  const getImageUrl = (img) => {
    if (!img) return 'https://placehold.co/400x400/F1F3F5/868E96?text=No+Image';
    if (img.startsWith('http') || img.startsWith('data:')) return img;
    return import.meta.env.VITE_API_URL?.replace('/api', '') + img;
  };

  if (loading) {
    return <div className="container" style={{ padding: '5rem 0', textAlign: 'center' }}>Loading wishlist...</div>;
  }

  return (
    <div className="container" style={{ padding: '3rem 1.5rem', minHeight: '80vh' }}>
      <Helmet>
        <title>My Wishlist - ShopLK</title>
      </Helmet>
      
      <h1 style={{ marginBottom: '2rem' }}>My Wishlist ❤️</h1>

      {wishlist.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '5rem 0', background: 'var(--bg-card)', borderRadius: '16px' }}>
          <h2 style={{ marginBottom: '1rem' }}>Your wishlist is empty</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Add items that you like to your wishlist. Review them anytime and easily move them to the cart.</p>
          <Link to="/products" className="btn btn-primary">Browse Products</Link>
        </div>
      ) : (
        <div className="grid-cols-4">
          {wishlist.map(product => (
            <div key={product.id} className="card product-card">
              <Link to={`/product/${product.slug}`} className="product-image-wrap">
                <img src={getImageUrl(product.images?.[0])} alt={product.name} className="product-image" loading="lazy" />
              </Link>
              <div className="product-info">
                <div className="product-category">{product.category_name}</div>
                <h3 className="product-title">{product.name}</h3>
                <div className="product-price-row">
                  <span className="price-current">LKR {product.sale_price ? product.sale_price.toLocaleString() : product.price.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button className="btn btn-primary" style={{ flex: 1, padding: '0.5rem' }} onClick={() => handleAddToCart(product.id)}>
                    <FiShoppingCart /> Add
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={() => handleRemove(product.id)}>
                    <FiTrash2 color="#EF4444" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
