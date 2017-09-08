import React from 'react';
import ReactDOM from 'react-dom';
import renderer from 'react-test-renderer';

import About from './About';

it('renders without crashing', () => {
  const div = document.createElement('div');
  ReactDOM.render(<About />, div);
});

it('Matches snapshot', () => {
  const tree = renderer.create(<About />).toJSON();
  expect(tree).toMatchSnapshot();
});
