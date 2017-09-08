// @flow
import type { Store as ReduxStore } from 'redux';

export type Image = {
  src: string
};

export type Product = {
  body_html: string,
  image: Image,
  product_type: string,
  title: string,
  vendor: string
};

export type State = {
  router?: any,
  products?: Product[]
};

export type LoadProductsAction = {
  +type: 'LOAD_PRODUCTS',
  +products: Product[]
};

export type AddProductAction = {
  +type: 'ADD_PRODUCT',
  +product: Product
};

export type Action = LoadProductsAction | AddProductAction;

export type Store = ReduxStore<State, Action>;

export type GetState = () => Object;

// eslint-disable-next-line no-use-before-define
export type ThunkAction = (dispatch: Dispatch, getState: GetState) => any;
export type PromiseAction = Promise<Action>;

export type Dispatch = (
  action: Action | ThunkAction | PromiseAction | Array<Action>
) => any;
