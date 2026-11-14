import { TechnicalAnalysisService } from '../technical/TechnicalAnalysisService.js';
import { yahooFinanceService } from '../market/YahooFinanceService.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface BacktestParams {
  symbol: string;
  initialCapital?: number;
  rsiBuyThreshold?: number; // e.g. 45
  rsiSellThreshold?: number; // e.g. 70
  stopLossPct?: number; // e.g. 2%
  takeProfitPct?: number; // e.g. 5%
}

export class BacktestService {
  public async runBacktest(userId: string, params: BacktestParams) {
    const symbol = params.symbol.trim().toUpperCase();
    const initialCapital = params.initialCapital ?? 100000;
    const rsiBuyThreshold = params.rsiBuyThreshold ?? 45;
    const rsiSellThreshold = params.rsiSellThreshold ?? 70;
    const stopLossPct = params.stopLossPct ?? 2.0;
    const takeProfitPct = params.takeProfitPct ?? 5.0;

    if (!Number.isFinite(initialCapital) || initialCapital <= 0) {
      throw new Error('Initial capital must be greater than zero.');
    }
    if (
      !Number.isFinite(rsiBuyThreshold) || rsiBuyThreshold < 0 || rsiBuyThreshold > 100 ||
      !Number.isFinite(rsiSellThreshold) || rsiSellThreshold < 0 || rsiSellThreshold > 100
    ) {
      throw new Error('RSI thresholds must be between 0 and 100.');
    }
    if (
      !Number.isFinite(stopLossPct) || stopLossPct <= 0 ||
      !Number.isFinite(takeProfitPct) || takeProfitPct <= 0
    ) {
      throw new Error('Stop loss and take profit percentages must be greater than zero.');
    }

    const { candles } = await yahooFinanceService.getSnapshot(symbol);
    if (candles.length < 30) {
      throw new Error(`Not enough real price history to backtest ${symbol}.`);
    }

    let capital = initialCapital;
    let position: { entryPrice: number; quantity: number } | null = null;
    const tradeLogs: any[] = [];
    const equityCurve: number[] = [initialCapital];

    let wins = 0;
    let losses = 0;
    let totalGain = 0;
    let totalLoss = 0;

    for (let i = 26; i < candles.length - 1; i++) {
      const priorCandles = candles.slice(0, i);
      const currentCandle = candles[i];
      const indicators = TechnicalAnalysisService.calculateIndicators(symbol, '1D', priorCandles);

      // 1. Exit Logic if position active
      if (position) {
        const stopPrice = position.entryPrice * (1 - stopLossPct / 100);
        const targetPrice = position.entryPrice * (1 + takeProfitPct / 100);
        const isStopLoss = currentCandle.low <= stopPrice;
        const isTakeProfit = currentCandle.high >= targetPrice;
        const isRsiExit = indicators.rsi14 >= rsiSellThreshold;

        if (isStopLoss || isTakeProfit || isRsiExit) {
          const exitPrice = isStopLoss
            ? Math.min(currentCandle.open, stopPrice)
            : isTakeProfit
              ? Math.max(currentCandle.open, targetPrice)
              : currentCandle.open;
          const changePct = ((exitPrice - position.entryPrice) / position.entryPrice) * 100;
          const pnl = (exitPrice - position.entryPrice) * position.quantity;
          capital += pnl;

          if (pnl > 0) {
            wins++;
            totalGain += pnl;
          } else {
            losses++;
            totalLoss += Math.abs(pnl);
          }

          tradeLogs.push({
            tradeNumber: tradeLogs.length + 1,
            type: 'EXIT',
            entryPrice: position.entryPrice,
            exitPrice,
            quantity: position.quantity,
            pnl: parseFloat(pnl.toFixed(2)),
            pnlPct: parseFloat(changePct.toFixed(2)),
            reason: isStopLoss ? 'Stop Loss' : (isTakeProfit ? 'Take Profit' : 'RSI Overbought Exit'),
            date: currentCandle.timestamp,
          });

          position = null;
        }
      }

      // 2. Entry Logic if no position active
      if (!position) {
        const isRsiBuy = indicators.rsi14 <= rsiBuyThreshold;
        const isEmaBullish = priorCandles[priorCandles.length - 1].close > indicators.ema50;

        if (isRsiBuy && isEmaBullish) {
          const entryPrice = currentCandle.open;
          const quantity = Math.floor((capital * 0.95) / entryPrice);
          if (quantity > 0) {
            position = { entryPrice, quantity };
            tradeLogs.push({
              tradeNumber: tradeLogs.length + 1,
              type: 'ENTRY',
              price: entryPrice,
              quantity,
              date: currentCandle.timestamp,
              rsi: indicators.rsi14.toFixed(1),
            });
          }
        }
      }

      equityCurve.push(capital + (
        position ? (currentCandle.close - position.entryPrice) * position.quantity : 0
      ));
    }

    const lastCandle = candles[candles.length - 1];
    if (position) {
      const pnl = (lastCandle.close - position.entryPrice) * position.quantity;
      const pnlPct = ((lastCandle.close - position.entryPrice) / position.entryPrice) * 100;
      capital += pnl;
      if (pnl > 0) {
        wins++;
        totalGain += pnl;
      } else {
        losses++;
        totalLoss += Math.abs(pnl);
      }
      tradeLogs.push({
        tradeNumber: tradeLogs.length + 1,
        type: 'EXIT',
        entryPrice: position.entryPrice,
        exitPrice: lastCandle.close,
        quantity: position.quantity,
        pnl: parseFloat(pnl.toFixed(2)),
        pnlPct: parseFloat(pnlPct.toFixed(2)),
        reason: 'End of history',
        date: lastCandle.timestamp,
      });
    }
    equityCurve.push(capital);

    // Performance Calculations
    const totalReturn = parseFloat((((capital - initialCapital) / initialCapital) * 100).toFixed(2));
    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? parseFloat(((wins / totalTrades) * 100).toFixed(2)) : 0;
    const profitFactor = totalLoss > 0 ? parseFloat((totalGain / totalLoss).toFixed(2)) : totalGain > 0 ? 99.0 : 0;

    // Max Drawdown calculation
    let maxCapital = initialCapital;
    let maxDrawdown = 0;
    for (const val of equityCurve) {
      if (val > maxCapital) maxCapital = val;
      const dd = ((maxCapital - val) / maxCapital) * 100;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    const elapsedDays = Math.max(
      1,
      (Date.parse(candles[candles.length - 1].timestamp) - Date.parse(candles[0].timestamp)) / 86_400_000
    );
    const cagr = parseFloat((((capital / initialCapital) ** (365 / elapsedDays) - 1) * 100).toFixed(2));
    const dailyReturns = equityCurve.slice(1).flatMap((value, index) => {
      const priorValue = equityCurve[index];
      return priorValue > 0 ? [value / priorValue - 1] : [];
    });
    const averageDailyReturn = dailyReturns.reduce((sum, value) => sum + value, 0) / dailyReturns.length;
    const dailyVariance = dailyReturns.reduce(
      (sum, value) => sum + (value - averageDailyReturn) ** 2,
      0
    ) / Math.max(1, dailyReturns.length - 1);
    const dailyVolatility = Math.sqrt(dailyVariance);
    const sharpeRatio = parseFloat(
      (dailyVolatility > 0 ? averageDailyReturn / dailyVolatility * Math.sqrt(252) : 0).toFixed(2)
    );

    const resultRecord = await prisma.backtest.create({
      data: {
        userId,
        strategyName: `RSI + EMA Price Strategy (${symbol})`,
        symbol,
        startDate: new Date(candles[0].timestamp),
        endDate: new Date(candles[candles.length - 1].timestamp),
        parameters: JSON.stringify(params),
        totalReturn,
        cagr,
        winRate,
        maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
        sharpeRatio,
        profitFactor,
        totalTrades,
        tradeLogsJson: JSON.stringify(tradeLogs),
      }
    });

    return {
      id: resultRecord.id,
      symbol,
      initialCapital,
      finalCapital: parseFloat(capital.toFixed(2)),
      totalReturn,
      cagr,
      winRate,
      maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
      sharpeRatio,
      profitFactor,
      totalTrades,
      tradeLogs,
      equityCurve,
    };
  }
}

export const backtestService = new BacktestService();
