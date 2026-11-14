import { describe, it, expect, vi } from 'vitest';
import { sentimentService } from '../services/sentiment/SentimentService.js';
import axios from 'axios';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('Custom News Sentiment Analyzer Service', () => {
  it('should reject empty or whitespace text', async () => {
    await expect(sentimentService.analyzeCustomNews({ text: '   ' })).rejects.toThrow(
      'Please enter financial news or article text to analyze.'
    );
  });

  it('should call NLP microservice and return complete multi-paragraph sentiment analysis', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        sentiment: 'Positive',
        positive_probability: 0.88,
        negative_probability: 0.04,
        neutral_probability: 0.08,
        confidence: 0.88,
        normalized_score: 0.84,
        wordCount: 85,
        characterCount: 520,
        paragraphCount: 3,
        detectedEntities: [
          {
            name: 'Tata Consultancy Services',
            ticker: 'TCS.NS',
            type: 'Company',
            sentiment: 'Positive',
            score: 0.91,
            confidence: 0.95,
            reasons: ['TCS reported a stellar 14.8% jump in quarterly profit.']
          },
          {
            name: 'Infosys',
            ticker: 'INFY.NS',
            type: 'Competitor',
            sentiment: 'Negative',
            score: -0.85,
            confidence: 0.90,
            reasons: ['Infosys slashed its annual revenue forecast following project deferrals.']
          }
        ],
        sentenceAnalysis: [
          {
            sentence: 'TCS reported a stellar 14.8% jump in quarterly profit.',
            sentiment: 'Positive',
            positive_probability: 0.95,
            negative_probability: 0.02,
            neutral_probability: 0.03,
            score: 0.93,
            confidence: 0.95
          }
        ],
        sentimentTrajectory: [0.93, -0.85],
        strongestPositiveStatements: ['TCS reported a stellar 14.8% jump in quarterly profit.'],
        strongestNegativeStatements: ['Infosys slashed its annual revenue forecast.'],
        neutralStatements: [],
        detectedEvents: [
          {
            eventType: 'Earnings Announcement',
            significance: 'Substantial profit growth surpassing estimates.',
            explanation: 'Direct operational financial performance catalyst.'
          }
        ],
        financialImpacts: [
          {
            category: 'Revenue & Growth',
            classification: 'Highly Positive',
            explanation: 'Strong order book wins driving revenue.'
          }
        ],
        marketDirection: 'Bullish',
        marketDirectionProbability: 0.82,
        supportingEvidence: ['Strong earnings beat and dividend declaration.'],
        negativeSignals: ['Competitor slowdown flagged.'],
        positiveSignals: ['Stellar profit growth.'],
        importantUncertainties: ['European banking discretionary spend.'],
        executiveSummary: 'Strong positive sentiment for TCS driven by earnings beat and dividend expansion.'
      }
    });

    const result = await sentimentService.analyzeCustomNews({
      text: 'Tata Consultancy Services reported a stellar 14.8% jump in profit. In contrast, Infosys slashed guidance.',
      selectedCompany: 'Tata Consultancy Services',
      selectedTicker: 'TCS.NS'
    });

    expect(result.sentiment).toBe('Positive');
    expect(result.normalized_score).toBe(0.84);
    expect(result.confidence).toBe(0.88);
    expect(result.detectedEntities.length).toBe(2);
    expect(result.detectedEntities[0].sentiment).toBe('Positive');
    expect(result.detectedEntities[1].sentiment).toBe('Negative');
    expect(result.marketDirection).toBe('Bullish');
  });

  it('should fall back gracefully to local financial lexicon if NLP service fails', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('NLP Service Unavailable'));

    const result = await sentimentService.analyzeCustomNews({
      text: 'Reliance Industries reported record revenue, profit growth, and dividend expansion.',
      selectedCompany: 'Reliance Industries',
      selectedTicker: 'RELIANCE.NS'
    });

    expect(result.sentiment).toBe('Positive');
    expect(result.positive_probability).toBeGreaterThan(0.5);
    expect(result.normalized_score).toBeGreaterThan(0);
    expect(result.detectedEntities.length).toBe(1);
    expect(result.detectedEntities[0].name).toBe('Reliance Industries');
    expect(result.financialImpacts.length).toBeGreaterThan(0);
    expect(result.marketDirection).toBe('Bullish');
  });
});

