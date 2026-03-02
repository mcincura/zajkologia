import React from 'react';
// Product card component — displays product image, price and buy button.
// Clicking anywhere except the buy button navigates to the product page.
import { useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';

const ProductCard = ({ product, accentColor = '#eccfc3' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const from = location.pathname + location.search;
  const destination = `/product/${product.slug}`;

  const handleNavigate = () => {
    navigate(destination, { state: { from } });
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleNavigate();
    }
  };

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={handleNavigate}
      onKeyDown={handleKeyDown}
      style={{
  backgroundColor: accentColor,
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow)',
        transition: 'transform 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          width: '100%',
          aspectRatio: '4 / 4.8',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <img
          src={product.image}
          alt={product.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            position: 'absolute',
            inset: 0,
            transition: 'transform 0.3s ease',
            borderBottom: '4px solid #eccfc3',
          }}
          onMouseOver={(e) => (e.target.style.transform = 'scale(1.05)')}
          onMouseOut={(e) => (e.target.style.transform = 'scale(1)')}
        />
      </div>

      <div
        style={{
          padding: '0.6rem 1.5rem 1rem',
          borderTop: '1px solid #eccfc3',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
        }}
      >
        <div
          style={{
            fontSize: '0.8rem',
            fontWeight: '700',
            color: '#6b4c3b',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          PRODUKT
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <span style={{ color: '#6b4c3b', fontSize: '1.35rem', fontWeight: 700 }}>
            {product.price}
          </span>
          <a
            href={product.buyUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#fdf6f6',
              color: '#6b4c3b',
              border: '2px solid #eccfc3',
              padding: '0.6rem 1.1rem',
              borderRadius: '999px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <ShoppingCart size={16} /> Kúpiť
          </a>
        </div>
      </div>
  </article>
  );
}

export default ProductCard;
