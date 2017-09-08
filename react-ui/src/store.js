// @flow
import { createStore, applyMiddleware, compose } from 'redux';
import { routerMiddleware } from 'react-router-redux';
import thunk from 'redux-thunk';
/* eslint-disable import/no-extraneous-dependencies */
// $FlowFixMe
import createHistory from 'history/createBrowserHistory';
import rootReducer from './redux';

import type { Store } from './types';

export const history = createHistory();

const initialState = {};
const enhancers = [];
const middleware = [thunk, routerMiddleware(history)];

if (process.env.NODE_ENV === 'development') {
  const devToolsExtension = window.devToolsExtension;

  if (typeof devToolsExtension === 'function') {
    enhancers.push(devToolsExtension());
  }
}

const composedEnhancers = compose(applyMiddleware(...middleware), ...enhancers);

const store: Store = createStore(rootReducer, initialState, composedEnhancers);

export default store;
