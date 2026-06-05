import React from 'react';
import { Link } from 'react-router-dom';
import { FiHeart, FiShoppingCart, FiStar } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useCartStore } from '../store';
import {
  formatCurrency,
  getImageUrl,
  getProductId,
  getProductPrice,
  summarizeText,
} from '../utils/catalog';

const ProductCard = ({ product }) => {
  const { addToCart } = useCartStore();
  const productId = getProductId(product);
  const stock = Number(product.stock || 0);
  const { price, salePrice, activePrice, hasSale } = getProductPrice(product);
  const discount = hasSale ? Math.round(((price - salePrice) / price) * 100) : 0;
  const rating = Number(product.rating_avg || 0);

  const handleAdd = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      await addToCart(productId, 1);
      toast.success('Added to cart');
    } catch (err) {
      toast.error(err.message || 'Please login to add items');
    }
  };

  const handleWishlist = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      const res = await api.post('/wishlist/toggle', { product_id: productId });
      if (res.success) toast.success(res.message || 'Wishlist updated');
      else toast.error('Please login to use wishlist');
    } catch {
      toast.error('Please login to use wishlist');
    }
  };

  return (
    <Link to={`/product/${product.slug || productId}`} className="product-card">
      <div className="product-media">
        <img
          src={getImageUrl(product.images?.[0])}
          alt={product.name}
          className="product-image"
          loading="lazy"
        />

        <div className="product-badges">
          {discount > 0 && <span className="badge badge-sale">{discount}% off</span>}
          {product.is_featured === 1 && !discount && <span className="badge badge-featured">Featured</span>}
        </div>

        <button
          type="button"
          className="icon-button product-wishlist"
          onClick={handleWishlist}
          aria-label="Add to wishlist"
        >
          <FiHeart />
        </button>
      </div>

      <div className="product-info">
        <div className="product-meta-row">
          <span className="product-category">{product.category_name || 'ShoppingLK'}</span>
          <span className="product-rating">
            <FiStar aria-hidden="true" />
            {rating.toFixed(1)}
          </span>
        </div>

        <h3 className="product-title">{product.name}</h3>

        <p className="product-summary">
          {summarizeText(product.short_description || product.description || 'Quality item available now.')}
        </p>

        <div className="product-price-row">
          <div className="price-stack">
            <span className="price-current">{formatCurrency(activePrice)}</span>
            {hasSale && <span className="price-old">{formatCurrency(price)}</span>}
          </div>
          <span className={stock > 0 ? 'stock-chip in-stock' : 'stock-chip out-stock'}>
            {stock > 0 ? `${stock} left` : 'Sold out'}
          </span>
        </div>

        <button
          type="button"
          className="btn btn-primary product-add"
          onClick={handleAdd}
          disabled={stock <= 0}
        >
          <FiShoppingCart />
          <span>{stock > 0 ? 'Add to cart' : 'Unavailable'}</span>
        </button>
      </div>
    </Link>
  );
};

export default ProductCard;
