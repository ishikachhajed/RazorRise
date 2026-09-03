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
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        transition: 'box-shadow 0.2s, transform 0.2s',
        position: 'relative',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      }}
    >
      {/* Discount badge */}
      {product.discount && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            zIndex: 1,
            backgroundColor: '#EF4444',
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
          height: '140px',
          backgroundColor: '#F9FAFB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid #F3F4F6',
          overflow: 'hidden'
        }}
      >
        {product.thumbnail && !imgError ? (
          <img
            src={product.thumbnail}
            alt={product.title}
            onError={() => setImgError(true)}
            style={{ maxHeight: '120px', maxWidth: '100%', objectFit: 'contain', padding: '8px' }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: '#9CA3AF' }}>
            <ShoppingBag size={32} />
            <span style={{ fontSize: '10px' }}>No image</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>

        {/* Source badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
          {product.rating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#F59E0B' }}>
              <Star size={11} fill="#F59E0B" />
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#374151' }}>{product.rating}</span>
              {product.reviews && (
                <span style={{ fontSize: '10px', color: '#9CA3AF' }}>({product.reviews})</span>
              )}
            </div>
          )}
        </div>

        {/* Title */}
        <p
          style={{
            margin: 0,
            fontSize: '13px',
            fontWeight: 600,
            color: '#111827',
            lineHeight: '1.4',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {product.title}
        </p>

        {/* Pricing */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>
            {product.price}
          </span>
          {product.originalPrice && (
            <span style={{ fontSize: '12px', color: '#9CA3AF', textDecoration: 'line-through' }}>
              {product.originalPrice}
            </span>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={handleViewDeal}
          style={{
            marginTop: 'auto',
            width: '100%',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #283618',
            backgroundColor: 'transparent',
            color: '#283618',
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
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#283618';
            (e.currentTarget as HTMLButtonElement).style.color = 'white';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = '#283618';
          }}
        >
          <ExternalLink size={12} />
          View Deal
        </button>
      </div>
    </div>
  );
};
