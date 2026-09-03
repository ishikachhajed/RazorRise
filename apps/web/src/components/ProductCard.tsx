import React, { useState } from 'react';
import { Product } from '../services/api';
import { Star, ShoppingCart, Info, Sparkles, ChevronDown, ChevronUp, CheckCircle2, Package } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onAddToCart: (productId: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const [showExplanation, setShowExplanation] = useState(false);
  const [imgError, setImgError] = useState(false);

  const formattedPrice = `₹${product.price.toLocaleString('en-IN')}`;
  const originalPrice = product.discount > 0 
    ? `₹${Math.round(product.price / (1 - product.discount / 100)).toLocaleString('en-IN')}` 
    : null;

  return (
    <div className="card h-full flex flex-col justify-between" style={{ padding: '1.25rem' }}>
      
      {/* Top Banner Badges */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <span className="badge" style={{ backgroundColor: '#FAF5F6', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
          {product.category}
        </span>

        {product.matchScore ? (
          <div className="badge badge-ai" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={12} />
            <span>{product.matchScore}% Match</span>
          </div>
        ) : null}
      </div>

      {/* Product Image */}
      <div className="relative mb-4 rounded-md overflow-hidden" style={{ height: '120px', backgroundColor: '#FAF5F6', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {!imgError && product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px' }}
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted">
            <Package size={24} style={{ opacity: 0.6 }} />
            <span style={{ fontSize: '11px', fontWeight: 600 }}>{product.name}</span>
          </div>
        )}

        {product.discount > 0 && (
          <span style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: 'var(--color-sage)', color: 'var(--text-primary)', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px' }}>
            {product.discount}% OFF
          </span>
        )}
      </div>

      {/* Product Details */}
      <div className="flex-1" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold m-0" style={{ lineHeight: '1.2' }}>
            {product.name}
          </h3>
          <div className="flex items-center gap-1 text-sm font-bold" style={{ backgroundColor: 'var(--color-peach)', padding: '2px 6px', borderRadius: '6px' }}>
            <Star size={12} style={{ fill: 'currentColor' }} />
            <span>{product.rating}</span>
          </div>
        </div>

        <p className="text-xs text-muted m-0" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {product.description}
        </p>

        {/* Explainable AI Match Accordion */}
        {product.whyThis && product.whyThis.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setShowExplanation(!showExplanation)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: '8px', backgroundColor: '#FAF5F6', border: '1px solid var(--border-color)', color: 'var(--color-mauve)', fontSize: '12px', fontWeight: 600 }}
            >
              <span className="flex items-center gap-2">
                <Info size={14} />
                Why this fits
              </span>
              {showExplanation ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showExplanation && (
              <div className="mt-2 p-3 rounded-md" style={{ backgroundColor: '#FDFBFB', border: '1px solid var(--border-color)', fontSize: '11px' }}>
                <span className="font-bold text-muted block mb-2" style={{ textTransform: 'uppercase' }}>Matching Factors</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {product.whyThis.map((reason, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle2 size={14} style={{ color: 'var(--color-sage)', flexShrink: 0 }} />
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Price & Add Button */}
      <div className="border-t mt-4 pt-4 flex items-center justify-between gap-4">
        <div>
          <span className="text-xs text-muted block mb-1">Price</span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold">
              {formattedPrice}
            </span>
            {originalPrice && (
              <span className="text-xs text-muted" style={{ textDecoration: 'line-through' }}>
                {originalPrice}
              </span>
            )}
          </div>
        </div>

        <button onClick={() => onAddToCart(product.id)} className="btn-primary flex items-center gap-2">
          <ShoppingCart size={14} />
          Add
        </button>
      </div>

    </div>
  );
};
