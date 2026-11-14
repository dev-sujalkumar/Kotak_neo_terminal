import { afterEach, describe, expect, it, vi } from 'vitest';

const mockedAxios = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('axios', () => ({
  default: mockedAxios,
}));

import { KotakNeoBrokerService } from '../services/kotak/KotakNeoClient.js';

describe('Kotak Neo client', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('maps documented RMS limits and sends filters and server ID', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        data: {
          Net: '1250.50',
          MarginUsed: '300',
          CollateralValue: '100',
          NotionalCash: '900',
          ExposureMarginPrsnt: '50',
          TimeStamp: '1737540175823',
        },
      },
    });
    const service = new KotakNeoBrokerService();
    service.setSession('https://api.kotaksecurities.com', 'session-token', 'session-sid', 'access-token', 'dc-id');

    const limits = await service.getLimits('FO', 'NSE', 'NRML');

    expect(limits.netFunds).toBe(1250.5);
    expect(limits.marginUsed).toBe(300);
    expect(limits.exposureMargin).toBe(50);
    const encodedLimitsBody = new URLSearchParams(
      mockedAxios.post.mock.calls[0][1] as string,
    );
    expect(encodedLimitsBody.get('jData')).toBe(JSON.stringify({
      seg: 'FO',
      exch: 'NSE',
      prod: 'NRML',
    }));
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.kotaksecurities.com/quick/user/limits',
      `jData=${encodeURIComponent(JSON.stringify({ seg: 'FO', exch: 'NSE', prod: 'NRML' }))}`,
      expect.objectContaining({
        params: { sId: 'dc-id' },
        headers: expect.objectContaining({
          Auth: 'session-token',
          sid: 'session-sid',
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
      }),
    );
  });

  it('does not invent live funds when disconnected or when Kotak returns no net balance', async () => {
    const service = new KotakNeoBrokerService();
    await expect(service.getLimits()).rejects.toThrow('Connect to Kotak Neo');

    service.setSession('https://api.kotaksecurities.com', 'session-token', 'session-sid');
    mockedAxios.post.mockResolvedValueOnce({ data: { data: { MarginUsed: '0' } } });
    await expect(service.getLimits()).rejects.toThrow('without a valid net balance');
  });

  it('maps Kotak documented holding fields to the portfolio model', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        data: [{
          displaySymbol: 'IDEA',
          averagePrice: 9.5699,
          quantity: 35,
          exchangeSegment: 'nse_cm',
          holdingCost: 334.9475,
          mktValue: 327.6,
          closingPrice: 9.36,
          symbol: 'IDEA',
        }],
      },
    });
    const service = new KotakNeoBrokerService();
    service.setSession('https://api.kotaksecurities.com', 'session-token', 'session-sid');

    const holdings = await service.getHoldings();
    expect(holdings).toHaveLength(1);
    expect(holdings[0]).toMatchObject({
      symbol: 'IDEA',
      tradingSymbol: 'IDEA-EQ',
      exchangeSegment: 'nse_cm',
      quantity: 35,
      averagePrice: 9.5699,
      currentPrice: 9.36,
      investedValue: 334.9475,
      currentValue: 327.6,
    });
    expect(holdings[0].unrealizedPnL).toBeCloseTo(-7.3475);
    expect(holdings[0].unrealizedPnLPct).toBeCloseTo((-7.3475 / 334.9475) * 100);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://api.kotaksecurities.com/portfolio/v1/holdings',
      expect.objectContaining({
        headers: expect.objectContaining({
          Auth: 'session-token',
          sid: 'session-sid',
        }),
      }),
    );
  });

  it('finds instruments from Kotak master files', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({
        data: {
          data: {
            filesPaths: ['https://lapi.kotaksecurities.com/master/nse_cm.csv'],
          },
        },
      })
      .mockResolvedValueOnce({
        data: 'pSymbol,pSymbolName,pTrdSymbol,pOptionType,dStrikePrice;\n11536,TCS,TCS-EQ,, -1\n11915,YESBANK,YESBANK-EQ,, -1',
      });
    const service = new KotakNeoBrokerService();
    service.setSession('https://api.kotaksecurities.com', 'session-token', 'session-sid');

    const results = await service.searchScrip({ exchangeSegment: 'nse_cm', symbol: 'TCS' });

    expect(results).toHaveLength(1);
    expect(results[0].pTrdSymbol).toBe('TCS-EQ');
  });

  it('applies derivative expiry, option-type, and strike filters', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({
        data: { data: { filesPaths: ['https://lapi.kotaksecurities.com/master/nse_fo.csv'] } },
      })
      .mockResolvedValueOnce({
        data: [
          'pSymbol,pSymbolName,pTrdSymbol,pOptionType,pExpiryDate,dStrikePrice;',
          '45001,NIFTY,NIFTY28JUN2645000CE,CE,28JUN2026,4500000',
          '45002,NIFTY,NIFTY28JUN2645000PE,PE,28JUN2026,4500000',
        ].join('\n'),
      });
    const service = new KotakNeoBrokerService();
    service.setSession('https://api.kotaksecurities.com', 'session-token', 'session-sid');

    const results = await service.searchScrip({
      exchangeSegment: 'nse_fo',
      symbol: 'NIFTY',
      expiry: '28JUN2026',
      optionType: 'CE',
      strikePrice: '45000',
    });

    expect(results).toHaveLength(1);
    expect(results[0].pTrdSymbol).toBe('NIFTY28JUN2645000CE');
  });

  it('maps Kotak quote field names to the app quote model', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        result: [{
          ts: 'TCS-EQ',
          ltp: '4250',
          cng: '25',
          nc: '0.59',
          op: '4230',
          h: '4260',
          lo: '4220',
          c: '4225',
          v: '1200',
          bp: '4249',
          bq: '20',
          sp: '4251',
          sq: '30',
          yh: '4600',
          yl: '3400',
          ucl: '4650',
          lcl: '3800',
        }],
      },
    });
    const service = new KotakNeoBrokerService();

    const quote = await service.getQuotes('nse_cm', 'TCS-EQ', false);

    expect(quote).toMatchObject({
      ltp: 4250,
      change: 25,
      changePercent: 0.59,
      open: 4230,
      high: 4260,
      low: 4220,
      close: 4225,
      bidPrice: 4249,
      askPrice: 4251,
      fiftyTwoWeekHigh: 4600,
      upperCircuit: 4650,
    });
  });

  it('encodes the advanced place-order payload and requires Kotak order confirmation', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { nOrdNo: '12345', stat: 'Ok' } });
    const service = new KotakNeoBrokerService();
    service.setSession('https://api.kotaksecurities.com', 'session-token', 'session-sid', undefined, 'dc-id');

    const result = await service.placeOrder({
      symbol: 'TCS',
      tradingSymbol: 'TCS-EQ',
      exchangeSegment: 'nse_cm',
      transactionType: 'BUY',
      orderType: 'MARKET',
      product: 'CNC',
      quantity: 2,
      marketProtection: 4,
      tag: 'test-tag',
      scripToken: '11536',
    });

    expect(result).toEqual({ orderNumber: '12345', status: 'Ok' });
    const [, body, config] = mockedAxios.post.mock.calls[0];
    const form = new URLSearchParams(String(body));
    const jData = JSON.parse(form.get('jData') || '{}');
    expect(jData).toMatchObject({ pt: 'MKT', mp: 4, ig: 'test-tag', tk: '11536', tt: 'B' });
    expect(config?.params).toEqual({ sId: 'dc-id' });

    mockedAxios.post.mockResolvedValueOnce({ data: { stat: 'Ok' } });
    await expect(service.placeOrder({
      symbol: 'TCS',
      tradingSymbol: 'TCS-EQ',
      exchangeSegment: 'nse_cm',
      transactionType: 'BUY',
      orderType: 'MARKET',
      product: 'CNC',
      quantity: 1,
    })).rejects.toThrow('did not confirm order placement');
  });
});
