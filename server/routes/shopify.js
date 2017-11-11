/**
 * Routes for express app
 */
import _ from 'lodash';
import crypto from 'crypto';
import express from 'express';
import ShopifyToken from 'shopify-token';
import ShopifyApi from 'shopify-api-node';
import logger from 'winston';

import {
  ACTIVATE_CHARGE_ROUTE,
  APP_HOME_ROUTE,
  APP_NAME,
  APP_URL,
  AUTH_CALLBACK_ROUTE,
  INSTALL_PAGE,
  SCOPES,
  UNINSTALL_ROUTE
} from '../config';

import { Models } from '../db';

const { Shop } = Models;

const router = express.Router();

export default () => {
  const { SHOPIFY_API_KEY, SHOPIFY_API_SECRET } = process.env;

  const getShopifyToken = () =>
    new ShopifyToken({
      sharedSecret: SHOPIFY_API_SECRET,
      redirectUri: `${APP_URL}${AUTH_CALLBACK_ROUTE}`,
      scopes: SCOPES,
      apiKey: SHOPIFY_API_KEY
    });

  const getAppsHome = shop => `https://${shop}/admin/apps/`;

  // The home page of the app in Shopify Admin
  const getEmbeddedAppHome = shop => `${getAppsHome(shop)}${APP_NAME}`;

  /**
   * Authenticates the shop with Shopify when accessing protected routes.
   * Returns a template file that redirects to the Shopify authorization page.
   * This mechanism is used to authorize an embedded app.
   * We need custom Javascript to escape the iframe as described in the docs.
   * See the "shopify_redirect" template for details.
   */
  const authenticate = (req, res) => {
    const { query, session } = req;

    const shop = query.shop || req.body.shop;

    logger.info('Authenticating shop %s', shop);

    if (!shop) {
      res.redirect(INSTALL_PAGE);
      return;
    }

    const shopifyToken = getShopifyToken();
    const nonce = shopifyToken.generateNonce();

    // Save the nonce to state to verify it in the callback route later on
    session.state = nonce;

    const shopName = shop.split('.')[0];

    const url = decodeURI(
      shopifyToken.generateAuthUrl(shopName, undefined, nonce)
    );

    res.render('shopify_redirect', { url, shop });
  };

  /**
   * Creates an interface for accessing the Shopify API.
   * @param session A Shopify session with shop domain and access token
   */
  const getShopifyApi = session => {
    const { shopify: { shop: shopUrl, token } } = session;

    return new ShopifyApi({
      shopName: shopUrl.split('.')[0],
      accessToken: token
    });
  };

  /**
   * This method gets called when the app is installed.
   * Setup any webhooks or services you need on Shopify inside here.
   *
   * @param session New session
   */
  const afterShopifyAuth = session => {
    const shopify = getShopifyApi(session);

    const webhook = {
      topic: 'app/uninstalled',
      address: `${APP_URL}${UNINSTALL_ROUTE}`,
      format: 'json'
    };

    shopify.webhook.create(webhook);
  };

  /**
   * Creates a new recurring application charge and redirects the mercant to
   * the confirmation screen.
   */
  const createRecurringApplicationCharge = (req, res, next) => {
    const { shopify, session: { shopify: { shop } } } = req;

    const newCharge = {
      name: APP_NAME,
      price: 9.99,
      return_url: `${APP_URL}${ACTIVATE_CHARGE_ROUTE}`,
      test: true,
      trial_days: 7
    };

    shopify.recurringApplicationCharge
      .create(newCharge)
      .then(charge => {
        res.render('shopify_redirect', {
          url: charge.confirmation_url,
          shop
        });
      })
      .catch(next);
  };

  const hasActiveRecurringApplicationCharge = shopify =>
    shopify.recurringApplicationCharge
      .list()
      .then(charges => _.find(charges, { status: 'active' }));

  /**
   * Shopify calls this route after the merchant authorizes the app.
   * It needs to match the callback route that you set in app settings.
   */
  router.get(AUTH_CALLBACK_ROUTE, (req, res, next) => {
    const { query, session } = req;

    const { code, shop, state } = query;

    const shopifyToken = getShopifyToken();

    if (
      typeof state !== 'string' ||
      state !== session.state || // Validate the state.
      !shopifyToken.verifyHmac(query) // Validate the hmac.
    ) {
      return res.status(400).send('Security checks failed');
    }

    // Exchange the authorization code for a permanent access token.
    return shopifyToken
      .getAccessToken(shop, code)
      .then(token => {
        session.shopify = { shop, token };

        return Shop.findOrCreate({
          where: {
            domain: shop
          }
        }).spread(() => {
          afterShopifyAuth(session);

          req.shopify = getShopifyApi(session);

          hasActiveRecurringApplicationCharge(req.shopify).then(isActive => {
            if (isActive) {
              return res.redirect(getEmbeddedAppHome(shop));
            }
            return createRecurringApplicationCharge(req, res, next);
          });
        });
      })
      .catch(next);
  });

  const verifyWebhookHMAC = req => {
    const hmac = req.headers['x-shopify-hmac-sha256'];

    const digest = crypto
      .createHmac('SHA256', SHOPIFY_API_SECRET)
      .update(req.rawBody)
      .digest('base64');

    return digest === hmac;
  };

  /**
   * This endpoint recieves the uninstall webhook and cleans up data.
   * Add to this endpoint as your app stores more data. If you need to do a lot of work, return 200
   * right away and queue it as a worker job.
   */
  router.post(UNINSTALL_ROUTE, (req, res) => {
    if (!verifyWebhookHMAC(req)) {
      res.status(401).send('Webhook HMAC Failed');
      return;
    }

    Shop.destroy({
      where: {
        domain: req.headers['x-shopify-shop-domain']
      }
    }).then(() => {
      res.status(200).send('Uninstalled');
    });
  });

  /**
   * This middleware checks if we have a session.
   * If so, it attaches the Shopify API to the request object.
   * If there is no session or we have a different shop,
   * we start the authentication process.
   */
  const authMiddleware = (req, res, next) => {
    logger.info(`Checking for valid session: ${req.query.shop}`);
    const { session, query: { shop } } = req;

    if (!session.shopify || (shop && session.shopify.shop !== shop)) {
      delete session.shopify;
      authenticate(req, res);
      return;
    }

    req.shopify = getShopifyApi(session);
    next();
  };

  router.use(authMiddleware);

  /*
   * Shopify calls this route when the merchant accepts or declines the charge.
   */
  router.get('/activate_charge', (req, res, next) => {
    const {
      shopify: { recurringApplicationCharge },
      query: { charge_id: chargeId },
      session: { shopify: { shop } }
    } = req;

    recurringApplicationCharge
      .get(chargeId)
      .then(charge => {
        if (charge.status === 'accepted') {
          return recurringApplicationCharge.activate(chargeId).then(() =>
            // We redirect to the home page of the app in Shopify admin
            res.redirect(getEmbeddedAppHome(shop))
          );
        }
        res.status(401);
        return res.render('charge_declined', { APP_URL });
      })
      .catch(next);
  });

  router.get('/logout', (req, res) => {
    const { shop } = req.session.shopify;

    delete req.session.shopify;

    res.redirect(getAppsHome(shop));
  });

  router.get('/api/orders', (req, res) => {
    const { shopify } = req;

    shopify.order.list({ limit: 5 }).then(orders => {
      res.status(200).json(orders);
    });
  });

  /**
   * Checks if we have an active application charge.
   * This middleware is active when the app is initially loaded.
   */
  const checkActiveRecurringApplicationCharge = (req, res, next) => {
    logger.info(`Checking for active application charge: ${req.query.shop}`);
    const { shopify } = req;

    hasActiveRecurringApplicationCharge(shopify).then(isActive => {
      if (!isActive) {
        logger.info(`No active charge found: ${req.query.shop}`);
        createRecurringApplicationCharge(req, res);
        return;
      }
      next();
    });
  };

  /*
   * Checks if the session is still valid by making a basic API call, as described in:
   * https://stackoverflow.com/questions/14418415/shopify-how-can-i-handle-an-uninstall-followed-by-an-instant-re-install
   */
  const checkForValidSession = (req, res, next) => {
    logger.info(`Checking if the session is still valid: ${req.query.shop}`);
    const { session, shopify } = req;

    return shopify.shop
      .get()
      .then(() => next())
      .catch(() => {
        // Destroy the Shopify reference
        delete session.shopify;
        authenticate(req, res);
      });
  };

  router.get(
    APP_HOME_ROUTE,
    checkForValidSession,
    checkActiveRecurringApplicationCharge,
    (req, res) => {
      res.redirect('/');
    }
  );

  return router;
};
