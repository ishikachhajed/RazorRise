import React, { useEffect, useState } from 'react';
import { ApiService, Product } from '../services/api';
import { Package, Search, Star, Tag, Sparkles, Filter, Database, ShieldCheck } from 'lucide-react';

export const MerchantCatalogPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    ApiService.getProducts()
      .then((res) => { setProducts(res.products || []); setLoading(false); })
      .catch((err) => { console.error(err); setLoading(false); });
  }, []);

  const categories = ['ALL', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'ALL' || p.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="container flex-col gap-6" style={{ display: 'flex' }}>
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'var(--color-peach)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={20} />
          </div>
          <div>
            <h1 className="m-0 font-bold text-2xl">Product Catalog</h1>
            <p className="m-0 text-muted text-sm">Live database inventory accessible by RazorRise AI agent</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-success flex items-center gap-1"><Database size={14} /> {products.length} Products</span>
          <span className="badge flex items-center gap-1" style={{ backgroundColor: '#FAF5F6', border: '1px solid var(--border-color)' }}><ShieldCheck size={14} /> Server Verified</span>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="card flex flex-col md:flex-row gap-4 items-center justify-between" style={{ backgroundColor: '#FAF5F6' }}>
        <div className="relative" style={{ width: '100%', maxWidth: '320px' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name, feature, or tag..." style={{ paddingLeft: '36px' }} />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          <Filter size={16} className="text-muted" />
          {categories.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={selectedCategory === cat ? 'btn-primary text-xs py-1' : 'btn-tertiary text-xs py-1'} style={{ whiteSpace: 'nowrap', textTransform: 'uppercase', fontSize: '11px' }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-muted flex items-center justify-center gap-2">
          <Sparkles size={20} style={{ animation: 'spin 1s linear infinite' }} /> Loading catalog...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="card p-12 text-center text-muted">No catalog items match your search filter.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((p) => {
            const hasImgError = imgErrors[p.id];
            return (
              <div key={p.id} className="card flex flex-col justify-between gap-3" style={{ padding: '1.25rem' }}>
                
                <div className="flex items-center justify-between">
                  <span className="badge" style={{ backgroundColor: '#FAF5F6', border: '1px solid var(--border-color)', textTransform: 'uppercase', fontSize: '10px' }}>{p.category}</span>
                  <div className="flex items-center gap-1 font-bold text-sm" style={{ backgroundColor: 'var(--color-peach)', padding: '2px 6px', borderRadius: '6px' }}>
                    <Star size={12} style={{ fill: 'currentColor' }} />{p.rating}
                  </div>
                </div>

                <div className="relative rounded-md overflow-hidden" style={{ aspectRatio: '16/9', backgroundColor: '#FAF5F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {!hasImgError && p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} onError={() => setImgErrors((prev) => ({ ...prev, [p.id]: true }))} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted"><Package size={24} style={{ opacity: 0.6 }} /><span style={{ fontSize: '11px' }}>{p.name}</span></div>
                  )}
                  {p.discount > 0 && <span style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: 'var(--color-sage)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>{p.discount}% OFF</span>}
                </div>

                <h3 className="m-0 font-bold text-sm">{p.name}</h3>
                <p className="m-0 text-xs text-muted" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.description}</p>

                {p.tags && p.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {p.tags.slice(0, 4).map((t: string, idx: number) => (
                      <span key={idx} className="badge flex items-center gap-1" style={{ backgroundColor: 'white', border: '1px solid var(--border-color)', fontSize: '10px' }}>
                        <Tag size={10} />{t}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between border-t pt-3 mt-1">
                  <div>
                    <span className="text-xs text-muted block">Stock</span>
                    <span className="text-sm font-medium">{p.stock} units</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted block">Price</span>
                    <span className="text-lg font-bold">₹{p.price.toLocaleString('en-IN')}</span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
