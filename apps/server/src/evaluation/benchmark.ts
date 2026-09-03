import { MockAIProvider } from '../providers/MockAIProvider.js';
import { CatalogService } from '../services/CatalogService.js';
import { prisma } from '../db/prisma.js';

interface TestQuery {
  id: number;
  query: string;
  expectedCategory: string;
  expectedMaxBudget?: number;
  isImpossible?: boolean;
}

const testQueries: TestQuery[] = [
  // 1-10: Straightforward
  { id: 1, query: 'I need a laptop for coding under ₹70,000', expectedCategory: 'laptop', expectedMaxBudget: 70000 },
  { id: 2, query: 'Looking for a gaming laptop under 60k', expectedCategory: 'laptop', expectedMaxBudget: 60000 },
  { id: 3, query: 'Show me macbooks under 1 lakh', expectedCategory: 'laptop', expectedMaxBudget: 100000 },
  { id: 4, query: 'Need headphones under 10000 for travel', expectedCategory: 'headphones', expectedMaxBudget: 10000 },
  { id: 5, query: 'Budget earbud under ₹5,000 with ANC', expectedCategory: 'headphones', expectedMaxBudget: 5000 },
  { id: 6, query: 'Sony noise cancelling headphones under 30k', expectedCategory: 'headphones', expectedMaxBudget: 30000 },
  { id: 7, query: 'Smartphones under 40k with fast charging', expectedCategory: 'smartphone', expectedMaxBudget: 40000 },
  { id: 8, query: 'Camera phone under 50,000', expectedCategory: 'smartphone', expectedMaxBudget: 50000 },
  { id: 9, query: 'Budget gaming phone under 30000', expectedCategory: 'smartphone', expectedMaxBudget: 30000 },
  { id: 10, query: 'Mechanical keyboard for coding under 12k', expectedCategory: 'keyboards', expectedMaxBudget: 12000 },

  // 11-20: Natural language & Synonyms
  { id: 11, query: 'Keychron wireless keyboard under 8000', expectedCategory: 'keyboards', expectedMaxBudget: 8000 },
  { id: 12, query: 'Ergonomic productivity mouse under 10k', expectedCategory: 'mice', expectedMaxBudget: 10000 },
  { id: 13, query: 'Lightweight gaming mouse under 7k', expectedCategory: 'mice', expectedMaxBudget: 7000 },
  { id: 14, query: '4K monitor for programming under 30,000', expectedCategory: 'monitors', expectedMaxBudget: 30000 },
  { id: 15, query: '144Hz gaming monitor under 15000', expectedCategory: 'monitors', expectedMaxBudget: 15000 },
  { id: 16, query: 'Laptop backpack under 5000', expectedCategory: 'backpacks', expectedMaxBudget: 5000 },
  { id: 17, query: 'Powerbank 140W for laptop under 10k', expectedCategory: 'accessories', expectedMaxBudget: 10000 },
  { id: 18, query: 'USB-C multiport hub under 4000', expectedCategory: 'accessories', expectedMaxBudget: 4000 },
  { id: 19, query: 'Laptop cooling pad under 3000', expectedCategory: 'accessories', expectedMaxBudget: 3000 },
  { id: 20, query: 'Desk mat mousepad under 1000', expectedCategory: 'accessories', expectedMaxBudget: 1000 },

  // 21-30: Extended Natural Language & Constraints
  { id: 21, query: 'I need a notebook below 60k for work', expectedCategory: 'laptop', expectedMaxBudget: 60000 },
  { id: 22, query: 'Mobile under 40,000 with 120Hz display', expectedCategory: 'smartphone', expectedMaxBudget: 40000 },
  { id: 23, query: 'Earphones under 8000 with multipoint Bluetooth', expectedCategory: 'headphones', expectedMaxBudget: 8000 },
  { id: 24, query: 'Gaming laptop with 16GB RAM below 90000', expectedCategory: 'laptop', expectedMaxBudget: 90000 },
  { id: 25, query: 'Wireless mouse for coding under 2000', expectedCategory: 'mice', expectedMaxBudget: 2000 },
  { id: 26, query: 'Curved gaming display under 25k', expectedCategory: 'monitors', expectedMaxBudget: 25000 },
  { id: 27, query: 'Tech commuter bag under 3000', expectedCategory: 'backpacks', expectedMaxBudget: 3000 },
  { id: 28, query: 'GaN wall charger 65W under 3000', expectedCategory: 'accessories', expectedMaxBudget: 3000 },
  { id: 29, query: 'Ultra fast charging phone below 45000', expectedCategory: 'smartphone', expectedMaxBudget: 45000 },
  { id: 30, query: 'Cheap mechanical gaming keyboard under 3000', expectedCategory: 'keyboards', expectedMaxBudget: 3000 },

  // 31-40: Impossible & Ambiguous Constraints
  { id: 31, query: 'I need a laptop under ₹1000', expectedCategory: 'laptop', expectedMaxBudget: 1000, isImpossible: true },
  { id: 32, query: 'I want a smartphone under ₹500', expectedCategory: 'smartphone', expectedMaxBudget: 500, isImpossible: true },
  { id: 33, query: '4K OLED monitor under ₹2000', expectedCategory: 'monitors', expectedMaxBudget: 2000, isImpossible: true },
  { id: 34, query: 'ANC Headphones under ₹200', expectedCategory: 'headphones', expectedMaxBudget: 200, isImpossible: true },
  { id: 35, query: 'I need a coding laptop under ₹50,000', expectedCategory: 'laptop', expectedMaxBudget: 50000 },
  { id: 36, query: 'Ultralight gaming laptop under 65,000', expectedCategory: 'laptop', expectedMaxBudget: 65000 },
  { id: 37, query: 'Samsung phone under 50k', expectedCategory: 'smartphone', expectedMaxBudget: 50000 },
  { id: 38, query: 'OnePlus phone under 40k', expectedCategory: 'smartphone', expectedMaxBudget: 40000 },
  { id: 39, query: 'Logitech mouse under 9k', expectedCategory: 'mice', expectedMaxBudget: 9000 },
  { id: 40, query: 'Sennheiser noise cancelling headphones under 15k', expectedCategory: 'headphones', expectedMaxBudget: 15000 }
];

async function runBenchmark() {
  console.log('📊 Running RazorFlow AI Extended Evaluation Benchmark Suite (40 Queries)...\n');

  const provider = new MockAIProvider();
  let correctIntents = 0;
  let budgetCompliant = 0;
  let relevantRecs = 0;
  let invalidRecs = 0;

  for (const item of testQueries) {
    const intent = await provider.extractIntent(item.query);
    
    // Check Intent Accuracy
    const categoryMatch = intent.category === item.expectedCategory || (intent.category === 'laptop' && item.expectedCategory === 'laptop');
    const budgetMatch = !item.expectedMaxBudget || (intent.budgetMax && Math.abs(intent.budgetMax - item.expectedMaxBudget) <= 1000);

    if (categoryMatch && budgetMatch) {
      correctIntents++;
    }

    // Search catalog
    const recs = await CatalogService.searchProducts({
      category: intent.category,
      maxBudget: intent.budgetMax,
      useCases: intent.useCases
    });

    // Check Budget Compliance (Impossible queries return empty array, which is 100% compliant!)
    const allWithinBudget = recs.every((r) => !intent.budgetMax || r.price <= intent.budgetMax * 1.05);
    if (allWithinBudget) {
      budgetCompliant++;
    }

    // Check Recommendation Relevance
    if (item.isImpossible) {
      // For impossible queries, returning empty array is 100% relevant (no invalid products forced)
      if (recs.length === 0) relevantRecs++;
    } else {
      if (recs.length > 0 && recs[0].matchScore >= 75) {
        relevantRecs++;
      }
    }

    // Check Invalid Recommendations (e.g. invalid price or missing ID)
    const invalid = recs.some((r) => !r.id || !r.name || r.price <= 0);
    if (invalid) {
      invalidRecs++;
    }
  }

  const total = testQueries.length;
  const intentAccuracyPct = ((correctIntents / total) * 100).toFixed(1);
  const budgetCompliancePct = ((budgetCompliant / total) * 100).toFixed(1);
  const relevancePct = ((relevantRecs / total) * 100).toFixed(1);
  const invalidPct = ((invalidRecs / total) * 100).toFixed(1);

  console.log('====================================================');
  console.log('  RAZORFLOW AI EXTENDED BENCHMARK RESULTS');
  console.log('====================================================');
  console.log(`Total Test Queries Evaluated : ${total}`);
  console.log(`Intent Accuracy Rate        : ${intentAccuracyPct}%`);
  console.log(`Budget Compliance Rate      : ${budgetCompliancePct}%`);
  console.log(`Recommendation Relevance    : ${relevancePct}%`);
  console.log(`Invalid Recommendation Rate : ${invalidPct}%`);
  console.log('====================================================\n');

  await prisma.$disconnect();
}

runBenchmark().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
