import axios from 'axios';
import { generateTOTP } from '../utils/totp.js';

const accessToken = '9dd4802-42af-41c0-889d-19fe0f5';
const mobileNumber = '9177131013';
const ucc = 'W6RR9';
const totpSecret = 'G4ORANIOEZ6NCR3UZQT4GG6I6JA';

async function testKotakLogin() {
  const totp = generateTOTP(totpSecret);
  console.log(`Generated TOTP: ${totp}`);

  const mobileVariants = [
    `+91${mobileNumber}`,
    mobileNumber,
    `91${mobileNumber}`,
  ];

  for (const mob of mobileVariants) {
    console.log(`\n--- Testing mobile format: "${mob}" ---`);
    try {
      const res = await axios.post(
        'https://mis.kotaksecurities.com/login/1.0/tradeApiLogin',
        {
          mobileNumber: mob,
          ucc,
          totp,
        },
        {
          headers: {
            'Authorization': accessToken,
            'neo-fin-key': 'neotradeapi',
            'Content-Type': 'application/json',
          },
        }
      );
      console.log('SUCCESS Response:', JSON.stringify(res.data, null, 2));
    } catch (err: any) {
      console.log('ERROR Status:', err.response?.status);
      console.log('ERROR Data:', JSON.stringify(err.response?.data, null, 2));
    }
  }
}

testKotakLogin();
