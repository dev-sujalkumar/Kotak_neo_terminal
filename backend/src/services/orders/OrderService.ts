import { PrismaClient } from '@prisma/client';
import { OrderPlacementParams, MarginCheckResponse } from '../../types/index.js';
import { kotakNeoBrokerService } from '../kotak/KotakNeoClient.js';
import { paperTradingService } from '../paper/PaperTradingService.js';
import { logger } from '../../utils/logger.js';

const prisma = new PrismaClient();

export class OrderService {
  public async validateOrder(userId: string, params: OrderPlacementParams): Promise<{ valid: boolean; marginCheck: MarginCheckResponse; estimatedValue: number; errorReason?: string }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    if (!Number.isInteger(params.quantity) || params.quantity <= 0) {
      throw new Error('Quantity must be a positive whole number.');
    }

    if (user.tradingMode === 'LIVE' && !params.scripToken) {
      const scrips = await kotakNeoBrokerService.searchScrip({
        exchangeSegment: params.exchangeSegment,
        symbol: params.symbol,
      });
      const requestedTradingSymbol = (params.tradingSymbol || `${params.symbol}-EQ`).toUpperCase();
      const scrip = scrips.find(item => String(item.pTrdSymbol || '').toUpperCase() === requestedTradingSymbol);
      if (!scrip?.pSymbol) throw new Error(`Kotak scrip details were not found for ${params.symbol}.`);
      params.scripToken = String(scrip.pSymbol);
      if (typeof scrip.pTrdSymbol === 'string') params.tradingSymbol = scrip.pTrdSymbol;
    }

    const quoteSymbol = user.tradingMode === 'LIVE'
      ? params.tradingSymbol || `${params.symbol}-EQ`
      : params.symbol;
    const quote = await kotakNeoBrokerService.getQuotes(params.exchangeSegment, quoteSymbol, user.tradingMode !== 'LIVE');
    const orderPrice = params.orderType !== 'MARKET' && params.price ? params.price : quote.ltp;
    const estimatedValue = params.quantity * orderPrice;

    if (!Number.isFinite(orderPrice) || orderPrice <= 0) throw new Error('A valid market or limit price is required.');

    const requiredMargin = estimatedValue * (params.product === 'MIS' ? 0.2 : 1);
    const marginCheck: MarginCheckResponse = user.tradingMode === 'PAPER'
      ? {
          availableCash: Number(user.paperBalance),
          availableMargin: Number(user.paperBalance),
          requiredMargin,
          orderMargin: requiredMargin,
          sufficientFunds: Number(user.paperBalance) >= requiredMargin,
          statusMessage: 'Estimated paper-trading margin; no broker funds were queried.',
        }
      : await kotakNeoBrokerService.checkMargin({
          exchangeSegment: params.exchangeSegment,
          tradingSymbol: params.tradingSymbol || `${params.symbol}-EQ`,
          transactionType: params.transactionType,
          product: params.product,
          quantity: params.quantity,
          price: orderPrice,
          orderType: params.orderType === 'MARKET' ? 'MKT' : params.orderType,
          triggerPrice: params.triggerPrice,
          instrumentToken: params.scripToken,
          stopLossType: params.stopLossType,
          stopLossValue: params.stopLossValue,
          squareOffType: params.squareOffType,
          squareOffValue: params.squareOffValue,
          trailingStopLoss: params.trailingStopLoss,
          trailingStopLossValue: params.trailingStopLossValue,
        });

    if (!marginCheck.sufficientFunds && user.tradingMode === 'LIVE') {
      return {
        valid: false,
        marginCheck,
        estimatedValue,
        errorReason: `Insufficient funds. Required margin: ₹${marginCheck.requiredMargin.toFixed(2)}, Available margin: ₹${marginCheck.availableMargin.toFixed(2)}`
      };
    }

    return {
      valid: true,
      marginCheck,
      estimatedValue,
    };
  }

  public async executeOrder(userId: string, params: OrderPlacementParams, confirmedByUserId: boolean) {
    if (!confirmedByUserId) {
      throw new Error('Order execution requires explicit user confirmation.');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found.');

    if (user.tradingMode === 'LIVE' && !kotakNeoBrokerService.isConnected()) {
      throw new Error('Kotak Neo broker session is not connected. Please connect Kotak Neo account in Settings.');
    }

    const validation = await this.validateOrder(userId, params);
    if (!validation.valid) {
      throw new Error(validation.errorReason || 'Order validation failed.');
    }

    // Branch based on Trading Mode
    if (user.tradingMode === 'PAPER') {
      logger.info(`Executing order in PAPER TRADING mode for user ${user.email}`);
      return paperTradingService.placePaperOrder(userId, params);
    }

    if (user.tradingMode === 'LIVE') {
      logger.info(`Executing LIVE order via Kotak Neo API for user ${user.email}`);
      const result = await kotakNeoBrokerService.placeOrder(params);

      // Record Order in Local Database
      await prisma.order.create({
        data: {
          userId,
          orderNumber: result.orderNumber,
          symbol: params.symbol.toUpperCase(),
          tradingSymbol: params.tradingSymbol || `${params.symbol.toUpperCase()}-EQ`,
          exchangeSegment: params.exchangeSegment,
          transactionType: params.transactionType,
          orderType: params.orderType,
          product: params.product,
          quantity: params.quantity,
          price: params.price || 0.0,
          triggerPrice: params.triggerPrice || 0.0,
          status: 'OPEN',
          validity: params.validity || 'DAY',
          mode: 'LIVE',
        }
      });

      // Log Audit Event
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'LIVE_ORDER_PLACED',
          symbol: params.symbol.toUpperCase(),
          orderId: result.orderNumber,
          mode: 'LIVE',
          details: `${params.transactionType} ${params.quantity} ${params.symbol} @ ${params.price || 'MARKET'}`,
        }
      });

      return {
        orderNumber: result.orderNumber,
        status: result.status,
        mode: 'LIVE',
      };
    }

    throw new Error('Invalid trading mode configuration.');
  }
}

export const orderService = new OrderService();
