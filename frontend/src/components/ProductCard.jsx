import React from 'react';
import { Link } from 'react-router-dom';
import { FiHeart, FiShoppingCart, FiStar } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useCartStore } from '../store';

const getImageUrl = (img) => {
  if (!img) return 'https://placehold.co/600x600/111827/94A3B8?text=No+Image';
  if (img.startsWith('http') || img.startsWith('data:')) return img;
  return `${(import.meta.env.VITE_API_URL || '').replace('/api', '')}${img}`;
};

const formatCurrency = (value) => `LKR ${Number(value || 0).toLocaleString()}`;

const ProductCard = ({ product }) => {
  const { addToCart } = useCartStore();
  const productId = product.id || product.uuid;
  const price = Number(product.price || 0);
  const salePrice = product.sale_price ? Number(product.sale_price) : null;
  const displayPrice = salePrice || price;
  const stock = Number(product.stock || 0);
  const discount = salePrice && price > salePrice
    ? Math.round(((price - salePrice) / price) * 100)
    : 0;

  const handleAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await addToCart(productId, 1);
      toast.success('Added to cart');
    } catch (err) {
      toast.error(err.message || 'Failed to add');
    }
  };

  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const res = await api.post('/wishlist/toggle', { product_id: productId });
      if (res.success) toast.success(res.message);
      else toast.error('Please login to use wishlist');
    } catch {
      toast.error('Please login to use wishlist');
    }
  };

  return (
    <Link to={`/product/${product.slug || productId}`} className="product-card animate-fade-in">
      <div className="product-image-wrap">
        <img src={getImageUrl(product.images?.[0])} alt={product.name} className="product-image" loading="lazy" />

        <div className="product-badges">
          {discount > 0 && <span className="badge badge-sale">-{discount}%</span>}
          {product.is_featured === 1 && discount === 0 && <span className="badge badge-new">Featured</span>}
        </div>

        <div className={`stock-pill ${stock > 0 ? 'in-stock' : 'out-stock'}`}>
          {stock > 0 ? `${stock} in stock` : 'Out of stock'}
        </div>
      </div>

      <div className="product-info">
        <div className="product-meta-row">
          <span className="product-category">{product.category_name || 'ShopLK'}</span>
          <span className="product-rating">
            <FiStar fill="currentColor" size={13} />
            {(product.rating_avg || 0).toFixed(1)}
          </span>
        </div>

        <h3 className="product-title">{product.name}</h3>

        {product.description && (
          <p className="product-summary">{product.description}</p>
        )}

        <div className="product-price-row">
          <div>
            <span className="price-current">{formatCurrency(displayPrice)}</span>
            {salePrice && <span className="price-old">{formatCurrency(price)}</span>}
          </div>
        </div>

        <div className="product-card-actions">
          <button className="product-action secondary" onClick={handleWishlist} aria-label="Add to wishlist">
            <FiHeart />
          </button>
          <button className="product-action primary" onClick={handleAdd} disabled={stock <= 0}>
            <FiShoppingCart />
            <span>{stock > 0 ? 'Add' : 'Sold out'}</span>
          </button>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
