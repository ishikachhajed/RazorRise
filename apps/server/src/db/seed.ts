import { PrismaClient } from '../../prisma/generated/client/index.js';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  const productsPath = path.resolve(__dirname, '../../../../data/products.json');
  const demoDataPath = path.resolve(__dirname, '../../../../data/demo-data.json');

  const rawProducts = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
  const rawDemoData = JSON.parse(fs.readFileSync(demoDataPath, 'utf-8'));

  // Seed Merchant Config
  console.log(`⚙️ Seeding default merchant config...`);
  await prisma.merchantConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      maxDiscountPercent: 5.0,
      minMarginPercent: 10.0,
      allowUpsells: true,
      allowIncentives: true,
      blockedCategoriesJson: JSON.stringify([]),
      minOrderValue: 0,
      maxOrderValue: 500000
    }
  });

  // Seed Agent Config
  console.log(`🤖 Seeding default agent config...`);
  await prisma.agentConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      isActive: true,
      monthlySpendingLimit: 500000,
      currentMonthlySpend: 0,
      autoApproveThreshold: 50000,
      requireApprovalMax: 150000
    }
  });

  // Seed Products
  console.log(`📦 Seeding ${rawProducts.length} products...`);
  for (const item of rawProducts) {
    await prisma.product.upsert({
      where: { id: item.id },
      update: {
        name: item.name,
        category: item.category,
        price: item.price,
        currency: item.currency || 'INR',
        description: item.description,
        featuresJson: JSON.stringify(item.features || []),
        specificationsJson: JSON.stringify(item.specifications || {}),
        rating: item.rating || 4.5,
        stock: item.stock || 10,
        tagsJson: JSON.stringify(item.tags || []),
        complementaryJson: JSON.stringify(item.complementary_products || []),
        discount: item.discount || 0,
        imageUrl: item.imageUrl
      },
      create: {
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        currency: item.currency || 'INR',
        description: item.description,
        featuresJson: JSON.stringify(item.features || []),
        specificationsJson: JSON.stringify(item.specifications || {}),
        rating: item.rating || 4.5,
        stock: item.stock || 10,
        tagsJson: JSON.stringify(item.tags || []),
        complementaryJson: JSON.stringify(item.complementary_products || []),
        discount: item.discount || 0,
        imageUrl: item.imageUrl
      }
    });
  }

  // Seed Demo Audit Events
  console.log(`📝 Seeding ${rawDemoData.auditEvents.length} demo audit events...`);
  for (const evt of rawDemoData.auditEvents) {
    await prisma.auditEvent.upsert({
      where: { id: evt.id },
      update: {
        eventType: evt.eventType,
        actor: evt.actor,
        action: evt.action,
        reason: evt.reason,
        input: evt.input,
        output: evt.output,
        status: evt.status,
        metadataJson: JSON.stringify(evt.metadata || {}),
        createdAt: new Date(evt.timestamp)
      },
      create: {
        id: evt.id,
        eventType: evt.eventType,
        actor: evt.actor,
        action: evt.action,
        reason: evt.reason,
        input: evt.input,
        output: evt.output,
        status: evt.status,
        metadataJson: JSON.stringify(evt.metadata || {}),
        createdAt: new Date(evt.timestamp)
      }
    });
  }

  console.log('✅ Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
