import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, ShieldCheck, Zap, BarChart3, FileText, Code, Cpu, Database } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '3rem', minHeight: 'calc(100vh - 4rem)' }}>
      
      {/* Hero Section */}
      <section style={{ textAlign: 'center', paddingTop: '4rem', paddingBottom: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
        
        <div className="badge badge-success flex items-center gap-2" style={{ padding: '6px 12px', fontSize: '12px' }}>
          <Sparkles size={14} />
          Razorpay AI Buildathon — Track 01: AI Growth & Agentic Commerce
        </div>

        <h1 style={{ fontSize: '3rem', fontWeight: 800, margin: 0, lineHeight: 1.1 }}>
          Turn conversations into <br />
          <span style={{ color: 'var(--color-mauve)' }}>intelligent, higher-value purchases</span>
        </h1>

        <p className="text-muted" style={{ maxWidth: '600px', fontSize: '1.1rem' }}>
          RazorRise acts as an autonomous sales agent for merchants and a machine-readable commerce surface. It understands intent, searches deterministically, scores matches, and gates Razorpay payments.
        </p>

        <div className="flex gap-4 items-center justify-center mt-4">
          <Link to="/shop" className="btn-primary flex items-center gap-2 text-lg px-4 py-2" style={{ textDecoration: 'none' }}>
            <Sparkles size={18} />
            Start Shopping
            <ArrowRight size={18} />
          </Link>
          <Link to="/merchant" className="btn-secondary flex items-center gap-2 text-lg px-4 py-2" style={{ textDecoration: 'none' }}>
            <BarChart3 size={18} />
            Merchant Overview
          </Link>
        </div>


      </section>

      {/* Core Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        <div className="card flex-col gap-3">
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'var(--color-peach)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={20} />
          </div>
          <h3 className="m-0 font-bold">1. Explainable AI</h3>
          <p className="m-0 text-sm text-muted">
            Every recommendation features transparent match scoring (Budget 30%, Feature 30%, Use-Case 20%, Rating 10%, Value 10%) so buyers understand why products are selected.
          </p>
        </div>

        <div className="card flex-col gap-3">
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'var(--color-sage)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={20} />
          </div>
          <h3 className="m-0 font-bold">2. Gated Financial Actions</h3>
          <p className="m-0 text-sm text-muted">
            The AI never auto-charges money. Price math is server-calculated, and Razorpay order creation requires explicit user button confirmation.
          </p>
        </div>

        <div className="card flex-col gap-3">
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'var(--color-soft-pink)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={20} />
          </div>
          <h3 className="m-0 font-bold">3. Full Auditability</h3>
          <p className="m-0 text-sm text-muted">
            All intents, catalog searches, upsells, gated approvals, HMAC signatures, and webhooks are logged in an immutable database ledger.
          </p>
        </div>
      </div>

      {/* Agent to Agent Section */}
      <section className="card bg-card mt-8 flex flex-col md:flex-row gap-8 items-center" style={{ backgroundColor: '#FAF5F6' }}>
        
        <div className="flex-1 flex flex-col gap-4">
          <span className="badge w-max" style={{ backgroundColor: 'white', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
            Agent-to-Agent (A2A)
          </span>
          <h2 className="m-0 font-bold text-2xl">Machine-Readable Commerce Surface</h2>
          <p className="m-0 text-sm text-muted">
            Exposing catalog discovery and gated checkout tools for external AI agents (MCP Protocol Ready)
          </p>
          
          <div className="flex flex-col gap-3 text-sm mt-2">
            <div className="flex items-center gap-2">
              <Database size={16} style={{ color: 'var(--color-mauve)' }} />
              <strong style={{ minWidth: '200px' }}>Inventory API:</strong>
              <code style={{ padding: '2px 6px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid var(--border-color)' }}>GET /api/products</code>
            </div>
            <div className="flex items-center gap-2">
              <Code size={16} style={{ color: 'var(--color-sage)' }} />
              <strong style={{ minWidth: '200px' }}>Bounded Tool Schema:</strong>
              <code style={{ padding: '2px 6px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid var(--border-color)' }}>search_catalog</code>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} style={{ color: 'var(--color-peach)' }} />
              <strong style={{ minWidth: '200px' }}>Gated Checkout:</strong>
              <code style={{ padding: '2px 6px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid var(--border-color)' }}>POST /api/razorpay/order</code>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-card p-4 rounded-md border" style={{ fontSize: '12px', fontFamily: 'monospace' }}>
          <pre className="m-0 text-secondary" style={{ overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
{`{
  "agent": "RazorRise-AI-Commerce",
  "protocol": "MCP / A2A",
  "capabilities": [
    "search_catalog",
    "explainable_5_factor_scoring",
    "contextual_upsell_engine",
    "gated_razorpay_checkout"
  ],
  "securityGate": "EXPLICIT_CONFIRMATION",
  "hmacVerification": true
}`}
          </pre>
        </div>

      </section>

      <footer className="text-center text-xs text-muted pb-4 border-t pt-4 mt-auto">
        <p>Built for Razorpay AI Buildathon 2026 — Track 01: Agentic Commerce</p>
      </footer>

    </div>
  );
};
