import { TechnicalIndicators } from '../../types/index.js';

export interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class TechnicalAnalysisService {
  public static calculateIndicators(symbol: string, period: string, candles: Candle[]): TechnicalIndicators {
    if (!candles || candles.length < 20) {
      throw new Error(`Not enough historical market data to calculate technical indicators for ${symbol}.`);
    }

    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);

    const sma10 = this.calculateSMA(closes, 10);
    const sma20 = this.calculateSMA(closes, 20);
    const sma50 = this.calculateSMA(closes, 50);
    const sma200 = this.calculateSMA(closes, Math.min(200, closes.length));

    const ema9 = this.calculateEMA(closes, 9);
    const ema21 = this.calculateEMA(closes, 21);
    const ema50 = this.calculateEMA(closes, 50);

    const rsi14 = this.calculateRSI(closes, 14);
    const macd = this.calculateMACD(closes);
    const bb = this.calculateBollingerBands(closes, 20, 2);
    const atr14 = this.calculateATR(candles, 14);

    const pivot = (highs[highs.length - 1] + lows[lows.length - 1] + closes[closes.length - 1]) / 3;
    const supportLevel = parseFloat((2 * pivot - highs[highs.length - 1]).toFixed(2));
    const resistanceLevel = parseFloat((2 * pivot - lows[lows.length - 1]).toFixed(2));

    let trend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS' = 'SIDEWAYS';
    const lastClose = closes[closes.length - 1];
    if (lastClose > ema50 && ema9 > ema21) {
      trend = 'UPTREND';
    } else if (lastClose < ema50 && ema9 < ema21) {
      trend = 'DOWNTREND';
    }

    return {
      symbol,
      period,
      sma10: parseFloat(sma10.toFixed(2)),
      sma20: parseFloat(sma20.toFixed(2)),
      sma50: parseFloat(sma50.toFixed(2)),
      sma200: parseFloat(sma200.toFixed(2)),
      ema9: parseFloat(ema9.toFixed(2)),
      ema21: parseFloat(ema21.toFixed(2)),
      ema50: parseFloat(ema50.toFixed(2)),
      rsi14: parseFloat(rsi14.toFixed(2)),
      macd: {
        macdLine: parseFloat(macd.macdLine.toFixed(2)),
        signalLine: parseFloat(macd.signalLine.toFixed(2)),
        histogram: parseFloat(macd.histogram.toFixed(2)),
        crossover: macd.crossover,
      },
      bollingerBands: {
        upper: parseFloat(bb.upper.toFixed(2)),
        middle: parseFloat(bb.middle.toFixed(2)),
        lower: parseFloat(bb.lower.toFixed(2)),
        bandwidth: parseFloat(bb.bandwidth.toFixed(2)),
      },
      atr14: parseFloat(atr14.toFixed(2)),
      supportLevel,
      resistanceLevel,
      trend,
    };
  }

  public static calculateTechnicalScore(indicators: TechnicalIndicators, currentPrice: number): number {
    let score = 0;

    // RSI Analysis (weight: 25)
    if (indicators.rsi14 < 30) score += 25; // Oversold (Bullish reversal)
    else if (indicators.rsi14 > 70) score -= 25; // Overbought
    else if (indicators.rsi14 >= 50) score += 10;
    else score -= 10;

    // EMA Crossover & Trend (weight: 35)
    if (currentPrice > indicators.ema50) score += 20;
    else score -= 20;

    if (indicators.ema9 > indicators.ema21) score += 15;
    else score -= 15;

    // MACD Analysis (weight: 25)
    if (indicators.macd.crossover === 'BULLISH') score += 25;
    else if (indicators.macd.crossover === 'BEARISH') score -= 25;
    else if (indicators.macd.histogram > 0) score += 10;
    else score -= 10;

    // Bollinger Band position (weight: 15)
    if (currentPrice <= indicators.bollingerBands.lower) score += 15; // Bounce off lower band
    else if (currentPrice >= indicators.bollingerBands.upper) score -= 15;

    return Math.max(-100, Math.min(100, score));
  }

  public static calculateSMA(data: number[], period: number): number {
    if (data.length < period) return data[data.length - 1] || 0;
    const slice = data.slice(data.length - period);
    const sum = slice.reduce((a, b) => a + b, 0);
    return sum / period;
  }

  public static calculateEMA(data: number[], period: number): number {
    if (data.length === 0) return 0;
    const k = 2 / (period + 1);
    let ema = data[0];
    for (let i = 1; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
    }
    return ema;
  }

  public static calculateRSI(data: number[], period: number = 14): number {
    if (data.length <= period) return 50;
    let gains = 0;
    let losses = 0;

    for (let i = data.length - period; i < data.length; i++) {
      const difference = data[i] - data[i - 1];
      if (difference >= 0) gains += difference;
      else losses -= difference;
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  public static calculateMACD(data: number[]) {
    const ema12 = this.calculateEMA(data, 12);
    const ema26 = this.calculateEMA(data, 26);
    const macdLine = ema12 - ema26;
    const signalLine = macdLine * 0.85; // Simplified signal representation
    const histogram = macdLine - signalLine;

    let crossover: 'BULLISH' | 'BEARISH' | 'NONE' = 'NONE';
    if (histogram > 0 && macdLine > 0) crossover = 'BULLISH';
    else if (histogram < 0 && macdLine < 0) crossover = 'BEARISH';

    return { macdLine, signalLine, histogram, crossover };
  }

  public static calculateBollingerBands(data: number[], period: number = 20, stdDevMultiplier: number = 2) {
    const middle = this.calculateSMA(data, period);
    const slice = data.slice(Math.max(0, data.length - period));
    const mean = middle;
    const variance = slice.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / slice.length;
    const stdDev = Math.sqrt(variance);

    const upper = middle + (stdDevMultiplier * stdDev);
    const lower = middle - (stdDevMultiplier * stdDev);
    const bandwidth = middle > 0 ? ((upper - lower) / middle) * 100 : 0;

    return { upper, middle, lower, bandwidth };
  }

  public static calculateATR(candles: Candle[], period: number = 14): number {
    if (candles.length < 2) return 10;
    let trSum = 0;
    const count = Math.min(candles.length - 1, period);

    for (let i = candles.length - count; i < candles.length; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;
      const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
      trSum += tr;
    }

    return trSum / count;
  }

  public static generateSyntheticCandles(currentPrice: number, count: number = 100): Candle[] {
    const candles: Candle[] = [];
    let price = currentPrice * 0.9;
    const now = Date.now();

    for (let i = count; i >= 0; i--) {
      const time = new Date(now - i * 86400000).toISOString();
      const change = (Math.sin(i / 5) + (Math.random() - 0.48)) * (price * 0.015);
      const open = price;
      const close = price + change;
      const high = Math.max(open, close) + Math.random() * (price * 0.008);
      const low = Math.min(open, close) - Math.random() * (price * 0.008);
      const volume = Math.floor(500000 + Math.random() * 1000000);

      price = close;
      candles.push({ timestamp: time, open, high, low, close, volume });
    }

    return candles;
  }
}
