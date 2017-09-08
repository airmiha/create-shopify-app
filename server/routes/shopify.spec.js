import request from 'supertest';
import cheerio from 'cheerio';
import crypto from 'crypto';

import setupMocks, {
  accessToken,
  nonce,
  seedDatabase,
  shop,
  shopName,
  shopifyApi,
  ShopifyApi,
  shopifyToken,
  ShopifyToken
} from './setupMocks';

import { getRequest, login } from './session-helper';

import app from '../app';
import { Models } from '../db';

import {
  ACTIVATE_CHARGE_ROUTE,
  APP_HOME_ROUTE,
  APP_NAME,
  APP_URL,
  AUTH_CALLBACK_ROUTE,
  SCOPES,
  INSTALL_PAGE,
  UNINSTALL_ROUTE
} from '../config';

const { Shop } = Models;

const { SHOPIFY_API_KEY, SHOPIFY_API_SECRET } = process.env;

const appsList = `https://${shop}/admin/apps/`;
const appHome = `${appsList}${APP_NAME}`;

const shopifyTokenOptions = {
  sharedSecret: SHOPIFY_API_SECRET,
  redirectUri: `${APP_URL}${AUTH_CALLBACK_ROUTE}`,
  scopes: SCOPES,
  apiKey: SHOPIFY_API_KEY
};

const { recurringApplicationCharge } = shopifyApi;

const confirmationUrl = 'Confirmation URL';

const newCharge = {
  name: APP_NAME,
  price: 9.99,
  return_url: `${APP_URL}${ACTIVATE_CHARGE_ROUTE}`,
  test: true,
  trial_days: 7
};

const expectShopifyAuthorizationRedirect = res => {
  const expectedUrl = shopifyToken.generateAuthUrl();

  const $ = cheerio.load(res.text);
  const script = $('script').html();

  expect(script).toMatch(`window.top.location.href = "${expectedUrl}";`);
  expect(script).toMatch("message: 'Shopify.API.remoteRedirect',");
  expect(script).toMatch(`data: { location: '${expectedUrl}' }`);
  expect(script).toMatch(
    `window.parent.postMessage(message, 'https://${shop}');`
  );
};

const expectChargeConfirmationRedirect = res => {
  expect(recurringApplicationCharge.create).toHaveBeenCalledWith(newCharge);

  const $ = cheerio.load(res.text);
  const script = $('script').html();

  expect(script).toMatch(`window.top.location.href = "${confirmationUrl}";`);
  expect(script).toMatch("message: 'Shopify.API.remoteRedirect',");
  expect(script).toMatch(`data: { location: '${confirmationUrl}' }`);
  expect(script).toMatch(
    `window.parent.postMessage(message, 'https://${shop}');`
  );
};

describe('Authentication middleware', () => {
  beforeAll(() => setupMocks().then(() => seedDatabase()));

  beforeEach(() => {
    shopifyToken.verifyHmac = jest.fn(() => true);
    shopifyToken.getAccessToken = jest.fn(() => Promise.resolve(accessToken));

    recurringApplicationCharge.list = () => Promise.resolve([]);
    recurringApplicationCharge.create = jest.fn(() =>
      Promise.resolve({ confirmation_url: confirmationUrl })
    );
  });

  it('should redirect to install page when there is no Shopify session and no shop in URL', () =>
    request(app).get(APP_HOME_ROUTE).expect('Location', INSTALL_PAGE));

  it('should instantiate Shopify token with proper options', () =>
    request(app).get(`${APP_HOME_ROUTE}?shop=${shop}`).then(() => {
      expect(ShopifyToken).toHaveBeenCalledWith(shopifyTokenOptions);
    }));

  it('should redirect to authorization URL on Shopify when there is no Shopify session and a shop is present in the query', () =>
    request(app)
      .get(`${APP_HOME_ROUTE}?shop=${shop}`)
      .expect(200)
      .then(expectShopifyAuthorizationRedirect));

  it("should redirect to authorization URL on Shopify when there is a shop in the query and it's different than the one in session", () =>
    login('someothershop.myshopify.com', nonce).then(Cookies => {
      const req = request(app).get(`${APP_HOME_ROUTE}?shop=${shop}`);
      req.cookies = Cookies;
      req.expect(200).then(expectShopifyAuthorizationRedirect);
    }));

  describe('Auth callback', () => {
    const originalPath = `${APP_HOME_ROUTE}?shop=${shop}`;
    const code = 'code';
    const authCallback = `${AUTH_CALLBACK_ROUTE}?state=${nonce}&code=${code}&shop=${shop}`;

    let Cookies;

    const callAuthCallback = () => {
      const req = request(app).get(authCallback);
      req.cookies = Cookies;
      return req;
    };

    beforeEach(() =>
      request(app).get(originalPath).then(res => {
        // Save the cookie to use it later to retrieve the session
        Cookies = res.headers['set-cookie'].pop().split(';')[0];
        return seedDatabase();
      })
    );

    it("should return 400 if state sent in the query doesn't match the one saved in session", () => {
      const req = request(app).get(`${AUTH_CALLBACK_ROUTE}?state=wrongState`);
      req.cookies = Cookies;
      return req.expect(400);
    });

    it('should verify HMAC and return 400 if verification fails', () => {
      shopifyToken.verifyHmac = jest.fn(() => false);
      return callAuthCallback().expect(400).then(() => {
        expect(shopifyToken.verifyHmac).toHaveBeenCalledWith({
          state: nonce,
          code,
          shop
        });
      });
    });

    it('should fetch access token for shop with given code when verification succeeds', () =>
      callAuthCallback().then(() => {
        expect(shopifyToken.getAccessToken).toHaveBeenCalledWith(shop, code);
      }));

    it('should save shop to database after installation', () =>
      callAuthCallback().then(() =>
        Shop.findOne({ where: { domain: shop } }).then(shopObject => {
          expect(shopObject).not.toBeNull();
        })
      ));

    it('should attach the Shopify API object to authenticated request and be able to make API calls', () =>
      callAuthCallback().then(() => {
        expect(ShopifyApi).toHaveBeenCalledWith({
          shopName,
          accessToken
        });

        const orders = [{ name: 'order1', id: 1 }];
        shopifyApi.order.list = jest.fn(() => Promise.resolve(orders));

        const newReq = request(app).get('/api/orders');
        newReq.cookies = Cookies;

        return newReq.expect(200).then(res => {
          expect(res.body).toEqual(orders);
        });
      }));

    it('should create an uninstall webhook after authentication and delete the shop on uninstall', () => {
      const webhook = {
        topic: 'app/uninstalled',
        address: `${APP_URL}${UNINSTALL_ROUTE}`,
        format: 'json'
      };

      shopifyApi.webhook.create = jest.fn(() => Promise.resolve());

      return callAuthCallback().then(() => {
        expect(shopifyApi.webhook.create).toHaveBeenCalledWith(webhook);

        const hmac = crypto
          .createHmac('SHA256', SHOPIFY_API_SECRET)
          .update(JSON.stringify({ shop }))
          .digest('base64');

        return request(app)
          .post(UNINSTALL_ROUTE)
          .set('x-shopify-hmac-sha256', hmac)
          .send({
            shop
          })
          .expect(200)
          .then(
            () =>
              expect(Shop.findOne({ where: { domain: shop } })).resolves
                .toBeNull
          );
      });
    });

    it('should return 401 for uninstall webhook when HMAC validation fails', () =>
      callAuthCallback().then(() =>
        request(app).post(UNINSTALL_ROUTE).send({}).expect(401)
      ));

    it('should return 500 if fetching the access token fails', () => {
      shopifyToken.getAccessToken = jest.fn(() => Promise.reject({}));

      return callAuthCallback().expect(500);
    });

    it('should create a new reccuring charge when none is active and redirect to confirmation URL', () =>
      callAuthCallback().then(expectChargeConfirmationRedirect));

    it('should redirect to app home when there is an active recurring application charge', () => {
      recurringApplicationCharge.list = () =>
        Promise.resolve([{ status: 'active' }]);

      return login(shop).then(() =>
        callAuthCallback().expect('Location', appHome)
      );
    });

    it('should return 500 when creating a recurring charge fails', () => {
      recurringApplicationCharge.create = jest.fn(() => Promise.reject({}));

      return callAuthCallback().expect(500);
    });

    it('should clear the session after logout and redirect to apps home page', () =>
      callAuthCallback().then(() => {
        let req = request(app).get('/logout');
        req.cookies = Cookies;
        return req.expect('Location', appsList).then(() => {
          req = request(app).get('/api/orders');
          req.cookies = Cookies;
          return req.expect('Location', INSTALL_PAGE);
        });
      }));
  });

  describe('Billing', () => {
    beforeEach(() => seedDatabase().then(() => login(shop)));

    it("should check if there's an active reccuring charge when home page is accessed and let the request through if so", () => {
      recurringApplicationCharge.list = () =>
        Promise.resolve([{ status: 'active' }]);

      return getRequest(APP_HOME_ROUTE).expect('Location', '/');
    });

    it('should create a new recurring charge when the app is accessed and there is no active charge', () =>
      getRequest(APP_HOME_ROUTE).then(expectChargeConfirmationRedirect));

    it('should activate the charge if it has been accepted and route to app home', () => {
      const chargeId = 'id_001';
      recurringApplicationCharge.get = jest.fn(() =>
        Promise.resolve({ status: 'accepted' })
      );
      recurringApplicationCharge.activate = jest.fn(() => Promise.resolve());

      return getRequest(`${ACTIVATE_CHARGE_ROUTE}?charge_id=${chargeId}`)
        .expect('Location', appHome)
        .then(() => {
          expect(recurringApplicationCharge.get).toHaveBeenCalledWith(chargeId);
          expect(recurringApplicationCharge.activate).toHaveBeenCalled();
        });
    });

    it('should return 500 if getting the charge fails', () => {
      recurringApplicationCharge.get = jest.fn(() => Promise.reject({}));

      return getRequest(ACTIVATE_CHARGE_ROUTE).expect(500);
    });

    it('should return 500 if activating the charge fails', () => {
      recurringApplicationCharge.get = jest.fn(() =>
        Promise.resolve({ status: 'accepted' })
      );
      recurringApplicationCharge.activate = jest.fn(() => Promise.reject({}));

      return getRequest(ACTIVATE_CHARGE_ROUTE).expect(500);
    });

    it('should return 401 if the merchant declines the charge', () => {
      recurringApplicationCharge.get = jest.fn(() =>
        Promise.resolve({ status: 'declined' })
      );

      return getRequest(ACTIVATE_CHARGE_ROUTE).expect(401);
    });
  });

  it('should check if the session is still when home page is accessed and redirect to authorization if not', () => {
    shopifyApi.shop.get = () => Promise.reject({});

    return login(shop).then(() =>
      getRequest(`${APP_HOME_ROUTE}?shop=${shop}`).then(
        expectShopifyAuthorizationRedirect
      )
    );
  });
});
