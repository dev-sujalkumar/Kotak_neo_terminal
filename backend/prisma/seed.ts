import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Database with Indian Market Instruments & Demo Account...');

  // 1. Create Default Demo User
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const user = await prisma.user.upsert({
    where: { email: 'user@kotaktrade.com' },
    update: {},
    create: {
      email: 'user@kotaktrade.com',
      name: 'Trader Alex',
      passwordHash,
      tradingMode: 'PAPER',
      paperBalance: 1000000.0,
    },
  });

  console.log(`Demo User created: ${user.email} (ID: ${user.id})`);

  // 2. Create Stock Instruments (Top NSE Stocks)
  const instrumentsData = [
    { symbol: 'TCS', exchangeSegment: 'nse_cm', tradingSymbol: 'TCS-EQ', name: 'Tata Consultancy Services Ltd', lotSize: 1, instrumentToken: '11536', series: 'EQ', sector: 'IT Services' },
    { symbol: 'RELIANCE', exchangeSegment: 'nse_cm', tradingSymbol: 'RELIANCE-EQ', name: 'Reliance Industries Ltd', lotSize: 1, instrumentToken: '2885', series: 'EQ', sector: 'Oil & Telecom' },
    { symbol: 'INFY', exchangeSegment: 'nse_cm', tradingSymbol: 'INFY-EQ', name: 'Infosys Ltd', lotSize: 1, instrumentToken: '1594', series: 'EQ', sector: 'IT Services' },
    { symbol: 'HDFCBANK', exchangeSegment: 'nse_cm', tradingSymbol: 'HDFCBANK-EQ', name: 'HDFC Bank Ltd', lotSize: 1, instrumentToken: '1333', series: 'EQ', sector: 'Banking' },
    { symbol: 'ICICIBANK', exchangeSegment: 'nse_cm', tradingSymbol: 'ICICIBANK-EQ', name: 'ICICI Bank Ltd', lotSize: 1, instrumentToken: '4963', series: 'EQ', sector: 'Banking' },
    { symbol: 'SBIN', exchangeSegment: 'nse_cm', tradingSymbol: 'SBIN-EQ', name: 'State Bank of India', lotSize: 1, instrumentToken: '3045', series: 'EQ', sector: 'Banking' },
    { symbol: 'BHARTIARTL', exchangeSegment: 'nse_cm', tradingSymbol: 'BHARTIARTL-EQ', name: 'Bharti Airtel Ltd', lotSize: 1, instrumentToken: '10604', series: 'EQ', sector: 'Telecom' },
    { symbol: 'ITC', exchangeSegment: 'nse_cm', tradingSymbol: 'ITC-EQ', name: 'ITC Ltd', lotSize: 1, instrumentToken: '1660', series: 'EQ', sector: 'FMCG' },
    { symbol: 'KOTAKBANK', exchangeSegment: 'nse_cm', tradingSymbol: 'KOTAKBANK-EQ', name: 'Kotak Mahindra Bank Ltd', lotSize: 1, instrumentToken: '1922', series: 'EQ', sector: 'Banking' },
    { symbol: 'LT', exchangeSegment: 'nse_cm', tradingSymbol: 'LT-EQ', name: 'Larsen & Toubro Ltd', lotSize: 1, instrumentToken: '11483', series: 'EQ', sector: 'Capital Goods' },
    { symbol: 'TATAMOTORS', exchangeSegment: 'nse_cm', tradingSymbol: 'TATAMOTORS-EQ', name: 'Tata Motors Ltd', lotSize: 1, instrumentToken: '3456', series: 'EQ', sector: 'Automobile' },
    { symbol: 'HINDUNILVR', exchangeSegment: 'nse_cm', tradingSymbol: 'HINDUNILVR-EQ', name: 'Hindustan Unilever Ltd', lotSize: 1, instrumentToken: '1394', series: 'EQ', sector: 'FMCG' },
    { symbol: 'WIPRO', exchangeSegment: 'nse_cm', tradingSymbol: 'WIPRO-EQ', name: 'Wipro Ltd', lotSize: 1, instrumentToken: '3787', series: 'EQ', sector: 'IT Services' },
    { symbol: 'MARUTI', exchangeSegment: 'nse_cm', tradingSymbol: 'MARUTI-EQ', name: 'Maruti Suzuki India Ltd', lotSize: 1, instrumentToken: '10999', series: 'EQ', sector: 'Automobile' },
    { symbol: 'AXISBANK', exchangeSegment: 'nse_cm', tradingSymbol: 'AXISBANK-EQ', name: 'Axis Bank Ltd', lotSize: 1, instrumentToken: '5900', series: 'EQ', sector: 'Banking' },
    { symbol: 'SUNPHARMA', exchangeSegment: 'nse_cm', tradingSymbol: 'SUNPHARMA-EQ', name: 'Sun Pharmaceutical Industries', lotSize: 1, instrumentToken: '3351', series: 'EQ', sector: 'Pharma' },
    { symbol: 'BAJFINANCE', exchangeSegment: 'nse_cm', tradingSymbol: 'BAJFINANCE-EQ', name: 'Bajaj Finance Ltd', lotSize: 1, instrumentToken: '317', series: 'EQ', sector: 'NBFC' },
    { symbol: 'TITAN', exchangeSegment: 'nse_cm', tradingSymbol: 'TITAN-EQ', name: 'Titan Company Ltd', lotSize: 1, instrumentToken: '3506', series: 'EQ', sector: 'Consumer Durables' },
  ];

  const createdInstruments = [];
  for (const inst of instrumentsData) {
    const created = await prisma.instrument.upsert({
      where: { instrumentToken: inst.instrumentToken },
      update: inst,
      create: inst,
    });
    createdInstruments.push(created);
  }
  console.log(`Seeded ${createdInstruments.length} stock instruments.`);

  // 3. Create Sample News Articles & Sentiment Results
  const newsArticles = [
    {
      title: 'TCS Signs Multi-Billion Dollar AI Transformation Deal with European Banking Giant',
      description: 'Tata Consultancy Services announced a major multi-year digital transformation deal focusing on enterprise cloud and AI capabilities.',
      source: 'Economic Times',
      url: 'https://economictimes.indiatimes.com/tech/tcs-ai-deal-2026',
      publishedAt: new Date(Date.now() - 3600000 * 2),
      company: 'Tata Consultancy Services',
      symbol: 'TCS',
      sector: 'IT Services',
      hash: 'tcs_ai_deal_hash_2026',
      sentiment: 'POSITIVE',
      confidence: 0.92,
      score: 0.85,
    },
    {
      title: 'Reliance Industries Reports 18% YoY Increase in Net Profit Driven by Retail and Telecom',
      description: 'Jio subscriber additions surge as Reliance Retail expands footprint across tier 2 cities in Q3 earnings results.',
      source: 'Business Standard',
      url: 'https://business-standard.com/markets/reliance-q3-profit-surge-2026',
      publishedAt: new Date(Date.now() - 3600000 * 5),
      company: 'Reliance Industries',
      symbol: 'RELIANCE',
      sector: 'Oil & Telecom',
      hash: 'reliance_q3_profit_hash_2026',
      sentiment: 'POSITIVE',
      confidence: 0.88,
      score: 0.78,
    },
    {
      title: 'Infosys Guidance Adjusted Marginally Amid Global Tech Spending Moderation',
      description: 'Management notes slight delays in client decision-making cycles across North American financial services sector.',
      source: 'Financial Express',
      url: 'https://financialexpress.com/markets/infosys-guidance-2026',
      publishedAt: new Date(Date.now() - 3600000 * 12),
      company: 'Infosys Ltd',
      symbol: 'INFY',
      sector: 'IT Services',
      hash: 'infosys_guidance_hash_2026',
      sentiment: 'NEUTRAL',
      confidence: 0.75,
      score: -0.05,
    },
    {
      title: 'HDFC Bank Asset Quality Improves with Gross NPA Ratio Dropping to 1.1%',
      description: 'HDFC Bank posts strong credit growth with healthy net interest margin expansion across retail loan portfolios.',
      source: 'Moneycontrol',
      url: 'https://moneycontrol.com/banking/hdfcbank-npa-drop-2026',
      publishedAt: new Date(Date.now() - 3600000 * 8),
      company: 'HDFC Bank Ltd',
      symbol: 'HDFCBANK',
      sector: 'Banking',
      hash: 'hdfcbank_npa_drop_hash_2026',
      sentiment: 'POSITIVE',
      confidence: 0.94,
      score: 0.89,
    },
    {
      title: 'Tata Motors EV Sales Surge 45% YoY in Commercial & Passenger Segments',
      description: 'Tata Motors maintains market dominance in domestic electric vehicle segment with high adoption rates.',
      source: 'LiveMint',
      url: 'https://livemint.com/auto/tata-motors-ev-sales-2026',
      publishedAt: new Date(Date.now() - 3600000 * 18),
      company: 'Tata Motors Ltd',
      symbol: 'TATAMOTORS',
      sector: 'Automobile',
      hash: 'tatamotors_ev_sales_hash_2026',
      sentiment: 'POSITIVE',
      confidence: 0.90,
      score: 0.82,
    }
  ];

  for (const article of newsArticles) {
    const createdNews = await prisma.newsArticle.upsert({
      where: { hash: article.hash },
      update: article,
      create: article,
    });

    await prisma.sentimentResult.create({
      data: {
        symbol: article.symbol,
        articleId: createdNews.id,
        score: article.score,
        confidence: article.confidence,
        label: article.sentiment,
        positivePct: article.sentiment === 'POSITIVE' ? 85.0 : 15.0,
        neutralPct: article.sentiment === 'NEUTRAL' ? 70.0 : 15.0,
        negativePct: article.sentiment === 'NEGATIVE' ? 80.0 : 15.0,
        timestamp: article.publishedAt,
      }
    });
  }

  console.log('Seeded sample news & sentiment entries.');

  // 4. Create Watchlist for Demo User
  const watchlist = await prisma.watchlist.create({
    data: {
      userId: user.id,
      name: 'Nifty Bluechips',
    }
  });

  for (let i = 0; i < Math.min(6, createdInstruments.length); i++) {
    await prisma.watchlistItem.create({
      data: {
        watchlistId: watchlist.id,
        instrumentId: createdInstruments[i].id,
      }
    });
  }

  // 5. Seed Sample Holdings
  const sampleHoldings = [
    { symbol: 'TCS', tradingSymbol: 'TCS-EQ', exchangeSegment: 'nse_cm', quantity: 25, averagePrice: 4150.0, currentPrice: 4280.0, investedValue: 103750.0, currentValue: 107000.0, unrealizedPnL: 3250.0, unrealizedPnLPct: 3.13 },
    { symbol: 'RELIANCE', tradingSymbol: 'RELIANCE-EQ', exchangeSegment: 'nse_cm', quantity: 40, averagePrice: 2820.0, currentPrice: 2950.0, investedValue: 112800.0, currentValue: 118000.0, unrealizedPnL: 5200.0, unrealizedPnLPct: 4.61 },
    { symbol: 'HDFCBANK', tradingSymbol: 'HDFCBANK-EQ', exchangeSegment: 'nse_cm', quantity: 60, averagePrice: 1680.0, currentPrice: 1740.0, investedValue: 100800.0, currentValue: 104400.0, unrealizedPnL: 3600.0, unrealizedPnLPct: 3.57 },
  ];

  for (const h of sampleHoldings) {
    await prisma.holding.create({
      data: {
        userId: user.id,
        ...h
      }
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
