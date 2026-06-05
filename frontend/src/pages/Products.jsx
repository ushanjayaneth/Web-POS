import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import api from '../utils/api';
import ProductCard from '../components/ProductCard';

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
        if (categorySlug) endpoint += `&category=${encodeURIComponent(categorySlug)}`;
        if (searchQuery) endpoint += `&search=${encodeURIComponent(searchQuery)}`;

        const res = await api.get(endpoint);
        if (res.success) setProducts(res.data || []);
      } catch {
        toast.error('Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [categorySlug, searchQuery]);

  const title = searchQuery
    ? `Search Results for "${searchQuery}"`
    : categorySlug
      ? categorySlug.replace(/-/g, ' ').toUpperCase()
      : 'All Products';

  return (
    <div className="catalog-page container">
      <Helmet>
        <title>{categorySlug ? `${title} - ShopLK` : 'All Products - ShopLK'}</title>
      </Helmet>

      <div className="catalog-header">
        <div>
          <p className="catalog-kicker">Live catalog</p>
          <h1>{title}</h1>
        </div>
        <div className="catalog-count">
          {products.length} {products.length === 1 ? 'Product' : 'Products'}
        </div>
      </div>

      {loading ? (
        <div className="catalog-state">Loading products...</div>
      ) : products.length === 0 ? (
        <div className="catalog-empty">
          <h2>No products found</h2>
          <p>Add active products from the POS stock screen and they will appear here automatically.</p>
          <Link to="/" className="btn btn-primary">Go Back Home</Link>
        </div>
      ) : (
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={product.uuid || product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Products;
