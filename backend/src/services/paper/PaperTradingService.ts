import { PrismaClient } from '@prisma/client';
import { OrderPlacementParams } from '../../types/index.js';
import { kotakNeoBrokerService } from '../kotak/KotakNeoClient.js';
import { logger } from '../../utils/logger.js';

const prisma = new PrismaClient();

export class PaperTradingService {
  public async placePaperOrder(userId: string, params: OrderPlacementParams) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found.');

    // Fetch quote to get execution price
    const quote = await kotakNeoBrokerService.getQuotes(params.exchangeSegment, params.symbol);
    const executionPrice = params.orderType === 'LIMIT' && params.price ? params.price : quote.ltp;
    const requiredCost = params.quantity * executionPrice;

    if (params.transactionType === 'BUY') {
      if (user.paperBalance < requiredCost) {
        throw new Error(`Insufficient Virtual Balance. Available: ₹${user.paperBalance.toFixed(2)}, Required: ₹${requiredCost.toFixed(2)}`);
      }
    }

    const orderNumber = `PAPER_ORD_${Date.now()}`;

    // Create Paper Order Record
    const paperOrder = await prisma.paperOrder.create({
      data: {
        userId,
        orderNumber,
        symbol: params.symbol.toUpperCase(),
        tradingSymbol: params.tradingSymbol || `${params.symbol.toUpperCase()}-EQ`,
        exchangeSegment: params.exchangeSegment,
        transactionType: params.transactionType,
        orderType: params.orderType,
        product: params.product,
        quantity: params.quantity,
        price: executionPrice,
        status: 'FILLED', // Simulate instant fill for market/simulated limit
      }
    });

    // Create Paper Trade Record
    await prisma.paperTrade.create({
      data: {
        userId,
        paperOrderId: paperOrder.id,
        symbol: params.symbol.toUpperCase(),
        quantity: params.quantity,
        price: executionPrice,
      }
    });

    // Update Virtual Cash Balance
    const balanceChange = params.transactionType === 'BUY' ? -requiredCost : requiredCost;
    await prisma.user.update({
      where: { id: userId },
      data: { paperBalance: user.paperBalance + balanceChange }
    });

    // Update Paper Holdings/Positions
    await this.updatePaperHolding(userId, params, executionPrice);

    // Record Audit Log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'PAPER_ORDER_PLACED',
        symbol: params.symbol.toUpperCase(),
        orderId: orderNumber,
        mode: 'PAPER',
        details: `${params.transactionType} ${params.quantity} ${params.symbol} @ ₹${executionPrice.toFixed(2)}`,
      }
    });

    logger.info(`Paper Order ${orderNumber} executed successfully for ${user.email}`);

    return {
      orderNumber,
      status: 'FILLED',
      executionPrice,
      quantity: params.quantity,
      transactionType: params.transactionType,
      remainingBalance: user.paperBalance + balanceChange,
    };
  }

  private async updatePaperHolding(userId: string, params: OrderPlacementParams, price: number) {
    const symbol = params.symbol.toUpperCase();
    const existing = await prisma.holding.findFirst({
      where: { userId, symbol }
    });

    if (params.transactionType === 'BUY') {
      if (existing) {
        const newQty = existing.quantity + params.quantity;
        const newAvg = ((existing.quantity * existing.averagePrice) + (params.quantity * price)) / newQty;
        await prisma.holding.update({
          where: { id: existing.id },
          data: {
            quantity: newQty,
            averagePrice: parseFloat(newAvg.toFixed(2)),
            currentPrice: price,
            investedValue: parseFloat((newQty * newAvg).toFixed(2)),
            currentValue: parseFloat((newQty * price).toFixed(2)),
            unrealizedPnL: parseFloat(((price - newAvg) * newQty).toFixed(2)),
            unrealizedPnLPct: parseFloat((((price - newAvg) / newAvg) * 100).toFixed(2)),
          }
        });
      } else {
        await prisma.holding.create({
          data: {
            userId,
            symbol,
            tradingSymbol: params.tradingSymbol || `${symbol}-EQ`,
            exchangeSegment: params.exchangeSegment,
            quantity: params.quantity,
            averagePrice: price,
            currentPrice: price,
            investedValue: parseFloat((params.quantity * price).toFixed(2)),
            currentValue: parseFloat((params.quantity * price).toFixed(2)),
            unrealizedPnL: 0.0,
            unrealizedPnLPct: 0.0,
          }
        });
      }
    } else if (params.transactionType === 'SELL' && existing) {
      const remainingQty = existing.quantity - params.quantity;
      if (remainingQty <= 0) {
        await prisma.holding.delete({ where: { id: existing.id } });
      } else {
        await prisma.holding.update({
          where: { id: existing.id },
          data: {
            quantity: remainingQty,
            investedValue: parseFloat((remainingQty * existing.averagePrice).toFixed(2)),
            currentValue: parseFloat((remainingQty * price).toFixed(2)),
            unrealizedPnL: parseFloat(((price - existing.averagePrice) * remainingQty).toFixed(2)),
          }
        });
      }
    }
  }
}

export const paperTradingService = new PaperTradingService();
