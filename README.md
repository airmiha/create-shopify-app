
# Create Shopify App with Node and React

Shopify Application starter with React, Polaris, Express, and Postgres.

## Description

Use this project as a starter for applications using the Shopify API. It gives you all the required code for authenticating with a shop via Oauth. It even includes billing. It also demonstrates the usage of the Embedded App SDK. 

The project has a create-react-app client application backed by an Express server. It fetches a list of products from the shop. You can then add more with the ResourcePicker from the Embedded App SDK.   

### Why use this?

If you're a Javascript developer, use create-shopify-app to kickstart your development. It saves you a lot of time you'd use on setting up the project. You get everything you need to build a modern Shopify app with your favorite tools:

* React, JSX, ES6, and Flow syntax support.
* A Webpack Dev server with live reloading
* State management with Redux
* React Router v4
* Embedded App SDK and Polaris
* Unit testing with Jest
* All the code for authenticating with a shop via oAuth using Express middleware
* Middleware for setting up billing and recurring charges
* Best practices from the community

## Prerequisites

This project uses Postgres for data persistence and Redis for session management. You'll need to install and run both. You'll also need Node and npm.

Download the project from this Github repository and install dependencies:

1. Run **npm install** from the root to install main dependencies
2. Run **cd react-ui && npm install** for client-side dependencies 
3. Expose your application to the Internet using ngrok. See [Shopify's documentation](https://help.shopify.com/api/tutorials/building-public-app) . (replace port 4567 with 3000)

## Getting started

The following list of steps will get you ready for development.

### Step 1: Becoming a Shopify App Developer

If you don't have a Shopify Partner account yet head over to http://shopify.com/partners to create one. You'll need it before you can start developing apps.

Once you have a Partner account create a new application to get an API key and other API credentials.

### Step 2: Configuring your application

When you start ngrok, it'll give you a random subdomain (*.ngrok.io). 

In the project root directory, open `server/config/index.js`. Set `APP_URL` to the subdomain ngrok assigned to you. In production, this value should match your deployment URL (for example, **.herokuapp.com). Also, set your `APP_NAME`.

In the project root directory, create a new file named `.env` and open it in a text editor. Login to your Shopify partner account and find your App credentials. Set your API key and App secret in the `.env` file. 

```sh
SHOPIFY_API_KEY=your API key
SHOPIFY_API_SECRET=app secret
```

In the `react-ui` directory, create a new file named `.env` and open it in a text editor. Set your API key and development store URL. 

```sh
REACT_APP_SHOPIFY_API_KEY=your API key
REACT_APP_SHOP_ORIGIN=your-development-store.myshopify.com
```

You'll only use these values in development. The Embedded app SDK uses them to initialize itself. In production, they are injected by the Express server in the built client app. 

**Your api credentials should not be in source control**. In production, keep your keys in environment variables. 

In your partner dashboard, go to App info. For the App URL, set 

```
https://#{app_url}/home
```

Here `app_url` is the root path of your application (the same value as APP_URL in your config file).

For Whistlisted redirection URL, set 

```
https://#{app_url}/auth/callback
```

Also, remember to check `enabled` for the embedded settings.

You can set these URLs in the config file. But, the values in config should match the ones in the partner dashboard. 

### Step 3: Set-up your database

This project uses Postgres for its persistence layer, with Sequelize ORM. Create local databases for development and testing. Then run the Sequelize migration script to create a shop table:

```sh
createdb shopify-app-development # or test/production
npm run sequelize db:migrate
```

In production, you connect to the database through an environment variable DATABASE_URL. 

### Step 4: Run the app on your local machine

```sh
npm run start:dev
```
This will start `nodemon` on the server side and `create-react-app` on the client. The Node server will restart when you make changes in that part of the code. 

The page will reload if you make edits in the `react-ui` folder. You'll see the build errors and lint warnings in the console.

### Step 5: Install your app on a test store

If you don't have one already, create a development store. Open [Shopify's documentation](https://help.shopify.com/api/tutorials/building-public-app). Scroll down to the **Install your app on a test store** section. Follow those steps. Once you start the installation process, the following will happen:

1. You'll see a screen to confirm the installation, with the scopes you requested.  
2. Once you confirm, you'll have to accept a recurring application charge. It's only a test charge so don't worry. 
3. You'll see the app inside the Shopify admin. You can play with it or start building.  

## Deploying to Heroku

```sh
heroku create your-app-name

# Add Redis
heroku addons:create heroku-redis:hobby-dev -a your-app

# Add Postgres
heroku addons:create heroku-postgresql:hobby-dev -a your-app

# Deploy to Heroku server
git push heroku master

# Set environment variables
heroku config:set APP_URL=your-app.herokuapp.com
heroku config:set SHOPIFY_API_KEY=your API key
heroku config:set SHOPIFY_API_SECRET=app secret
heroku config:set SESSION_SECRET=session secret

# Run the migration
heroku run sequelize db:migrate

# Open Link in browser
heroku open
```

## Testing

We use Jest for both client and server tests. The `create-react-app` project comes with Jest by default. For the server side, we use a custom configuration. Jest has spy and mock capabilities so there's no need for additional libraries.

```sh

# Run client tests in watch mode
npm run test:client

# Run server tests in watch mode
npm run test:server

# Run all tests for Continuous integration
npm run test
```

## License

[MIT](LICENSE)
