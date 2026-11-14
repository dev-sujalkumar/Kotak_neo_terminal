import { PrismaClient } from '@prisma/client';
import { kotakNeoBrokerService } from '../kotak/KotakNeoClient.js';
import { logger } from '../../utils/logger.js';

const prisma = new PrismaClient();

export class PortfolioSyncService {
  /**
   * Sync holdings from Kotak API to local database
   */
  public async syncHoldingsFromKotak(userId: string): Promise<number> {
    try {
      if (!kotakNeoBrokerService.isConnected()) {
        logger.warn('Kotak session not connected, cannot sync holdings');
        return 0;
      }

      const kotakHoldings = await kotakNeoBrokerService.getHoldings();
      
      if (!kotakHoldings || kotakHoldings.length === 0) {
        logger.warn(`No holdings returned from Kotak API for user ${userId}`);
        return 0;
      }

      let syncedCount = 0;

      for (const holding of kotakHoldings) {
        if (holding.quantity === 0) continue;

        try {
          await prisma.holding.upsert({
            where: {
              id: `${userId}_${holding.symbol}`, // Unique identifier
            },
            update: {
              quantity: holding.quantity,
              averagePrice: holding.averagePrice,
              currentPrice: holding.currentPrice,
              investedValue: holding.investedValue,
              currentValue: holding.currentValue,
              unrealizedPnL: holding.unrealizedPnL,
              unrealizedPnLPct: holding.unrealizedPnLPct,
              updatedAt: new Date(),
            },
            create: {
              id: `${userId}_${holding.symbol}`,
              userId,
              symbol: holding.symbol,
              tradingSymbol: holding.tradingSymbol,
              exchangeSegment: holding.exchangeSegment,
              quantity: holding.quantity,
              averagePrice: holding.averagePrice,
              currentPrice: holding.currentPrice,
              investedValue: holding.investedValue,
              currentValue: holding.currentValue,
              unrealizedPnL: holding.unrealizedPnL,
              unrealizedPnLPct: holding.unrealizedPnLPct,
            },
          });

          syncedCount++;
          logger.info(`✓ Synced holding: ${holding.symbol} (Qty: ${holding.quantity})`);
        } catch (err: any) {
          logger.error(`Failed to sync holding ${holding.symbol}: ${err.message}`);
        }
      }

      // Delete holdings that are no longer in Kotak portfolio
      const kotakSymbols = kotakHoldings.map((h) => h.symbol);
      const existingHoldings = await prisma.holding.findMany({
        where: { userId },
        select: { symbol: true },
      });

      for (const existing of existingHoldings) {
        if (!kotakSymbols.includes(existing.symbol)) {
          await prisma.holding.deleteMany({
            where: { userId, symbol: existing.symbol },
          });
          logger.info(`✓ Removed holding: ${existing.symbol} (no longer in Kotak portfolio)`);
        }
      }

      logger.info(`✅ Holdings sync complete: ${syncedCount} holdings synced for user ${userId}`);
      return syncedCount;
    } catch (err: any) {
      logger.error(`Holdings sync failed: ${err.message}`);
      return 0;
    }
  }

  /**
   * Sync positions from Kotak API to local database
   */
  public async syncPositionsFromKotak(userId: string): Promise<number> {
    try {
      if (!kotakNeoBrokerService.isConnected()) {
        logger.warn('Kotak session not connected, cannot sync positions');
        return 0;
      }

      const kotakPositions = await kotakNeoBrokerService.getPositions();

      if (!kotakPositions || kotakPositions.length === 0) {
        logger.warn(`No positions returned from Kotak API for user ${userId}`);
        return 0;
      }

      let syncedCount = 0;

      for (const position of kotakPositions) {
        if (position.netQuantity === 0) continue;

        try {
          await prisma.position.upsert({
            where: {
              id: `${userId}_${position.symbol}_${position.product}`, // Unique per symbol-product
            },
            update: {
              netQuantity: position.netQuantity,
              buyQty: position.buyQty,
              buyValue: position.buyValue,
              sellQty: position.sellQty,
              sellValue: position.sellValue,
              averagePrice: position.averagePrice,
              realizedPnL: position.realizedPnL,
              updatedAt: new Date(),
            },
            create: {
              id: `${userId}_${position.symbol}_${position.product}`,
              userId,
              symbol: position.symbol,
              tradingSymbol: position.tradingSymbol,
              exchangeSegment: position.exchangeSegment,
              product: position.product,
              netQuantity: position.netQuantity,
              buyQty: position.buyQty,
              buyValue: position.buyValue,
              sellQty: position.sellQty,
              sellValue: position.sellValue,
              averagePrice: position.averagePrice,
              realizedPnL: position.realizedPnL,
            },
          });

          syncedCount++;
          logger.info(`✓ Synced position: ${position.symbol} ${position.product} (Net: ${position.netQuantity})`);
        } catch (err: any) {
          logger.error(`Failed to sync position ${position.symbol}: ${err.message}`);
        }
      }

      // Delete positions that are no longer open
      const kotakPositionKeys = kotakPositions
        .filter((p) => p.netQuantity !== 0)
        .map((p) => `${p.symbol}_${p.product}`);

      const existingPositions = await prisma.position.findMany({
        where: { userId },
        select: { symbol: true, product: true },
      });

      for (const existing of existingPositions) {
        const key = `${existing.symbol}_${existing.product}`;
        if (!kotakPositionKeys.includes(key)) {
          await prisma.position.deleteMany({
            where: { userId, symbol: existing.symbol, product: existing.product },
          });
          logger.info(`✓ Removed position: ${existing.symbol} ${existing.product} (closed)`);
        }
      }

      logger.info(`✅ Positions sync complete: ${syncedCount} positions synced for user ${userId}`);
      return syncedCount;
    } catch (err: any) {
      logger.error(`Positions sync failed: ${err.message}`);
      return 0;
    }
  }

  /**
   * Full portfolio sync (holdings + positions)
   */
  public async syncFullPortfolio(userId: string): Promise<{ holdings: number; positions: number }> {
    logger.info(`🔄 Starting full portfolio sync for user ${userId}...`);

    const holdingsCount = await this.syncHoldingsFromKotak(userId);
    const positionsCount = await this.syncPositionsFromKotak(userId);

    logger.info(`✅ Full portfolio sync complete: ${holdingsCount} holdings, ${positionsCount} positions`);
    return { holdings: holdingsCount, positions: positionsCount };
  }

  /**
   * Schedule periodic portfolio sync (every 60 seconds)
   */
  public startPeriodicSync(userId: string, intervalSeconds: number = 60): NodeJS.Timer {
    logger.info(`⏰ Starting periodic portfolio sync for user ${userId} (every ${intervalSeconds}s)`);

    return setInterval(async () => {
      try {
        await this.syncFullPortfolio(userId);
      } catch (err: any) {
        logger.error(`Periodic sync error: ${err.message}`);
      }
    }, intervalSeconds * 1000);
  }
}

export const portfolioSyncService = new PortfolioSyncService();
