import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiArrowRight, FiMinus, FiPlus, FiShoppingBag, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useCartStore } from '../store';
import { formatCurrency, getImageUrl } from '../utils/catalog';

const Cart = () => {
  const { items, subtotal, isLoading, updateQuantity, removeFromCart } = useCartStore();

  const handleUpdateQty = async (id, current, change, max) => {
    const nextQuantity = current + change;
    if (nextQuantity < 1 || nextQuantity > max) return;

    try {
      await updateQuantity(id, nextQuantity);
    } catch (err) {
      toast.error(err.message || 'Quantity could not be updated');
    }
  };

  const handleRemove = async (id) => {
    try {
      await removeFromCart(id);
      toast.success('Item removed');
    } catch {
      toast.error('Item could not be removed');
    }
  };

  if (isLoading) {
    return <div className="container page-loader">Loading cart...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="container empty-state page-empty">
        <Helmet><title>Your Cart | ShoppingLK</title></Helmet>
        <FiShoppingBag />
        <h1>Your cart is empty</h1>
        <p>Add products to your cart and come back here to checkout.</p>
        <Link to="/products" className="btn btn-primary">Continue shopping</Link>
      </div>
    );
  }

  const shipping = subtotal > 5000 ? 0 : 350;
  const total = subtotal + shipping;

  return (
    <div className="container cart-page">
      <Helmet><title>Your Cart ({items.length}) | ShoppingLK</title></Helmet>

      <div className="page-heading">
        <p className="eyebrow">Shopping bag</p>
        <h1>Your cart</h1>
      </div>

      <div className="cart-layout">
        <div className="cart-items">
          {items.map((item) => {
            const unitPrice = Number(item.sale_price || item.price || 0);
            const lineTotal = unitPrice * Number(item.quantity || 1);
            const maxStock = Number(item.stock || item.quantity || 1);

            return (
              <article className="cart-item" key={item.id}>
                <Link to={`/product/${item.slug}`} className="cart-item-image">
                  <img src={getImageUrl(item.images?.[0])} alt={item.name} />
                </Link>

                <div className="cart-item-main">
                  <Link to={`/product/${item.slug}`} className="cart-item-title">{item.name}</Link>
                  <p>{item.seller_name ? `Sold by ${item.seller_name}` : 'ShoppingLK product'}</p>

                  <div className="cart-row-actions">
                    <div className="quantity-stepper small">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, item.quantity, -1, maxStock)}
                        aria-label="Decrease quantity"
                      >
                        <FiMinus />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, item.quantity, 1, maxStock)}
                        aria-label="Increase quantity"
                        disabled={item.quantity >= maxStock}
                      >
                        <FiPlus />
                      </button>
                    </div>
                    <button type="button" className="remove-button" onClick={() => handleRemove(item.id)}>
                      <FiTrash2 />
                      Remove
                    </button>
                  </div>
                </div>

                <div className="cart-item-price">
                  <strong>{formatCurrency(unitPrice)}</strong>
                  {item.quantity > 1 && <span>{formatCurrency(lineTotal)}</span>}
                </div>
              </article>
            );
          })}
        </div>

        <aside className="summary-panel">
          <h2>Order summary</h2>
          <div className="summary-line">
            <span>Subtotal</span>
            <strong>{formatCurrency(subtotal)}</strong>
          </div>
          <div className="summary-line">
            <span>Shipping</span>
            <strong className={shipping === 0 ? 'success-text' : ''}>
              {shipping === 0 ? 'Free' : formatCurrency(shipping)}
            </strong>
          </div>
          {shipping > 0 && (
            <p className="summary-note">
              Add {formatCurrency(5000 - subtotal)} more for free shipping.
            </p>
          )}
          <div className="summary-total">
            <span>Total</span>
            <strong>{formatCurrency(total)}</strong>
          </div>
          <Link to="/checkout" className="btn btn-primary checkout-button">
            Checkout <FiArrowRight />
          </Link>
        </aside>
      </div>
    </div>
  );
};

export default Cart;
