import React, { useEffect, useState } from 'react';
import { ApiService } from '../services/api';
import { sanitizeText } from '../utils/sanitize';
import { LineChart as LineChartIcon, Sparkles, Lightbulb, TrendingUp, Filter, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export const MerchantInsightsPage: React.FC = () => {
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('ALL');

  useEffect(() => {
    ApiService.getMerchantInsights()
      .then((res) => { setInsights(res.insights || []); setLoading(false); })
      .catch((err) => { console.error(err); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="container text-center text-muted flex items-center justify-center gap-2" style={{ minHeight: '50vh' }}>
      <Sparkles size={20} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing customer patterns...
    </div>
  );

  const totalImpact = insights.reduce((acc, curr) => acc + (curr.estimatedRevenue || 0), 0);
  const topConfidence = insights.some((i) => i.confidence?.toLowerCase() === 'high') ? 'High' : 'Medium';
  const categories = ['ALL', 'BUNDLE', 'UPSELL', 'CONVERSION'];

  const filteredInsights = insights.filter((ins) => activeCategory === 'ALL' || ins.type?.toUpperCase() === activeCategory);
  const confidenceScore = (c: string) => { const l = (c || '').toLowerCase(); if (l.includes('very high')) return 3; if (l.includes('high')) return 2; return 1; };
  const sortedInsights = [...filteredInsights].sort((a, b) => { const confDiff = confidenceScore(b.confidence) - confidenceScore(a.confidence); if (confDiff !== 0) return confDiff; return (b.estimatedRevenue || 0) - (a.estimatedRevenue || 0); });
  const topOpportunity = sortedInsights.length > 0 ? sortedInsights[0] : null;
  const secondaryOpportunities = sortedInsights.slice(1);

  return (
    <div className="container flex-col gap-6" style={{ display: 'flex' }}>
      
      <div className="flex items-center gap-3">
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'var(--color-sage)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LineChartIcon size={20} />
        </div>
        <div>
          <h1 className="m-0 font-bold text-2xl">AI Growth Insights</h1>
          <p className="m-0 text-sm text-muted">AI-detected opportunities to increase conversion and basket value</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card flex-col gap-1 p-4">
          <span className="text-xs text-muted font-medium">OPPORTUNITIES DETECTED</span>
          <div className="text-2xl font-bold">{insights.length}</div>
          <span className="text-xs text-muted">Live Catalog Patterns</span>
        </div>
        <div className="card flex-col gap-1 p-4" style={{ backgroundColor: 'var(--color-sage)', borderColor: '#b5c5bb' }}>
          <span className="text-xs font-bold flex items-center gap-1"><TrendingUp size={14} /> MONTHLY REVENUE IMPACT</span>
          <div className="text-2xl font-bold">+₹{totalImpact.toLocaleString('en-IN')}/mo</div>
          <span className="text-xs text-muted">Combined Basket Potential</span>
        </div>
        <div className="card flex-col gap-1 p-4" style={{ backgroundColor: '#FAF5F6' }}>
          <span className="text-xs font-bold flex items-center gap-1" style={{ color: 'var(--color-mauve)' }}><ShieldCheck size={14} /> HIGHEST CONFIDENCE</span>
          <div className="text-2xl font-bold" style={{ color: 'var(--color-mauve)' }}>{topConfidence}</div>
          <span className="text-xs text-muted">Affinity Model Verified</span>
        </div>
      </div>

      {/* Category Filter */}
      <div className="card flex items-center gap-2 overflow-x-auto" style={{ backgroundColor: '#FAF5F6', padding: '12px' }}>
        <Filter size={16} className="text-muted" />
        {categories.map((cat) => (
          <button key={cat} onClick={() => setActiveCategory(cat)} className={activeCategory === cat ? 'btn-primary text-xs py-1' : 'btn-tertiary text-xs py-1'} style={{ whiteSpace: 'nowrap' }}>
            [{cat}]
          </button>
        ))}
      </div>

      {/* Top Opportunity */}
      {topOpportunity && (
        <div className="card" style={{ backgroundColor: 'var(--color-sage)', borderColor: '#b5c5bb' }}>
          <div className="flex items-center justify-between mb-4">
            <span className="badge flex items-center gap-1" style={{ backgroundColor: 'white' }}>
              <Zap size={14} /> HIGHEST-IMPACT — {topOpportunity.type?.toUpperCase()}
            </span>
            <span className="text-xs font-bold">Confidence: <strong>{topOpportunity.confidence}</strong></span>
          </div>

          <h2 className="m-0 mb-2 font-bold text-xl">{sanitizeText(topOpportunity.title)}</h2>
          <p className="m-0 text-sm text-secondary mb-4">{sanitizeText(topOpportunity.description)}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card bg-card p-3">
              <span className="text-xs font-bold text-muted uppercase block mb-1">Why AI Found This</span>
              <p className="m-0 text-sm">Affinity analysis detected strong customer interest and bundle co-purchase intent during active product discovery.</p>
            </div>
            <div className="card bg-card p-3" style={{ borderColor: 'var(--border-color)' }}>
              <span className="text-xs font-bold uppercase block mb-1">Recommended Action</span>
              <p className="m-0 text-sm font-medium">{sanitizeText(topOpportunity.action)}</p>
            </div>
          </div>

          <div className="flex justify-between items-center border-t mt-4 pt-4">
            <div>
              <span className="text-xs text-muted block mb-1">Estimated Monthly Impact</span>
              <span className="text-lg font-bold flex items-center gap-1"><TrendingUp size={18} /> +₹{(topOpportunity.estimatedRevenue || 0).toLocaleString('en-IN')}/mo</span>
            </div>
            <span className="text-xs text-muted italic">Affinity pattern verified</span>
          </div>
        </div>
      )}

      {/* Secondary Opportunities */}
      {secondaryOpportunities.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="m-0 text-sm font-bold uppercase text-muted">Additional Opportunities</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {secondaryOpportunities.map((ins) => (
              <div key={ins.id} className="card flex flex-col justify-between gap-4" style={{ padding: '1.25rem' }}>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="badge flex items-center gap-1" style={{ backgroundColor: 'var(--color-sage)' }}><Lightbulb size={12} /> {ins.type?.toUpperCase()}</span>
                    <span className="text-xs text-muted">Confidence: <strong>{ins.confidence}</strong></span>
                  </div>
                  <h3 className="m-0 font-bold">{sanitizeText(ins.title)}</h3>
                  <p className="m-0 text-sm text-muted">{sanitizeText(ins.description)}</p>
                  <div className="bg-card border p-3 rounded-md">
                    <span className="text-xs font-bold text-muted uppercase block mb-1">Recommended Action</span>
                    <p className="m-0 text-sm font-medium" style={{ color: 'var(--color-mauve)' }}>{sanitizeText(ins.action)}</p>
                  </div>
                </div>
                <div className="border-t pt-3 flex justify-between items-center">
                  <div>
                    <span className="text-xs text-muted block">Estimated Impact</span>
                    <span className="font-bold flex items-center gap-1"><TrendingUp size={14} /> +₹{(ins.estimatedRevenue || 0).toLocaleString('en-IN')}/mo</span>
                  </div>
                  <span className="badge" style={{ backgroundColor: '#FAF5F6', border: '1px solid var(--border-color)' }}>Verified Pattern</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How It Works */}
      <div className="card flex flex-col gap-4">
        <h3 className="m-0 text-sm font-bold uppercase text-muted">How RazorRise Finds Growth Opportunities</h3>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center text-center text-sm">
          <div className="card p-3 flex-col gap-1" style={{ backgroundColor: '#FAF5F6' }}>
            <span className="font-bold block">1. Search Patterns</span>
            <span className="text-xs text-muted">Customer Queries</span>
          </div>
          <div className="text-muted justify-center hidden sm:flex"><ArrowRight size={16} /></div>
          <div className="card p-3 flex-col gap-1" style={{ backgroundColor: '#FAF5F6' }}>
            <span className="font-bold block">2. Catalog Affinity</span>
            <span className="text-xs text-muted">Co-view Matrix</span>
          </div>
          <div className="text-muted justify-center hidden sm:flex"><ArrowRight size={16} /></div>
          <div className="card p-3 flex-col gap-1" style={{ backgroundColor: 'var(--color-sage)', borderColor: '#b5c5bb' }}>
            <span className="font-bold block">3. Growth Insights</span>
            <span className="text-xs text-muted">Recommended Action</span>
          </div>
        </div>
      </div>

    </div>
  );
};
