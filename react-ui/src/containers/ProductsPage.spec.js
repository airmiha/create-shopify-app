import React from 'react';
import ReactDOM from 'react-dom';
import renderer from 'react-test-renderer';

import { ProductsPageComponent as ProductsPage } from './ProductsPage';

const fetchProducts = jest.fn(() => true);

it('renders without crashing', () => {
  const div = document.createElement('div');
  ReactDOM.render(<ProductsPage fetchProducts={fetchProducts} />, div);
});

it('Matches snapshot', () => {
  const tree = renderer
    .create(<ProductsPage fetchProducts={fetchProducts} />)
    .toJSON();
  expect(tree).toMatchSnapshot();
});
