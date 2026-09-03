import React, { useState } from 'react';
import { ExternalProduct } from '../services/api';
import { Star, ExternalLink, Tag, ShoppingBag, ImageOff } from 'lucide-react';

interface ExternalProductCardProps {
  product: ExternalProduct;
}

export const ExternalProductCard: React.FC<ExternalProductCardProps> = ({ product }) => {
  const [imgError, setImgError] = useState(false);

  const handleViewDeal = () => {
    if (product.productUrl && product.productUrl !== '#') {
      window.open(product.productUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const sourceColor = (source: string) => {
    const s = source.toLowerCase();
    if (s.includes('amazon')) return { bg: '#FFF8E7', text: '#C45500', border: '#F5CBA7' };
    if (s.includes('flipkart')) return { bg: '#EBF5FF', text: '#2874F0', border: '#BFDBFE' };
    if (s.includes('myntra')) return { bg: '#FFF0F6', text: '#E91E8C', border: '#F9A8D4' };
    if (s.includes('croma')) return { bg: '#F0FFF4', text: '#276749', border: '#B2F5EA' };
    return { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' };
  };

  const colors = sourceColor(product.source || '');

  return (
    <div
      style={{
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-card)',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        padding: '12px',
        gap: '16px',
        boxShadow: 'var(--shadow-sm)',
        transition: 'box-shadow 0.2s, transform 0.2s',
        position: 'relative',
        width: '100%',
        marginBottom: '8px'
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      }}
    >
      {/* Discount badge */}
      {product.discount && (
        <div
          style={{
            position: 'absolute',
            top: '-8px',
            left: '-8px',
            zIndex: 1,
            backgroundColor: 'var(--color-orange)',
            color: 'white',
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 7px',
            borderRadius: '20px',
            letterSpacing: '0.3px',
            display: 'flex',
            alignItems: 'center',
            gap: '3px'
          }}
        >
          <Tag size={9} />
          {product.discount}
        </div>
      )}

      {/* Thumbnail */}
      <div
        style={{
          width: '100px',
          height: '100px',
          backgroundColor: '#F9FAFB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          overflow: 'hidden',
          flexShrink: 0
        }}
      >
        {product.thumbnail && !imgError ? (
          <img
            src={product.thumbnail}
            alt={product.title}
            onError={() => setImgError(true)}
            style={{ maxHeight: '90px', maxWidth: '90px', objectFit: 'contain' }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: '#9CA3AF' }}>
            <ShoppingBag size={24} />
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {/* Title */}
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            lineHeight: '1.4',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {product.title}
        </p>

        {/* Pricing & Rating */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {product.price}
            </span>
            {product.originalPrice && (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                {product.originalPrice}
              </span>
            )}
          </div>

          {product.rating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#F59E0B' }}>
              <Star size={12} fill="#F59E0B" />
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>{product.rating}</span>
            </div>
          )}
        </div>
        
        {/* Source badge */}
        <div style={{ marginTop: '4px' }}>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '20px',
              backgroundColor: colors.bg,
              color: colors.text,
              border: `1px solid ${colors.border}`,
              letterSpacing: '0.2px'
            }}
          >
            via {product.source}
          </span>
        </div>
      </div>

      {/* CTA */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <button
          onClick={handleViewDeal}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid var(--color-plum)',
            backgroundColor: 'transparent',
            color: 'var(--color-plum)',
            fontWeight: 600,
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            transition: 'background-color 0.2s, color 0.2s'
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-plum)';
            (e.currentTarget as HTMLButtonElement).style.color = 'white';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-plum)';
          }}
        >
          <ExternalLink size={14} />
          View Deal
        </button>
      </div>
    </div>
  );
};
