import session from 'express-session';
import connectRedis from 'connect-redis';

import { isTest, REDIS_URL } from '../config';

const RedisStore = connectRedis(session);

const store = new RedisStore({
  url: REDIS_URL,
  // We use the 2nd database in Redis (1) in test to be able to clean it.
  db: isTest ? 1 : 0,
});

store.on('connect', () => {
  console.log(`===> 😊  Connected to Redis Server on ${REDIS_URL}. . .`);
});

export default store;
