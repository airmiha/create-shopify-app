import Sequelize from 'sequelize';

import { ENV } from '../../config';
import sequelizeConfig from '../sequelize_config.json';
import shopModel from './shop';

const config = sequelizeConfig[ENV];

const db = {};

const dbUrl = process.env[config.use_env_variable];

const { database, username, password } = config;

const sequelize = dbUrl
  ? new Sequelize(dbUrl)
  : new Sequelize(database, username, password, config);

db.Shop = sequelize.import('Shop', shopModel);

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

export { db as Models, sequelize };
