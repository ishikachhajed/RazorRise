import React from 'react';
import { ExternalProduct, ComparisonData } from '../services/api';
import { ExternalProductCard } from './ExternalProductCard';
import { TrendingUp, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ComparisonViewProps {
  products: ExternalProduct[];
  comparison: ComparisonData;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ products, comparison }) => {
  if (!products || products.length < 2) return null;

  return (
    <div
      style={{
        marginTop: '12px',
        border: '1px solid #E5E7EB',
        borderRadius: '14px',
        overflow: 'hidden',
        backgroundColor: '#FAFAFA'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 14px',
          backgroundColor: '#F0EFEB',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          gap: '7px'
        }}
      >
        <TrendingUp size={15} style={{ color: '#283618' }} />
        <span style={{ fontWeight: 700, fontSize: '13px', color: '#283618' }}>
          Product Comparison
        </span>
        <span style={{ fontSize: '11px', color: '#6B7280', marginLeft: 'auto' }}>
          {products.length} products
        </span>
      </div>

      {/* Product cards grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(products.length, 3)}, 1fr)`,
          gap: '12px',
          padding: '14px'
        }}
      >
        {products.slice(0, 3).map((product, i) => (
          <ExternalProductCard key={`cmp-${i}`} product={product} />
        ))}
      </div>

      {/* AI Summary */}
      {comparison.summary && (
        <div
          style={{
            margin: '0 14px 14px',
            padding: '12px 14px',
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #E5E7EB'
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#283618', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <CheckCircle2 size={13} />
            AI Analysis
          </div>
          <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.5' }}>
            <ReactMarkdown>{comparison.summary}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Factors */}
      {comparison.factors && comparison.factors.length > 0 && (
        <div
          style={{
            margin: '0 14px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px'
          }}
        >
          {comparison.factors.map((factor, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '6px 10px',
                borderRadius: '8px',
                backgroundColor: i % 2 === 0 ? '#F0FFF4' : '#EFF6FF',
                border: `1px solid ${i % 2 === 0 ? '#BBF7D0' : '#BFDBFE'}`,
                fontSize: '12px',
                color: '#374151',
                fontWeight: 500
              }}
            >
              <span style={{ fontSize: '14px' }}>{i === 0 ? '🏆' : i === 1 ? '🔋' : '💰'}</span>
              {factor}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
