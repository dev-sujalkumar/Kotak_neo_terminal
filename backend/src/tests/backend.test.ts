import { describe, it, expect } from 'vitest';
import { TechnicalAnalysisService } from '../services/technical/TechnicalAnalysisService.js';
import { CombinedSignalEngine } from '../services/signal/CombinedSignalEngine.js';

describe('Stock Sentiment Engine & Technical Analysis Unit Tests', () => {
  it('should correctly calculate SMA, EMA, RSI, and MACD indicators', () => {
    const candles = TechnicalAnalysisService.generateSyntheticCandles(4000, 100);
    const indicators = TechnicalAnalysisService.calculateIndicators('TCS', '1D', candles);

    expect(indicators.symbol).toBe('TCS');
    expect(indicators.sma10).toBeGreaterThan(0);
    expect(indicators.ema9).toBeGreaterThan(0);
    expect(indicators.rsi14).toBeGreaterThanOrEqual(0);
    expect(indicators.rsi14).toBeLessThanOrEqual(100);
    expect(indicators.macd.macdLine).toBeDefined();
    expect(indicators.bollingerBands.upper).toBeGreaterThan(indicators.bollingerBands.lower);
    expect(indicators.supportLevel).toBeGreaterThan(0);
    expect(indicators.resistanceLevel).toBeGreaterThan(0);
    expect(['UPTREND', 'DOWNTREND', 'SIDEWAYS']).toContain(indicators.trend);
  });

  it('should calculate technical composite score based on indicator thresholds', () => {
    const candles = TechnicalAnalysisService.generateSyntheticCandles(4000, 100);
    const indicators = TechnicalAnalysisService.calculateIndicators('TCS', '1D', candles);
    const score = TechnicalAnalysisService.calculateTechnicalScore(indicators, 4000);

    expect(typeof score).toBe('number');
    expect(score).toBeGreaterThanOrEqual(-100);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('should correctly compute Combined Signal score and explainable reasons', () => {
    const quote = {
      symbol: 'RELIANCE',
      tradingSymbol: 'RELIANCE-EQ',
      exchangeSegment: 'nse_cm',
      ltp: 2950.0,
      change: 45.0,
      changePercent: 1.55,
      open: 2910.0,
      high: 2960.0,
      low: 2905.0,
      close: 2905.0,
      volume: 1500000,
      bidPrice: 2949.5,
      bidQty: 100,
      askPrice: 2950.5,
      askQty: 120,
      lastUpdated: new Date().toISOString(),
    };

    const sentiment = {
      symbol: 'RELIANCE',
      overallSentiment: 'POSITIVE' as const,
      score: 0.75,
      confidence: 0.90,
      positivePct: 85.0,
      neutralPct: 10.0,
      negativePct: 5.0,
      trend: 'BULLISH',
      newsCount: 10,
      topFactors: ['Strong quarterly profit surge'],
    };

    const candles = TechnicalAnalysisService.generateSyntheticCandles(2950, 100);
    const technical = TechnicalAnalysisService.calculateIndicators('RELIANCE', '1D', candles);

    const signal = CombinedSignalEngine.generateSignal('RELIANCE', quote, sentiment, technical);

    expect(signal.symbol).toBe('RELIANCE');
    expect(signal.combinedScore).toBeGreaterThan(-100);
    expect(signal.combinedScore).toBeLessThan(100);
    expect(signal.confidence).toBeGreaterThanOrEqual(50);
    expect(signal.reasons.length).toBeGreaterThan(0);
  });
});
