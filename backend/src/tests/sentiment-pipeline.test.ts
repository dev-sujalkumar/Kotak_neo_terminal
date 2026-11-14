import { describe, it, expect, vi } from 'vitest';
import { sentimentService } from '../services/sentiment/SentimentService.js';
import { googleNewsService } from '../services/news/GoogleNewsService.js';
import { yahooFinanceService } from '../services/market/YahooFinanceService.js';
import axios from 'axios';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('FinBERT Sentiment Analysis and Machine Learning Pipeline', () => {
  it('should correctly format and calculate sentiment metrics from FinBERT output', async () => {
    vi.spyOn(googleNewsService, 'getForSymbol').mockResolvedValueOnce([
      {
        id: '1',
        title: 'TCS reports 12% rise in quarterly net profit beating estimates',
        description: 'Strong deal pipeline and cloud revenue drive double digit growth.',
        source: 'Economic Times',
        url: 'https://example.com/news/1',
        publishedAt: new Date().toISOString(),
        symbol: 'TCS',
      },
    ]);

    mockedAxios.post.mockResolvedValueOnce({
      data: {
        symbol: 'TCS',
        overallSentiment: 'POSITIVE',
        sentimentScore: 0.825,
        confidence: 0.912,
        positivePercentage: 88.5,
        neutralPercentage: 8.5,
        negativePercentage: 3.0,
        sentimentTrend: 'BULLISH_SURGE',
        totalArticles: 1,
        momentum: 0.25,
        volatility: 0.08,
        catalysts: ['Profit (earnings)', 'Order (deal/expansion)'],
        insights: 'FinBERT evaluated 1 recent news article with strong positive sentiment flow.',
      },
    });

    const result = await sentimentService.getSentimentForSymbol('TCS');

    expect(result.symbol).toBe('TCS');
    expect(result.overallSentiment).toBe('POSITIVE');
    expect(result.score).toBeGreaterThan(0.5);
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.positivePct).toBeGreaterThan(80);
    expect(result.method).toContain('FinBERT');
    expect(result.topFactors.length).toBeGreaterThan(0);
  });

  it('should fallback gracefully to financial dictionary scoring if NLP service is offline', async () => {
    vi.spyOn(googleNewsService, 'getForSymbol').mockResolvedValueOnce([
      {
        id: '2',
        title: 'Reliance Industries records strong quarterly profit growth and expansion',
        description: 'New orders and margin improvement reported across retail and telecom.',
        source: 'LiveMint',
        url: 'https://example.com/news/2',
        publishedAt: new Date().toISOString(),
        symbol: 'RELIANCE',
      },
    ]);

    mockedAxios.post.mockRejectedValueOnce(new Error('Connection refused to NLP microservice'));

    const result = await sentimentService.getSentimentForSymbol('RELIANCE');

    expect(result.symbol).toBe('RELIANCE');
    expect(result.score).toBeGreaterThan(0);
    expect(result.overallSentiment).toBe('POSITIVE');
    expect(result.method).toContain('Local Financial');
  });

  it('should calculate sentiment-price correlation and lead/lag analysis', async () => {
    vi.spyOn(sentimentService, 'getNewsForSymbol').mockResolvedValueOnce([
      {
        id: '3',
        title: 'Infosys expands AI deal portfolio with key enterprise contract',
        description: 'Strategic partnership announced.',
        source: 'Reuters',
        url: 'https://example.com/news/3',
        publishedAt: new Date().toISOString(),
        symbol: 'INFY',
        score: 0.65,
      },
    ]);

    vi.spyOn(yahooFinanceService, 'getSnapshot').mockResolvedValueOnce({
      companyName: 'Infosys Limited',
      candles: [
        { timestamp: '2026-11-08T00:00:00Z', open: 1850, high: 1870, low: 1845, close: 1860, volume: 1500000 },
        { timestamp: '2026-11-09T00:00:00Z', open: 1860, high: 1890, low: 1855, close: 1885, volume: 1800000 },
      ],
      quote: {
        symbol: 'INFY',
        tradingSymbol: 'INFY.NS',
        exchangeSegment: 'NSE',
        ltp: 1885,
        change: 25,
        changePercent: 1.34,
        open: 1860,
        high: 1890,
        low: 1855,
        close: 1860,
        volume: 1800000,
        bidPrice: 1884.5,
        bidQty: 100,
        askPrice: 1885.5,
        askQty: 150,
        lastUpdated: new Date().toISOString(),
      },
    });

    mockedAxios.post.mockResolvedValueOnce({
      data: {
        symbol: 'INFY',
        pearsonCorrelation: 0.48,
        sentimentPriceDirectionMatchPct: 75.0,
        rollingCorrelation: [{ date: '2026-11-09', rollingCorrelation: 0.45 }],
        sentimentVsReturns: [{ date: '2026-11-09', sentimentScore: 0.65, returnPct: 1.25, aligned: true }],
        leadLagAnalysis: {
          optimalLagDays: 1,
          sameDayCorrelation: 0.48,
          nextDayLeadCorrelation: 0.52,
          leadStatus: 'Sentiment leads next-day price direction',
        },
        interpretation: 'Strong positive correlation detected.',
      },
    });

    const correlation = await sentimentService.getSentimentCorrelation('INFY');
    expect(correlation.symbol).toBe('INFY');
    expect(correlation.pearsonCorrelation).toBe(0.48);
    expect(correlation.sentimentPriceDirectionMatchPct).toBe(75.0);
    expect(correlation.leadLagAnalysis.optimalLagDays).toBe(1);
  });
});
