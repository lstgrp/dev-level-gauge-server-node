'use strict';

const express = require('express');
const osprey = require('osprey');
const Promise = require('bluebird');
const path = require('path');
const redis = require('redis');
const handlers = require('./app/handlers/handlers');
const config = require('./app/config/config');

Promise.promisifyAll(redis.RedisClient.prototype);

/** Class Server holds client instances and registers routers */
class Server {
  constructor() {
    this.app = null;
    this.listener = null;
    this.di = null;
  }

  /**
   * Create db client instances and register router using RAML file.
   * osprey does all of data validation and blocking unregistered routes
   * @returns {Promise.<undefined>}
   */
  initWithRAML() {
    return osprey.loadFile(path.join(__dirname, '../apidoc.raml'), {})
      .then((mw) => {
        const app = this.app = express();

        const di = this.di = {
          redis: redis.createClient()
        };

        //
        // middleware for authentication with header api token
        //
        app.use((req, res, next) => {
          if (req.path === '/device' || req.path === '/health') return next();
          const token = req.get('x-api-token');
          if (token) {
            if (token === 'master-token') return next();
            di.redis.get(token, (err, reply) => {
              if (!err && reply) return next();
              res.status(403).send({status: 'Token is expired'});
            });
          } else {
            res.status(403).send({status: 'No token in header'});
          }
        });

        app.use(mw);

        app.post('/device', handlers.deviceHandler(di));
        app.post('/store', handlers.storeHandler(di));
        app.post('/retrieve', handlers.retrieveHandler(di));
        app.post('/close', handlers.closeHandler(di));
        app.get('/health', handlers.healthHandler(di));

      }).catch(e => {
      console.log('Error in instantiating server: ', e);
    });
  }

  /**
   * Starts the server to listen on configured port.
   * On exit the teardown is called.
   */
  start() {
    this.listener = this.app.listen(config.port, '0.0.0.0', () => {
      console.log(`Level gauge node server is running on port ${config.port}`);
    });

    process.on('exit', () => {
      this.tearDown();
    });
  }

  /**
   * Teardown code for the server
   */
  tearDown() {
    if (this.di.redis) {
      this.di.redis.quit();
      this.di.redis = null;
    }

    if (this.listener) {
      this.listener.close();
      this.listener = null;
    }
  }

  /**
   * Creates an instance of Server class
   * @returns {Server}
   */
  static create() {
    return new Server();
  }
}

module.exports = Server;
