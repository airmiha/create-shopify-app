import request from 'supertest';

import app from '../app';

import { APP_HOME_ROUTE, AUTH_CALLBACK_ROUTE } from '../config';
import { shopifyToken } from './setupMocks';

export const getSessionCookie = response =>
  response.headers['set-cookie'].pop().split(';')[0];

let cookies;

/**
 * Authenticates a shop with the application.
 *
 * @param {string} shop The shop
 *
 * @return Promise that resolves with the cookie that has the active session's ID
 */
export const login = shop =>
  new Promise(resolve => {
    const loginPath = `${APP_HOME_ROUTE}?shop=${shop}`;

    request(app).get(loginPath).end((err, res) => {
      // Save the cookie to use it later to retrieve the session
      const Cookies = getSessionCookie(res);

      const state = shopifyToken.generateNonce();

      const authCallback = `${AUTH_CALLBACK_ROUTE}?state=${state}&code=code&shop=${shop}`;

      const req = request(app).get(authCallback);
      req.cookies = Cookies;

      req.end(() => {
        cookies = Cookies;
        resolve(Cookies);
      });
    });
  });

/**
 * Creates an authenticated request.
 *
 * @param {string} route A protected route
 */
export const getRequest = route => {
  const req = request(app).get(route);
  req.cookies = cookies;
  return req;
};
