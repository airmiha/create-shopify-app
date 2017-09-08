import ShopifyTokenModule from 'shopify-token';
import ShopifyApiModule from 'shopify-api-node';

import redis from 'redis';
import Promise from 'bluebird';
import { REDIS_URL } from '../config';
import { sequelize } from '../db/models';

Promise.promisifyAll(redis.RedisClient.prototype);

const client = redis.createClient({
  url: REDIS_URL,
  db: 1
});

jest.mock('shopify-token');
jest.mock('shopify-api-node');

// We use these mock values throughout our tests
export const accessToken = 'token';
export const shopName = 'mihovil';
export const shop = `${shopName}.myshopify.com`;
export const nonce = 'randomToken';

export const shopifyToken = {
  generateAuthUrl: () => `https://${shop}/admin/oauth/authorize`,
  generateNonce: () => nonce
};

// The mocked ShopifyToken module returns a constructor function.
// We return a dummy token object from it.
export const ShopifyToken = jest.fn(() => shopifyToken);

export const shopifyApi = {
  order: {},
  shop: {
    get: () => Promise.resolve()
  },
  recurringApplicationCharge: {},
  webhook: {
    create: () => Promise.resolve()
  }
};

export const ShopifyApi = jest.fn(() => shopifyApi);

export default () => {
  ShopifyTokenModule.mockImplementation(ShopifyToken);
  ShopifyApiModule.mockImplementation(ShopifyApi);

  // Clean old sessions from the test Redis database before each test suite.
  return client.flushdbAsync();
};

export const seedDatabase = () => sequelize.sync({ force: true });
