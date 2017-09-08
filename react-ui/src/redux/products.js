// @flow
import axios from 'axios';

import type { Action, AddProductAction, Product, ThunkAction } from '../types';

export const fetchProducts = (): ThunkAction => dispatch =>
  axios
    .get('/api/products', {
      credentials: 'include'
    })
    .then(response => {
      console.log(response);
      dispatch({
        type: 'LOAD_PRODUCTS',
        products: response.data
      });
    });

export const addProduct = (product: Product): AddProductAction => ({
  type: 'ADD_PRODUCT',
  product
});

export default (state: Product[] = [], action: Action): Product[] => {
  switch (action.type) {
    case 'LOAD_PRODUCTS':
      return action.products;

    case 'ADD_PRODUCT':
      return [...state, action.product];

    default:
      return state;
  }
};
