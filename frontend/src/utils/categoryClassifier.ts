export interface SectorCategoryMeta {
  id: string;
  name: string;
  shortName: string;
  color: string;
  badgeClass: string;
  gradientClass: string;
}

export const TOP_10_CATEGORIES: SectorCategoryMeta[] = [
  {
    id: 'banking',
    name: 'Banking & Financials',
    shortName: 'Banking/BFSI',
    color: '#10b981',
    badgeClass: 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300',
    gradientClass: 'from-emerald-950/70 to-emerald-900/30 border-emerald-500/30',
  },
  {
    id: 'it',
    name: 'IT & Technology',
    shortName: 'IT & Tech',
    color: '#06b6d4',
    badgeClass: 'border-cyan-500/30 bg-cyan-950/30 text-cyan-300',
    gradientClass: 'from-cyan-950/70 to-cyan-900/30 border-cyan-500/30',
  },
  {
    id: 'energy',
    name: 'Energy & Power',
    shortName: 'Energy & Oil',
    color: '#eab308',
    badgeClass: 'border-amber-500/30 bg-amber-950/30 text-amber-300',
    gradientClass: 'from-amber-950/70 to-amber-900/30 border-amber-500/30',
  },
  {
    id: 'auto',
    name: 'Automotive & EV',
    shortName: 'Auto & EV',
    color: '#3b82f6',
    badgeClass: 'border-blue-500/30 bg-blue-950/30 text-blue-300',
    gradientClass: 'from-blue-950/70 to-blue-900/30 border-blue-500/30',
  },
  {
    id: 'pharma',
    name: 'Pharma & Healthcare',
    shortName: 'Pharma/Health',
    color: '#ec4899',
    badgeClass: 'border-pink-500/30 bg-pink-950/30 text-pink-300',
    gradientClass: 'from-pink-950/70 to-pink-900/30 border-pink-500/30',
  },
  {
    id: 'industrial',
    name: 'Metals & Industrial',
    shortName: 'Industrial',
    color: '#f97316',
    badgeClass: 'border-orange-500/30 bg-orange-950/30 text-orange-300',
    gradientClass: 'from-orange-950/70 to-orange-900/30 border-orange-500/30',
  },
  {
    id: 'consumer',
    name: 'FMCG & Consumer',
    shortName: 'FMCG/Retail',
    color: '#8b5cf6',
    badgeClass: 'border-purple-500/30 bg-purple-950/30 text-purple-300',
    gradientClass: 'from-purple-950/70 to-purple-900/30 border-purple-500/30',
  },
  {
    id: 'infra',
    name: 'Infra & Real Estate',
    shortName: 'Infra/Realty',
    color: '#14b8a6',
    badgeClass: 'border-teal-500/30 bg-teal-950/30 text-teal-300',
    gradientClass: 'from-teal-950/70 to-teal-900/30 border-teal-500/30',
  },
  {
    id: 'telecom',
    name: 'Telecom & Media',
    shortName: 'Telecom/5G',
    color: '#6366f1',
    badgeClass: 'border-indigo-500/30 bg-indigo-950/30 text-indigo-300',
    gradientClass: 'from-indigo-950/70 to-indigo-900/30 border-indigo-500/30',
  },
  {
    id: 'macro',
    name: 'Macro & Regulatory',
    shortName: 'Macro/Policy',
    color: '#a855f7',
    badgeClass: 'border-violet-500/30 bg-violet-950/30 text-violet-300',
    gradientClass: 'from-violet-950/70 to-violet-900/30 border-violet-500/30',
  },
];

export function classifyNewsCategory(title: string, description: string = '', symbol: string = ''): string {
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

