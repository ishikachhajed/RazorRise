import React, { useState } from 'react';
import { Sparkles, Plus, CheckCircle2, Package } from 'lucide-react';

interface UpsellBannerProps {
  upsellData: {
    product: any;
    reason: string;
    price: number;
    savings?: string;
  };
  onAddUpsell: (productId: string) => void;
}

export const UpsellBanner: React.FC<UpsellBannerProps> = ({ upsellData, onAddUpsell }) => {
  const [added, setAdded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const { product, reason, savings } = upsellData;

  const handleAdd = () => {
    onAddUpsell(product.id);
    setAdded(true);
  };

  return (
    <div className="card mt-4" style={{ backgroundColor: '#FAF5F6' }}>
      
      {/* Header Badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 font-bold" style={{ color: 'var(--color-mauve)', fontSize: '12px' }}>
          <Sparkles size={16} />
          <span>✦ AI RECOMMENDATION — Complete your setup</span>
        </div>
        {savings && (
          <span className="badge badge-success">
            {savings}
          </span>
        )}
      </div>

      {/* Item Body */}
      <div className="flex items-center gap-4 bg-card p-3 rounded-md border">
        <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: '#FAF5F6', border: '1px solid var(--border-color)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {!imgError && product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              onError={() => setImgError(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Package size={24} style={{ opacity: 0.6 }} />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 className="text-sm font-bold m-0 truncate">
            {product.name}
          </h4>
          <p className="text-xs text-muted m-0 mt-1" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            "{reason}"
          </p>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <span className="text-sm font-bold block mb-2" style={{ color: 'var(--color-mauve)' }}>
            ₹{product.price.toLocaleString('en-IN')}
          </span>

          <button
            onClick={handleAdd}
            disabled={added}
            className={added ? "btn-secondary" : "btn-primary"}
            style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            {added ? (
              <>
                <CheckCircle2 size={14} />
                <span>Added</span>
              </>
            ) : (
              <>
                <Plus size={14} />
                <span>Add Bundle Item</span>
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  );
};
