import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiArrowRight, FiSearch, FiSliders } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../utils/api';
import ProductCard from '../components/ProductCard';
import { getProductPrice } from '../utils/catalog';

const formatTitle = (value) => {
  if (!value) return 'All products';
  return value.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('newest');
  const { categorySlug } = useParams();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const [search, setSearch] = useState(searchQuery);
  const navigate = useNavigate();

  useEffect(() => {
    setSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const fetchProducts = async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        let endpoint = `/products?limit=100&_ts=${Date.now()}`;
        if (categorySlug) endpoint += `&category=${encodeURIComponent(categorySlug)}`;
        if (searchQuery) endpoint += `&search=${encodeURIComponent(searchQuery)}`;

        const productRes = await api.get(endpoint);
        if (productRes.success) setProducts(productRes.data || []);
      } catch {
        toast.error('Products could not be loaded');
      } finally {
        if (showLoading) setLoading(false);
      }
    };

    const fetchCategories = async () => {
      try {
        const categoryRes = await api.get(`/categories?_ts=${Date.now()}`);
        if (categoryRes.success) {
          setCategories((categoryRes.data || []).filter((category) => category.is_active !== 0));
        }
      } catch {
        setCategories([]);
      }
    };

    fetchProducts(true);
    fetchCategories();

    const refreshTimer = window.setInterval(() => fetchProducts(false), 15000);
    const refreshOnFocus = () => fetchProducts(false);
    window.addEventListener('focus', refreshOnFocus);

    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener('focus', refreshOnFocus);
    };
  }, [categorySlug, searchQuery]);

  const sortedProducts = useMemo(() => {
    const list = [...products];
    if (sort === 'price-low') {
      list.sort((a, b) => getProductPrice(a).activePrice - getProductPrice(b).activePrice);
    }
    if (sort === 'price-high') {
      list.sort((a, b) => getProductPrice(b).activePrice - getProductPrice(a).activePrice);
    }
    if (sort === 'name') {
      list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    }
    return list;
  }, [products, sort]);

  const submitSearch = (event) => {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/products?search=${encodeURIComponent(query)}` : '/products');
  };

  const title = searchQuery ? `Search results for "${searchQuery}"` : formatTitle(categorySlug);

  return (
    <div className="container catalog-page">
      <Helmet>
        <title>{title} | ShoppingLK</title>
      </Helmet>

      <div className="catalog-hero">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1>{title}</h1>
          <p>Browse available stock, compare prices, and add your picks to cart.</p>
        </div>
        <div className="catalog-count">
          {sortedProducts.length} {sortedProducts.length === 1 ? 'item' : 'items'}
        </div>
      </div>

      <div className="catalog-toolbar">
        <form className="catalog-search" onSubmit={submitSearch}>
          <FiSearch />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search catalog"
            aria-label="Search catalog"
          />
        </form>

        <label className="sort-control">
          <FiSliders />
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="newest">Newest</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>

      {categories.length > 0 && (
        <div className="category-tabs" aria-label="Product categories">
          <Link to="/products" className={!categorySlug ? 'active' : ''}>All</Link>
          {categories.map((category) => (
            <Link
              key={category.uuid || category.id || category.slug}
              to={`/category/${category.slug}`}
              className={categorySlug === category.slug ? 'active' : ''}
            >
              {category.name}
            </Link>
          ))}
        </div>
      )}

      {loading ? (
        <div className="catalog-state">Loading products...</div>
      ) : sortedProducts.length === 0 ? (
        <div className="empty-state catalog-empty">
          <h2>No products found</h2>
          <p>Try a different search or check back when new products are available.</p>
          <Link to="/products" className="btn btn-primary">
            Reset catalog <FiArrowRight />
          </Link>
        </div>
      ) : (
        <div className="product-grid">
          {sortedProducts.map((product) => (
            <ProductCard key={product.uuid || product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Products;
