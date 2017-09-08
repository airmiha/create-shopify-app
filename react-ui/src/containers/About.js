// @flow
import React from 'react';
import type { RouterHistory } from 'react-router-redux';
import { Banner, Page } from '@shopify/polaris';

const About = ({ history }: { history: RouterHistory }) =>
  <Page
    title="About"
    secondaryActions={[
      { content: 'Back to products', onAction: () => history.goBack() }
    ]}
  >
    <Banner
      title="Your React Shopify app is ready. You can start building solutions for merchants!"
      status="success"
    />
  </Page>;

export default About;
