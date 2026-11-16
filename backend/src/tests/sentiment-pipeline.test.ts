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
});
