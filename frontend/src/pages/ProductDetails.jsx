import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  FiCheck,
  FiHeart,
  FiMinus,
  FiPlus,
  FiShield,
  FiShoppingCart,
  FiStar,
  FiTruck,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuthStore, useCartStore } from '../store';
import {
  formatCurrency,
  getImageUrl,
  getProductId,
  getProductPrice,
  summarizeText,
} from '../utils/catalog';

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
        if (res.success) setProduct(res.data);
      } catch {
        toast.error('Product not found');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [slug]);

  const images = useMemo(() => {
    if (!product?.images?.length) return [getImageUrl(null)];
    return product.images.map(getImageUrl);
  }, [product]);

  const handleAddToCart = async () => {
    try {
      await addToCart(getProductId(product), quantity);
      toast.success('Added to cart');
    } catch (err) {
      toast.error(err.message || 'Please login to add items');
    }
  };

  const handleWishlist = async () => {
    try {
      const res = await api.post('/wishlist/toggle', { product_id: getProductId(product) });
      if (res.success) toast.success(res.message || 'Wishlist updated');
      else toast.error('Please login to use wishlist');
    } catch {
      toast.error('Please login to use wishlist');
    }
  };

  if (loading) {
    return <div className="container page-loader">Loading product...</div>;
  }

  if (!product) {
    return (
      <div className="container empty-state page-empty">
        <h1>Product not found</h1>
        <p>The product may be unavailable or removed.</p>
        <Link to="/products" className="btn btn-primary">Browse products</Link>
      </div>
    );
  }

  const stock = Number(product.stock || 0);
  const { price, activePrice, hasSale } = getProductPrice(product);
  const description = product.description || product.short_description || 'Product details will be updated soon.';
  const rating = Number(product.rating_avg || 0);

  return (
    <div className="container product-detail-page">
      <Helmet>
        <title>{product.name} | ShoppingLK</title>
        <meta name="description" content={summarizeText(product.short_description || product.description, 150)} />
      </Helmet>

      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/products">Products</Link>
        {product.category_slug && (
          <>
            <span>/</span>
            <Link to={`/category/${product.category_slug}`}>{product.category_name}</Link>
          </>
        )}
      </nav>

      <section className="product-detail-grid">
        <div className="product-gallery">
          <div className="gallery-main">
            <img src={images[activeImage]} alt={product.name} />
          </div>
          {images.length > 1 && (
            <div className="gallery-thumbs">
              {images.map((image, index) => (
                <button
                  type="button"
                  key={image}
                  className={activeImage === index ? 'active' : ''}
                  onClick={() => setActiveImage(index)}
                  aria-label={`View product image ${index + 1}`}
                >
                  <img src={image} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="product-detail-info">
          <p className="eyebrow">{product.brand || product.category_name || 'ShoppingLK'}</p>
          <h1>{product.name}</h1>

          <div className="detail-meta">
            <span className="rating-pill">
              <FiStar />
              {rating.toFixed(1)}
              <small>({product.rating_count || 0} reviews)</small>
            </span>
            <span className={stock > 0 ? 'availability in-stock' : 'availability out-stock'}>
              {stock > 0 ? <><FiCheck /> In stock</> : 'Out of stock'}
            </span>
          </div>

          <div className="detail-price">
            <strong>{formatCurrency(activePrice)}</strong>
            {hasSale && <span>{formatCurrency(price)}</span>}
          </div>

          <p className="detail-summary">
            {summarizeText(product.short_description || product.description, 220)}
          </p>

          <div className="purchase-panel">
            <div className="quantity-stepper" aria-label="Quantity">
              <button
                type="button"
                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                aria-label="Decrease quantity"
              >
                <FiMinus />
              </button>
              <span>{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((current) => Math.min(stock || 1, current + 1))}
                aria-label="Increase quantity"
                disabled={stock <= quantity}
              >
                <FiPlus />
              </button>
            </div>

            <button
              type="button"
              className="btn btn-primary detail-add"
              onClick={handleAddToCart}
              disabled={stock <= 0}
            >
              <FiShoppingCart />
              Add to cart
            </button>

            <button type="button" className="icon-button detail-heart" onClick={handleWishlist} aria-label="Add to wishlist">
              <FiHeart />
            </button>
          </div>

          <div className="promise-grid">
            <div className="promise-item">
              <FiTruck />
              <div>
                <strong>Delivery</strong>
                <span>Islandwide order handling</span>
              </div>
            </div>
            <div className="promise-item">
              <FiShield />
              <div>
                <strong>Secure order</strong>
                <span>Protected account checkout</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="content-panel product-description">
        <h2>Product details</h2>
        <p>{description}</p>
      </section>

      <ProductReviews productId={getProductId(product)} />
    </div>
  );
};

const ProductReviews = ({ productId }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await api.get(`/reviews/product/${productId}`);
        if (res.success) setReviews(res.data || []);
      } catch {
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [productId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!newReview.rating) return toast.error('Please choose a rating');

    setSubmitting(true);
    try {
      const res = await api.post('/reviews', { product_id: productId, ...newReview });
      if (res.success) {
        toast.success('Review submitted');
        setReviews([
          { id: Date.now(), ...newReview, first_name: 'You', created_at: new Date().toISOString() },
          ...reviews,
        ]);
        setNewReview({ rating: 5, comment: '' });
      } else {
        toast.error(res.message || 'Review could not be submitted');
      }
    } catch (err) {
      toast.error(err.message || 'Review could not be submitted');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="content-panel reviews-panel">
      <div className="section-header compact">
        <div>
          <p className="eyebrow">Feedback</p>
          <h2 className="section-title">Customer reviews</h2>
        </div>
      </div>

      <div className="reviews-grid">
        <div className="review-list">
          {loading ? (
            <p className="muted">Loading reviews...</p>
          ) : reviews.length === 0 ? (
            <p className="muted">No reviews yet.</p>
          ) : (
            reviews.map((review) => (
              <article className="review-card" key={review.id}>
                <div className="review-head">
                  <strong>{review.first_name} {review.last_name || ''}</strong>
                  <div className="stars" aria-label={`${review.rating} star rating`}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <FiStar key={star} className={star <= review.rating ? 'filled' : ''} />
                    ))}
                  </div>
                </div>
                <time>{new Date(review.created_at).toLocaleDateString()}</time>
                {review.comment && <p>{review.comment}</p>}
              </article>
            ))
          )}
        </div>

        <div className="review-form-wrap">
          <h3>Write a review</h3>
          {isAuthenticated ? (
            <form onSubmit={handleSubmit} className="review-form">
              <label>
                Rating
                <div className="rating-picker">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setNewReview({ ...newReview, rating: star })}
                      aria-label={`${star} star`}
                    >
                      <FiStar className={star <= newReview.rating ? 'filled' : ''} />
                    </button>
                  ))}
                </div>
              </label>
              <label>
                Comment
                <textarea
                  rows="4"
                  value={newReview.comment}
                  onChange={(event) => setNewReview({ ...newReview, comment: event.target.value })}
                  placeholder="Share your thoughts"
                />
              </label>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit review'}
              </button>
            </form>
          ) : (
            <div className="login-prompt">
              <p>Login to write a review.</p>
              <Link to="/login" className="btn btn-primary">Login</Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ProductDetails;
