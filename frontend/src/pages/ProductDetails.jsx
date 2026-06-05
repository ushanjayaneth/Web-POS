import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import api from '../utils/api';
import { useCartStore, useAuthStore } from '../store';
import { FiShoppingCart, FiHeart, FiStar, FiCheck, FiTruck, FiShield } from 'react-icons/fi';
import toast from 'react-hot-toast';

const ProductDetails = () => {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCartStore();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await api.get(`/products/${slug}`);
        if (res.success) {
          setProduct(res.data);
        }
      } catch (err) {
        toast.error('Product not found');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [slug]);

  const handleAddToCart = async () => {
    try {
      await addToCart(product.id || product.uuid, quantity);
      toast.success('Added to cart successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to add to cart');
    }
  };

  if (loading) return <div className="container" style={{ padding: '5rem 0', textAlign: 'center' }}>Loading...</div>;
  if (!product) return <div className="container" style={{ padding: '5rem 0', textAlign: 'center' }}>Product not found</div>;

  const getImageUrl = (img) => {
    if (!img) return 'https://placehold.co/600x600/F1F3F5/868E96?text=No+Image';
    if (img.startsWith('http') || img.startsWith('data:')) return img;
    return import.meta.env.VITE_API_URL?.replace('/api', '') + img;
  };

  const images = product.images && product.images.length > 0 
    ? product.images.map(getImageUrl)
    : ['https://placehold.co/600x600/F1F3F5/868E96?text=No+Image'];

  return (
    <div className="container" style={{ padding: '3rem 1.5rem', animation: 'fadeIn 0.5s ease', position: 'relative', zIndex: 10 }}>
      <Helmet>
        <title>{product.name} | ShopLK</title>
        <meta name="description" content={product.short_description || product.description} />
      </Helmet>

      {/* Breadcrumbs */}
      <div style={{ marginBottom: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <Link to="/" style={{ color: 'var(--primary)' }}>Home</Link> <span>/</span> <Link to={`/category/${product.category_slug}`} style={{ color: 'var(--primary)' }}>{product.category_name}</Link> <span>/</span> <span style={{ color: 'var(--text-primary)' }}>{product.name}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: 'clamp(2rem, 5vw, 4rem)' }}>
        
        {/* Product Images gallery */}
        <div style={{ position: 'sticky', top: '100px' }}>
          <div className="glass-panel" style={{ padding: '2rem', marginBottom: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <img src={images[activeImage]} alt={product.name} style={{ width: '100%', height: 'auto', aspectRatio: '1/1', objectFit: 'contain', filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.5))' }} />
          </div>
          <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
            {images.map((img, idx) => (
              <div 
                key={idx} 
                onClick={() => setActiveImage(idx)}
                style={{ 
                  width: '80px', height: '80px', borderRadius: '16px', border: `2px solid ${activeImage === idx ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`, 
                  cursor: 'pointer', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-glass)', padding: '5px'
                }}
              >
                <img src={img} alt={`Thumb ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div>
          <div style={{ textTransform: 'uppercase', color: 'var(--secondary)', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '2px', marginBottom: '1rem', textShadow: '0 0 10px var(--secondary-alpha)' }}>
            {product.brand || 'Premium Tech'}
          </div>
          <h1 style={{ fontSize: '3rem', marginBottom: '1.5rem', lineHeight: 1.1, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{product.name}</h1>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-glass)', padding: '6px 12px', borderRadius: '50px', border: 'var(--border-glass)' }}>
              <FiStar fill="var(--primary)" color="var(--primary)" size={16} />
              <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}>{(product.rating_avg || 0).toFixed(1)}</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>({product.rating_count || 0} Reviews)</span>
            </div>
            <span style={{ color: product.stock > 0 ? 'var(--accent-success)' : 'var(--accent-danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-glass)', padding: '6px 12px', borderRadius: '50px', border: 'var(--border-glass)' }}>
              {product.stock > 0 ? <><FiCheck /> In Stock ({product.stock})</> : 'Out of Stock'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5rem', marginBottom: '2.5rem', paddingBottom: '2.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ fontSize: '3.5rem', fontWeight: 800, color: '#FFF', lineHeight: 1, textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>
              Rs. {product.sale_price ? product.sale_price.toLocaleString() : product.price.toLocaleString()}
            </span>
            {product.sale_price && (
              <span style={{ fontSize: '1.4rem', color: 'var(--text-muted)', textDecoration: 'line-through', marginBottom: '0.4rem' }}>
                Rs. {product.price.toLocaleString()}
              </span>
            )}
          </div>

          <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', marginBottom: '3rem', lineHeight: 1.8 }}>
            {product.short_description || product.description?.substring(0, 150) + '...'}
          </p>

          <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50px', background: 'rgba(0,0,0,0.3)' }}>
              <button 
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                style={{ padding: '1rem 1.5rem', fontSize: '1.2rem', color: 'var(--primary)' }}
              >-</button>
              <span style={{ padding: '0 1rem', fontWeight: 700, fontSize: '1.2rem', minWidth: '40px', textAlign: 'center' }}>{quantity}</span>
              <button 
                onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
                style={{ padding: '1rem 1.5rem', fontSize: '1.2rem', color: 'var(--primary)' }}
              >+</button>
            </div>
            
            <button 
              onClick={handleAddToCart} 
              disabled={product.stock === 0}
              className="btn btn-primary" 
              style={{ flex: 1, padding: '1.2rem', fontSize: '1.2rem', borderRadius: '50px', textTransform: 'uppercase', letterSpacing: '1px' }}
            >
              <FiShoppingCart size={22} style={{ marginRight: '10px' }} />
              Add to Cart
            </button>
            <button 
              onClick={async () => {
                try {
                  const res = await api.post('/wishlist/toggle', { product_id: product.id || product.uuid });
                  if (res.success) toast.success(res.message, { icon: '❤️' });
                  else toast.error('Please login to use wishlist');
                } catch (e) {
                  toast.error('Please login to use wishlist');
                }
              }}
              className="btn-icon" 
              style={{ padding: '1.2rem', fontSize: '1.5rem', borderRadius: '50px', background: 'rgba(255,255,255,0.1)' }}
            >
              <FiHeart />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.2rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-alpha)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiTruck size={20} color="var(--primary)" />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Fast Delivery</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Islandwide shipping</div>
              </div>
            </div>
            <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.2rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--secondary-alpha)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiShield size={20} color="var(--secondary)" />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Secure Order</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>WhatsApp checkout</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description Section */}
      <div className="glass-panel" style={{ marginTop: '5rem', padding: '4rem' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '2rem', color: 'var(--primary)' }}>Product Details</h2>
        <div style={{ color: 'var(--text-secondary)', lineHeight: 1.9, fontSize: '1.1rem', whiteSpace: 'pre-line' }}>
          {product.description}
        </div>
      </div>

      {/* Reviews Section */}
      <ProductReviews productId={product.id || product.uuid} />
    </div>
  );
};

const ProductReviews = ({ productId }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);
  const { isAuthenticated } = useAuthStore(state => state);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await api.get(`/reviews/product/${productId}`);
        if (res.success) setReviews(res.data);
      } catch (err) {
        console.error('Failed to load reviews');
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [productId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newReview.rating) return toast.error('Please provide a rating');
    setSubmitting(true);
    try {
      const res = await api.post('/reviews', { product_id: productId, ...newReview });
      if (res.success) {
        toast.success('Review submitted successfully!');
        setNewReview({ rating: 5, comment: '' });
        // Optimistically add review
        setReviews([{ id: Date.now(), ...newReview, first_name: 'You', created_at: Date.now() }, ...reviews]);
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-panel" style={{ marginTop: '3rem', padding: '4rem' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Customer Reviews</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem' }}>
        <div>
          {loading ? (
            <p>Loading reviews...</p>
          ) : reviews.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No reviews yet. Be the first to review this product!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {reviews.map(review => (
                <div key={review.id} style={{ padding: '1.5rem', background: 'var(--bg-glass)', borderRadius: '12px', border: 'var(--border-glass)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <strong style={{ color: '#FFF' }}>{review.first_name} {review.last_name || ''}</strong>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {[1,2,3,4,5].map(star => (
                        <FiStar key={star} fill={star <= review.rating ? "var(--primary)" : "none"} color={star <= review.rating ? "var(--primary)" : "var(--text-muted)"} size={14} />
                      ))}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    {new Date(review.created_at).toLocaleDateString()}
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{review.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 style={{ marginBottom: '1.5rem' }}>Write a Review</h3>
          {isAuthenticated ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Rating</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[1,2,3,4,5].map(star => (
                    <FiStar 
                      key={star} 
                      fill={star <= newReview.rating ? "var(--primary)" : "none"} 
                      color={star <= newReview.rating ? "var(--primary)" : "var(--text-muted)"} 
                      size={24} 
                      style={{ cursor: 'pointer' }}
                      onClick={() => setNewReview({...newReview, rating: star})}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Comment (Optional)</label>
                <textarea 
                  rows="4" 
                  value={newReview.comment}
                  onChange={(e) => setNewReview({...newReview, comment: e.target.value})}
                  style={{ width: '100%', padding: '1rem', background: 'var(--bg-glass)', border: 'var(--border-glass)', borderRadius: '8px', color: '#FFF' }}
                  placeholder="Share your thoughts about this product..."
                ></textarea>
              </div>
              <button type="submit" disabled={submitting} className="btn btn-primary" style={{ padding: '1rem' }}>
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          ) : (
            <div style={{ padding: '2rem', background: 'var(--bg-glass)', borderRadius: '12px', border: 'var(--border-glass)', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Please log in to write a review.</p>
              <Link to="/login" className="btn btn-primary">Log In</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
