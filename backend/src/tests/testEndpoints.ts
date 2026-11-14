import axios from 'axios';
import { generateTOTP } from '../utils/totp.js';

const accessToken = '9dd4802-42af-41c0-889d-19fe0f5';
const mobileNumber = '+919177131013';
const ucc = 'W6RR9';
const totpSecret = 'G4ORANIOEZ6NCR3UZQT4GG6I6JA';

async function testEndpoints() {
  const totp = generateTOTP(totpSecret);
  const baseUrls = [
    'https://mis.kotaksecurities.com',
    'https://napi.kotaksecurities.com',
    'https://gw-napi.kotaksecurities.com',
    'https://tradeapi.kotaksecurities.com',
  ];

  for (const base of baseUrls) {
    console.log(`\n=== Testing Base URL: ${base} ===`);
    try {
      const res = await axios.post(
        `${base}/login/1.0/tradeApiLogin`,
        { mobileNumber, ucc, totp },
        {
          headers: {
            'Authorization': accessToken,
            'neo-fin-key': 'neotradeapi',
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        }
      );
      console.log('SUCCESS:', res.data);
    } catch (err: any) {
      console.log('Status:', err.response?.status);
      console.log('Data:', err.response?.data || err.message);
    }
  }
}

testEndpoints();
