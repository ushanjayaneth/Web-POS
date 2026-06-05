import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiHeart, FiShoppingCart, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuthStore, useCartStore } from '../store';
import { formatCurrency, getImageUrl, getProductId, getProductPrice, summarizeText } from '../utils/catalog';

const Wishlist = () => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCartStore();
  const { isAuthenticated, isLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchWishlist = async () => {
      if (isLoading) return;

      if (!isAuthenticated) {
        toast.error('Please login to view your wishlist');
        navigate('/login');
        return;
      }

      try {
        const res = await api.get('/wishlist');
        if (res.success) setWishlist(res.data || []);
      } catch {
        toast.error('Wishlist could not be loaded');
      } finally {
        setLoading(false);
      }
    };

    fetchWishlist();
  }, [isAuthenticated, isLoading, navigate]);

  const handleRemove = async (productId) => {
    try {
      const res = await api.post('/wishlist/toggle', { product_id: productId });
      if (res.success) {
        setWishlist((items) => items.filter((item) => getProductId(item) !== productId));
        toast.success('Removed from wishlist');
      }
    } catch {
      toast.error('Item could not be removed');
    }
  };

  const handleAddToCart = async (productId) => {
    try {
      await addToCart(productId, 1);
      toast.success('Added to cart');
    } catch (err) {
      toast.error(err.message || 'Item could not be added');
    }
  };

  if (loading || isLoading) {
    return <div className="container page-loader">Loading wishlist...</div>;
  }

  return (
    <div className="container wishlist-page">
      <Helmet>
        <title>Wishlist | ShoppingLK</title>
      </Helmet>

      <div className="page-heading">
        <p className="eyebrow">Saved items</p>
        <h1>Wishlist</h1>
      </div>

      {wishlist.length === 0 ? (
        <div className="empty-state page-empty">
          <FiHeart />
          <h2>Your wishlist is empty</h2>
          <p>Save products you like and review them here later.</p>
          <Link to="/products" className="btn btn-primary">Browse products</Link>
        </div>
      ) : (
        <div className="product-grid">
          {wishlist.map((product) => {
            const productId = getProductId(product);
            const { activePrice, price, hasSale } = getProductPrice(product);

            return (
              <article key={productId} className="wishlist-card">
                <Link to={`/product/${product.slug || productId}`} className="wishlist-image">
                  <img src={getImageUrl(product.images?.[0])} alt={product.name} />
                </Link>
                <div className="wishlist-info">
                  <span>{product.category_name || 'ShoppingLK'}</span>
                  <Link to={`/product/${product.slug || productId}`} className="wishlist-title">
                    {product.name}
                  </Link>
                  <p>{summarizeText(product.short_description || product.description || '', 88)}</p>
                  <div className="price-stack">
                    <strong>{formatCurrency(activePrice)}</strong>
                    {hasSale && <small>{formatCurrency(price)}</small>}
                  </div>
                  <div className="wishlist-actions">
                    <button type="button" className="btn btn-primary" onClick={() => handleAddToCart(productId)}>
                      <FiShoppingCart />
                      Add
                    </button>
                    <button type="button" className="icon-button danger" onClick={() => handleRemove(productId)} aria-label="Remove from wishlist">
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
