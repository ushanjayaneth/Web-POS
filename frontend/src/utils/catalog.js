const apiBase = import.meta.env.VITE_API_URL
  || (import.meta.env.PROD ? 'https://web-pos-henna.vercel.app/api' : '/api');

export const assetBaseUrl = apiBase.replace(/\/api\/?$/, '');

export const fallbackProductImage =
  'https://images.unsplash.com/photo-1607083206968-13611e3d76db?q=80&w=900&auto=format&fit=crop';

export const getImageUrl = (image) => {
  if (!image) return fallbackProductImage;
  if (image.startsWith('http') || image.startsWith('data:')) return image;
  return `${assetBaseUrl}${image}`;
};

export const getProductId = (product) => product?.id || product?.uuid;

export const getProductPrice = (product) => {
  const price = Number(product?.price || 0);
  const salePrice = product?.sale_price ? Number(product.sale_price) : null;
  return {
    price,
    salePrice,
    activePrice: salePrice || price,
    hasSale: Boolean(salePrice && salePrice < price),
  };
};

export const formatCurrency = (value) => `LKR ${Number(value || 0).toLocaleString()}`;

export const summarizeText = (value, limit = 120) => {
  const text = String(value || '').replace(/<[^>]*>/g, '').trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).trim()}...`;
};
