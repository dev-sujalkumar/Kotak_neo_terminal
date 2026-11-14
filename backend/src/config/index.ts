import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';

const envPath = [resolve(process.cwd(), '.env'), resolve(process.cwd(), '..', '.env')]
  .find(existsSync);
dotenv.config(envPath ? { path: envPath } : undefined);

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'super_secret_jwt_key_2026',
  encryptionKey: process.env.ENCRYPTION_KEY || '32_byte_hex_encryption_key_for_kotak_credentials',
  brokerMode: (process.env.BROKER_MODE || 'PAPER').toUpperCase() as 'MOCK' | 'PAPER' | 'LIVE',
  kotak: {
    accessToken: process.env.KOTAK_ACCESS_TOKEN || '',
    ucc: process.env.KOTAK_UCC || '',
    mobileNumber: process.env.KOTAK_MOBILE_NUMBER || '',
    mpin: process.env.KOTAK_MPIN || '',
    totpSecret: process.env.KOTAK_TOTP_SECRET || '',
    baseLoginUrl: process.env.KOTAK_API_BASE_LOGIN || 'https://mis.kotaksecurities.com',
  },
  nlpServiceUrl: process.env.NLP_SERVICE_URL || 'http://localhost:8000',
  newsApiKey: process.env.NEWS_API_KEY || '',
};
