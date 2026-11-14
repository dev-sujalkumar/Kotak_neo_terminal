import { CombinedSignal, SentimentAnalysis, TechnicalIndicators, QuoteData } from '../../types/index.js';
import { TechnicalAnalysisService } from '../technical/TechnicalAnalysisService.js';

export interface SignalWeightConfig {
  sentiment: number;
  technical: number;
  momentum: number;
}

export class CombinedSignalEngine {
  public static generateSignal(
    symbol: string,
    quote: QuoteData,
    sentiment: SentimentAnalysis,
    technical: TechnicalIndicators,
    customWeights?: SignalWeightConfig
  ): CombinedSignal {
    const weights = customWeights || { sentiment: 0.4, technical: 0.4, momentum: 0.2 };

    // 1. Sentiment Score (-100 to +100)
    const sentimentScoreScaled = sentiment.score * 100;

    // 2. Technical Score (-100 to +100)
    const technicalScore = TechnicalAnalysisService.calculateTechnicalScore(technical, quote.ltp);

    // 3. Momentum Score (-100 to +100)
    let momentumScore = quote.changePercent * 25; // 2% move = 50 pts
    momentumScore = Math.max(-100, Math.min(100, momentumScore));

    // Combined Score
    const combinedScore = Math.round(
      (sentimentScoreScaled * weights.sentiment) +
      (technicalScore * weights.technical) +
      (momentumScore * weights.momentum)
    );

    // Classification
    let signal: 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEARISH' = 'NEUTRAL';
    if (combinedScore >= 60) signal = 'STRONG_BULLISH';
    else if (combinedScore >= 20) signal = 'BULLISH';
    else if (combinedScore <= -60) signal = 'STRONG_BEARISH';
    else if (combinedScore <= -20) signal = 'BEARISH';

    // Calculate Confidence %
    const confidence = Math.round(
      (sentiment.confidence * 40) +
      (Math.abs(technicalScore) / 100 * 40) +
      (Math.abs(momentumScore) / 100 * 20)
    );

    // Generate Human-Readable Reasons
    const reasons: string[] = [];
    const warnings: string[] = [];

    if (sentiment.score > 0.2) {
      reasons.push(`✓ Positive financial news sentiment (${(sentiment.positivePct).toFixed(0)}% positive headlines)`);
    } else if (sentiment.score < -0.2) {
      warnings.push(`! Negative news sentiment flow (${(sentiment.negativePct).toFixed(0)}% negative headlines)`);
    } else {
      reasons.push(`• Neutral news sentiment environment`);
    }

    if (quote.ltp > technical.ema50) {
      reasons.push(`✓ Price trading above key 50 EMA (₹${technical.ema50.toFixed(2)})`);
    } else {
      warnings.push(`! Price trading below 50 EMA support (₹${technical.ema50.toFixed(2)})`);
    }

    if (technical.rsi14 < 35) {
      reasons.push(`✓ RSI in oversold value zone (${technical.rsi14.toFixed(1)})`);
    } else if (technical.rsi14 > 70) {
      warnings.push(`! RSI indicating overbought momentum (${technical.rsi14.toFixed(1)})`);
    } else {
      reasons.push(`✓ RSI momentum in healthy neutral range (${technical.rsi14.toFixed(1)})`);
    }

    if (technical.macd.crossover === 'BULLISH') {
      reasons.push(`✓ Bullish MACD histogram crossover detected`);
    } else if (technical.macd.crossover === 'BEARISH') {
      warnings.push(`! Bearish MACD signal line crossover detected`);
    }

    if (quote.changePercent > 0) {
      reasons.push(`✓ Intraday price strength (+${quote.changePercent.toFixed(2)}%)`);
    } else {
      warnings.push(`! Intraday price weakness (${quote.changePercent.toFixed(2)}%)`);
    }

    return {
      symbol: symbol.toUpperCase(),
      signal,
      combinedScore,
      confidence: Math.max(50, Math.min(98, confidence)),
      sentimentScore: Math.round(sentimentScoreScaled),
      technicalScore: Math.round(technicalScore),
      momentumScore: Math.round(momentumScore),
      weights,
      reasons,
      warnings,
      lastUpdated: new Date().toISOString(),
    };
  }
}
