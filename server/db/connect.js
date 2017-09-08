import logger from 'winston';
import { sequelize } from './models';

export default () => {
  sequelize
    .authenticate()
    .then(() => {
      logger.info('Connection has been established successfully.');
    })
    .catch((err) => {
      logger.error('Unable to connect to the database:', err);
    });
};
