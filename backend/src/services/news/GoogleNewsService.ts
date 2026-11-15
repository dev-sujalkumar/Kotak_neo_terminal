import axios from 'axios';
import { createHash } from 'node:crypto';

export interface StockNewsArticle {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
  symbol: string;
  sentiment?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  score?: number;
  positive_score?: number;
  negative_score?: number;
  neutral_score?: number;
  confidence?: number;
  category?: string;
}

export const TOP_10_SECTOR_CATEGORIES = [
  'Banking & Financials',
  'IT & Technology',
  'Automotive & EV',
  'Energy & Power',
  'Pharma & Healthcare',
  'Metals & Industrial',
  'FMCG & Consumer',
  'Infra & Real Estate',
  'Telecom & Media',
  'Macro & Regulatory',
] as const;

export function classifyFinancialNewsCategory(title: string, description: string = '', symbol: string = ''): string {
  const text = `${title} ${description}`.toLowerCase();
  const sym = symbol.toUpperCase().replace(/\.(NS|BO)$/, '');

  const symbolCategoryMap: Record<string, string> = {
    HDFCBANK: 'Banking & Financials',
    SBIN: 'Banking & Financials',
    ICICIBANK: 'Banking & Financials',
    KOTAKBANK: 'Banking & Financials',
    AXISBANK: 'Banking & Financials',
    BAJFINANCE: 'Banking & Financials',
    TCS: 'IT & Technology',
    INFY: 'IT & Technology',
    WIPRO: 'IT & Technology',
    HCLTECH: 'IT & Technology',
    TECHM: 'IT & Technology',
    LTIM: 'IT & Technology',
    TATAMOTORS: 'Automotive & EV',
    MARUTI: 'Automotive & EV',
    'M&M': 'Automotive & EV',
    BAJAJ_AUTO: 'Automotive & EV',
    RELIANCE: 'Energy & Power',
    ONGC: 'Energy & Power',
    BPCL: 'Energy & Power',
    IOC: 'Energy & Power',
    NTPC: 'Energy & Power',
    POWERGRID: 'Energy & Power',
    SUNPHARMA: 'Pharma & Healthcare',
    DRREDDY: 'Pharma & Healthcare',
    CIPLA: 'Pharma & Healthcare',
    DIVISLAB: 'Pharma & Healthcare',
    TATASTEEL: 'Metals & Industrial',
    JSWSTEEL: 'Metals & Industrial',
    HINDALCO: 'Metals & Industrial',
    LT: 'Metals & Industrial',
    COALINDIA: 'Metals & Industrial',
    ITC: 'FMCG & Consumer',
    HINDUNILVR: 'FMCG & Consumer',
    NESTLEIND: 'FMCG & Consumer',
    BRITANNIA: 'FMCG & Consumer',
    ULTRACEMCO: 'Infra & Real Estate',
    DLF: 'Infra & Real Estate',
    BHARTIARTL: 'Telecom & Media',
  };

  const categoryRules: Array<{ category: string; regex: RegExp; weight: number }> = [
    {
      category: 'Banking & Financials',
      regex: /\b(bank|banking|npa|loans?|lending|deposits?|credit|rbi|repo rate|monetary policy|nbfc|fintech|insurance|lic|hdfc|icici|sbi|axis|kotak|yield|liquidity|treasury|interest rate|mortgage)\b/i,
      weight: 2,
    },
    {
      category: 'IT & Technology',
      regex: /\b(it sector|software|cloud|generative ai|artificial intelligence|\bai\b|saas|semiconductor|chips?|tcs|infosys|wipro|hcl|tanla|firstsource|cybersecurity|data center|tech stocks?|digital transformation)\b/i,
      weight: 2,
    },
    {
      category: 'Automotive & EV',
      regex: /\b(auto|automobile|vehicles?|cars?|electric vehicle|\bev\b|\bevs\b|tata motors|maruti|mahindra|bajaj|two-wheeler|commercial vehicle|battery manufacturing|oem|dealerships?|hybrids?)\b/i,
      weight: 2,
    },
    {
      category: 'Energy & Power',
      regex: /\b(energy|oil|gas|crude|petroleum|refinery|solar|renewable|green hydrogen|wind power|power grid|ongc|reliance|bpcl|ioc|hpcl|clean energy|fuel|ethanol|drilling|thermal)\b/i,
      weight: 2,
    },
    {
      category: 'Pharma & Healthcare',
      regex: /\b(pharma|pharmaceutical|drug|medicine|usfda|fda approval|clinical trials?|healthcare|hospitals?|sun pharma|dr reddy|cipla|lupin|biotech|api formulation|vaccine|diagnostic)\b/i,
      weight: 2,
    },
    {
      category: 'Metals & Industrial',
      regex: /\b(steel|iron|metal|mining|copper|aluminium|zinc|tata steel|jsw steel|hindalco|vedanta|coal india|heavy engineering|machinery|industrial production|manufacturing|larsen|defense|foundry)\b/i,
      weight: 2,
    },
    {
      category: 'FMCG & Consumer',
      regex: /\b(fmcg|consumer goods|retail|supermarket|itc|hindustan unilever|hul|nestle|britannia|packaged food|beverages?|rural demand|urban consumption|personal care|apparel|e-commerce)\b/i,
      weight: 2,
    },
    {
      category: 'Infra & Real Estate',
      regex: /\b(infrastructure|infra|real estate|realty|housing|apartments?|cement|ultratech|ambuja|construction|highways?|expressways?|ports?|airports?|dlf|smart city|epc contracts?)\b/i,
      weight: 2,
    },
    {
      category: 'Telecom & Media',
      regex: /\b(telecom|telecommunications?|5g|6g|spectrum|broadband|airtel|bharti airtel|jio|vodafone idea|trai|streaming|broadcasting|ott|media|entertainment|towers?)\b/i,
      weight: 2,
    },
    {
      category: 'Macro & Regulatory',
      regex: /\b(gdp|inflation|cpi|wpi|deficit|fiscal|budget|finance ministry|sebi|taxes?|gst|export|import|tariffs?|customs|rupee|forex|fii|dii|fpi|sovereign rating|trade deficit)\b/i,
      weight: 2,
    },
  ];

  let bestCategory = symbolCategoryMap[sym] || '';
  let highestScore = 0;

  for (const rule of categoryRules) {
    const matches = text.match(new RegExp(rule.regex, 'gi'));
    if (matches) {
      const score = matches.length * rule.weight;
      if (score > highestScore) {
        highestScore = score;
        bestCategory = rule.category;
      }
    }
  }

  return bestCategory || symbolCategoryMap[sym] || 'Macro & Regulatory';
}

const CACHE_TTL_MS = 10 * 60_000; // 10-min cache for large 2000-article sets
const MAX_ARTICLES = 2000;
const cache = new Map<string, { expiresAt: number; articles: StockNewsArticle[] }>();

const companyNames: Record<string, string> = {
  TCS: 'Tata Consultancy Services',
  RELIANCE: 'Reliance Industries',
  INFY: 'Infosys',
  HDFCBANK: 'HDFC Bank',
  ICICIBANK: 'ICICI Bank',
  SBIN: 'State Bank of India',
  BHARTIARTL: 'Bharti Airtel',
  TATAMOTORS: 'Tata Motors',
  ITC: 'ITC Limited',
  LT: 'Larsen and Toubro',
  SUNPHARMA: 'Sun Pharmaceutical Industries',
  WIPRO: 'Wipro',
  HCLTECH: 'HCL Technologies',
  TECHM: 'Tech Mahindra',
  LTIM: 'LTIMindtree',
  KOTAKBANK: 'Kotak Mahindra Bank',
  AXISBANK: 'Axis Bank',
  BAJFINANCE: 'Bajaj Finance',
  MARUTI: 'Maruti Suzuki',
  TATASTEEL: 'Tata Steel',
  JSWSTEEL: 'JSW Steel',
  HINDALCO: 'Hindalco Industries',
  COALINDIA: 'Coal India',
  NTPC: 'NTPC',
  POWERGRID: 'Power Grid Corporation',
  ONGC: 'Oil and Natural Gas Corporation',
  BPCL: 'Bharat Petroleum',
  IOC: 'Indian Oil Corporation',
  DRREDDY: 'Dr Reddys Laboratories',
  CIPLA: 'Cipla',
  DIVISLAB: 'Divis Laboratories',
  HINDUNILVR: 'Hindustan Unilever',
  NESTLEIND: 'Nestle India',
  BRITANNIA: 'Britannia Industries',
  ULTRACEMCO: 'UltraTech Cement',
  DLF: 'DLF',
  VEDANTA: 'Vedanta',
  BAJAJFINSV: 'Bajaj Finserv',
  ADANIPORTS: 'Adani Ports',
  ADANIENT: 'Adani Enterprises',
  GRASIM: 'Grasim Industries',
  ASIANPAINT: 'Asian Paints',
  TATAMOTERS: 'Tata Motors',
  ZOMATO: 'Zomato',
  PAYTM: 'Paytm',
  SWIGGY: 'Swiggy',
  JIOFIN: 'Jio Financial Services',
  HAL: 'Hindustan Aeronautics',
  BEL: 'Bharat Electronics',
  MAZDOCK: 'Mazagon Dock',
  TRENT: 'Trent',
  SUZLON: 'Suzlon Energy',
  IRCTC: 'IRCTC',
  IRFC: 'Indian Railway Finance',
  RVNL: 'Rail Vikas Nigam',
  BSE: 'BSE India',
  CDSL: 'CDSL',
  TITAN: 'Titan Company',
  WMT: 'Walmart',
  AAPL: 'Apple',
  MSFT: 'Microsoft',
  GOOGL: 'Alphabet Google',
  GOOG: 'Google',
  AMZN: 'Amazon',
  TSLA: 'Tesla',
  NVDA: 'NVIDIA',
  META: 'Meta Platforms',
  NFLX: 'Netflix',
  TGT: 'Target',
  DIS: 'Walt Disney',
  AMD: 'AMD',
  INTC: 'Intel',
  PLTR: 'Palantir',
  UBER: 'Uber',
  COIN: 'Coinbase',
  IREDA: 'IREDA Indian Renewable Energy',
  TATATECH: 'Tata Technologies',
  KALYANKJIL: 'Kalyan Jewellers',
  INDIGO: 'IndiGo InterGlobe Aviation',
  PVRINOX: 'PVR INOX',
  IDEA: 'Vodafone Idea',
  EXIDEIND: 'Exide Industries',
  DIXON: 'Dixon Technologies',
  POLYCAB: 'Polycab India',
  HAVELLS: 'Havells India',
  INDHOTEL: 'Indian Hotels Taj',
  VOLTAS: 'Voltas',
  JUBLFOOD: 'Jubilant FoodWorks Dominos',
  VBL: 'Varun Beverages Pepsi',
  AMBUJACEM: 'Ambuja Cements',
  ACC: 'ACC Cement',
  SAIL: 'Steel Authority of India SAIL',
  BHEL: 'Bharat Heavy Electricals BHEL',
  BDL: 'Bharat Dynamics',
  COCHINSHIP: 'Cochin Shipyard',
  RAILTEL: 'RailTel Corporation',
  RITES: 'RITES Limited',
  TITAGARH: 'Titagarh Rail',
  DEEPAKNTR: 'Deepak Nitrite',
  PIIND: 'PI Industries',
  SRF: 'SRF Limited',
  PIDILITIND: 'Pidilite Fevicol',
  KPRMILL: 'KPR Mill',
  BATAINDIA: 'Bata India',
  RELAXO: 'Relaxo Footwears',
  REDTAPE: 'Redtape',
  ASTRAL: 'Astral Pipes',
  RATNAMANI: 'Ratnamani Metals',
  WELCORP: 'Welspun Corp',
  RADICO: 'Radico Khaitan Magic Moments',
  UNITEDSPR: 'United Spirits Diageo',
  UBL: 'United Breweries Kingfisher',
  AMBER: 'Amber Enterprises',
  SYRMA: 'Syrma SGS',
  AVALON: 'Avalon Technologies',
  ARM: 'Arm Holdings',
  PANW: 'Palo Alto Networks',
  CRWD: 'CrowdStrike',
  SNOW: 'Snowflake',
  SMCI: 'Super Micro Computer',
  SHOP: 'Shopify',
  PYPL: 'PayPal',
  SQ: 'Block Square Cash App',
};

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function readTag(xml: string, name: string): string {
  const match = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return match ? decodeXml(match[1].trim()) : '';
}

export class GoogleNewsService {
  /**
   * Fetches up to MAX_ARTICLES (2000) deduplicated financial news articles
   * using 40+ parallel RSS queries across diverse topic angles.
   */
  public async getForSymbol(inputSymbol: string, requestedLimit = 2000): Promise<StockNewsArticle[]> {
    const symbol = inputSymbol.trim().toUpperCase().replace(/\.(NS|BO)$/, '');
    if (!/^[A-Z0-9][A-Z0-9&._-]{0,19}$/.test(symbol)) {
      throw new Error('Enter a valid stock symbol to search related news.');
    }

    const cached = cache.get(symbol);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.articles.slice(0, Math.min(requestedLimit, MAX_ARTICLES));
    }

    const company = companyNames[symbol] || symbol;
    const sym = symbol;

    // ── 40 diverse RSS query angles ────────────────────────────────────────
    const queries: string[] = [
      // Core company / stock queries
      `"${company}" stock`,
      `"${company}" shares NSE`,
      `"${company}" BSE stock market`,
      `"${sym}" NSE BSE`,
      `"${company}" India market`,

      // Financial performance
      `"${company}" quarterly results`,
      `"${company}" earnings revenue profit`,
      `"${company}" annual report results`,
      `"${company}" EBITDA margins`,
      `"${company}" net profit loss`,

      // Corporate actions
      `"${company}" dividend bonus split`,
      `"${company}" merger acquisition deal`,
      `"${company}" order win contract`,
      `"${company}" IPO FPO rights issue`,
      `"${company}" buyback stake sale`,

      // Growth & strategy
      `"${company}" expansion capex investment`,
      `"${company}" business outlook guidance`,
      `"${company}" new product launch`,
      `"${company}" partnership joint venture`,
      `"${company}" export import global`,

      // Analyst & market outlook
      `"${company}" analyst target buy sell`,
      `"${company}" upgrade downgrade rating`,
      `"${sym}" stock outlook forecast`,
      `"${company}" valuation price target`,
      `"${company}" institutional investor FII`,

      // Regulatory & legal
      `"${company}" SEBI RBI regulatory`,
      `"${company}" tax court legal penalty`,
      `"${company}" compliance audit fraud`,
      `"${company}" government policy impact`,
      `"${company}" ESG sustainability`,

      // Sector & macro
      `"${company}" sector industry trends`,
      `"${sym}" Nifty Sensex performance`,
      `"${company}" GDP inflation impact`,
      `"${company}" rupee dollar forex`,
      `"${company}" commodity raw material`,

      // Leadership & management
      `"${company}" CEO MD chairman board`,
      `"${company}" management change leadership`,
      `"${company}" employee hiring layoff`,

      // Broad market news mentioning the stock
      `"${sym}" stock news India 2024`,
      `"${sym}" stock news India 2025`,
    ];

    // Fire all queries in parallel (batch of 40)
    const responses = await Promise.allSettled(
      queries.map(q =>
        axios.get<string>('https://news.google.com/rss/search', {
          params: { q, hl: 'en-IN', gl: 'IN', ceid: 'IN:en' },
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FinSentBot/2.0)' },
          timeout: 12_000,
          responseType: 'text',
        })
      )
    );

    const allArticles: StockNewsArticle[] = [];

    for (const res of responses) {
      if (res.status !== 'fulfilled' || typeof res.value.data !== 'string') continue;
      const items = res.value.data.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) || [];
      for (const item of items) {
        const title = readTag(item, 'title').replace(/<[^>]+>/g, '').trim();
        const url   = readTag(item, 'link');
        const publishedAt = readTag(item, 'pubDate');
        if (!title || !url || !Number.isFinite(Date.parse(publishedAt))) continue;

        const description = readTag(item, 'description')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 600);
        const source   = readTag(item, 'source') || 'Google News';
        const category = classifyFinancialNewsCategory(title, description, symbol);

        allArticles.push({
          id: createHash('sha1').update(url + title).digest('hex'),
          title,
          description,
          source,
          url,
          publishedAt: new Date(publishedAt).toISOString(),
          symbol,
          category,
        });
      }
    }

    // ── Deduplicate by exact URL + fuzzy title fingerprint ─────────────────
    const seenUrl  = new Set<string>();
    const seenKey  = new Set<string>();
    const distinct: StockNewsArticle[] = [];

    for (const art of allArticles) {
      const titleKey = art.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60);
      if (seenUrl.has(art.url) || seenKey.has(titleKey)) continue;
      seenUrl.add(art.url);
      seenKey.add(titleKey);
      distinct.push(art);
    }

    // Sort newest-first
    distinct.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

    cache.set(symbol, { articles: distinct, expiresAt: Date.now() + CACHE_TTL_MS });
    return distinct.slice(0, Math.min(requestedLimit, MAX_ARTICLES));
  }
}

export const googleNewsService = new GoogleNewsService();
