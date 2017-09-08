// @flow
import React from 'react';
import { Route } from 'react-router-dom';

import About from './containers/About';
import ProductsPage from './containers/ProductsPage';

const App = () =>
  <div>
    <Route exact path="/" component={ProductsPage} />
    <Route exact path="/about" component={About} />
  </div>;

export default App;
