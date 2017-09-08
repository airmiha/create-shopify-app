// @flow
import _ from 'lodash';
import React, { Component } from 'react';
import type { Element } from 'react';
import type { RouterHistory } from 'react-router-redux';
import { connect } from 'react-redux';

import { Page, Card, ResourceList, Thumbnail } from '@shopify/polaris';
import { ResourcePicker } from '@shopify/polaris/embedded';

import { addProduct, fetchProducts } from '../redux/products';
import type { AddProductAction, Product, State, ThunkAction } from '../types';

type ProductResource = {
  media?: Element<*>,
  attributeOne: string,
  attributeTwo: string,
  attributeThree: string
};

type OwnProps = {
  history: RouterHistory
};

type StateProps = {
  products: ProductResource[]
};

type DispatchProps = {
  addProduct: (product: Product) => AddProductAction,
  fetchProducts: () => ThunkAction
};

type Props = StateProps & DispatchProps & OwnProps;

type OwnState = {
  resourcePickerOpen: boolean
};

type Resources = {
  products: Product[]
};

export class ProductsPageComponent extends Component<Props, OwnState> {
  state = {
    resourcePickerOpen: false
  };

  componentDidMount() {
    const { fetchProducts } = this.props;

    fetchProducts();
  }

  handleGoToProducts = () => {
    const { history } = this.props;

    history.push('/about');
  };

  handleResourceSelected = (resources: Resources) => {
    const { addProduct } = this.props;
    const { products } = resources;

    addProduct(products[0]);

    this.setState({ resourcePickerOpen: false });
  };

  render() {
    const { products = [] } = this.props;
    const { resourcePickerOpen } = this.state;

    return (
      <Page
        title="Products"
        primaryAction={{
          content: 'Add product',
          onAction: () => this.setState({ resourcePickerOpen: true })
        }}
        secondaryActions={[
          {
            content: 'Go to About',
            onAction: this.handleGoToProducts
          }
        ]}
      >
        <Card>
          <ResourceList
            items={products}
            renderItem={(item: ProductResource, index: number) =>
              <ResourceList.Item key={index} {...item} />}
          />
        </Card>
        <ResourcePicker
          products
          open={resourcePickerOpen}
          onSelection={this.handleResourceSelected}
          onCancel={() => this.setState({ resourcePickerOpen: false })}
        />
      </Page>
    );
  }
}

const getProductResources = (products: ?(Product[])) =>
  _.map(products, (product: Product): ProductResource => {
    const { image = {}, product_type, title, vendor } = product;

    return {
      media: image && <Thumbnail source={image.src} alt={title} />,
      attributeOne: title,
      attributeTwo: product_type,
      attributeThree: vendor
    };
  });

const mapStateToProps = (state: State): StateProps => {
  const { products } = state;

  return {
    products: getProductResources(products)
  };
};

const dispatchProps: DispatchProps = { addProduct, fetchProducts };

export default connect(mapStateToProps, dispatchProps)(ProductsPageComponent);
