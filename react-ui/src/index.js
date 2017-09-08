// @flow
import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { ConnectedRouter } from 'react-router-redux';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useLinkComponent } from '@shopify/polaris';
// $FlowFixMe
import '@shopify/polaris/styles.css';
import { EmbeddedApp } from '@shopify/polaris/embedded';

import store, { history } from './store';

import './index.css';
import App from './App';
// import registerServiceWorker from './registerServiceWorker';

axios.defaults.withCredentials = true;

useLinkComponent(Link);

// These values are used in development. They are defined in the .env file
const { REACT_APP_SHOPIFY_API_KEY, REACT_APP_SHOP_ORIGIN } = process.env;

type environment = {
  SHOPIFY_API_KEY?: string,
  SHOP_ORIGIN?: string
};

const env: environment = window.env || {};

// Express injects these values in the client script when serving index.html
const { SHOPIFY_API_KEY, SHOP_ORIGIN } = env;

const apiKey: ?string = REACT_APP_SHOPIFY_API_KEY || SHOPIFY_API_KEY;
const shop: ?string = REACT_APP_SHOP_ORIGIN || SHOP_ORIGIN;

const shopOrigin: ?string = shop && `https://${shop}`;

const target = document.getElementById('root');

render(
  <EmbeddedApp apiKey={apiKey} shopOrigin={shopOrigin} forceRedirect>
    <Provider store={store}>
      <ConnectedRouter history={history}>
        <App />
      </ConnectedRouter>
    </Provider>
  </EmbeddedApp>,
  target
);

// registerServiceWorker();
