'use strict';

const Promise = require('bluebird');
const config = require('./config');
const util = require('./util');

/**
 * Handler for /device
 * It takes device name and serial and generates a device id and session token
 * @param {DI} di
 * @returns {function(req, res)}
 */
const deviceHandler = (di) => {
  return (req, res) => {
    return Promise.coroutine(function *() {
      const serial = req.body.device.serial;
      const deviceId = yield util.generateDeviceId(serial);
      const token = util.generateJWTToken(deviceId);

      yield di.redis.setAsync(token, deviceId);

      res.send({
        deviceid: deviceId,
        token: token,
        ttl: config.tokenLifetime,
      });
    })().catch(e => {
      console.log('Error in /device handler: ', e);
      res.status(500).send('Internal error');
    });
  };
};

/**
 * Handler for /store
 * It takes level gauge data and stores it in redis.
 * @param {DI} di
 * @returns {function(req, res)}
 */
const storeHandler = (di) => {
  return (req, res) => {
    return Promise.coroutine(function *() {
      const data = req.body;
      yield di.redis.rpushAsync(data.deviceid, JSON.stringify({
        time: req.body.time,
        event: req.body.event,
        level: req.body.level,
      }));

      res.send({
        result: 'ok',
      });
    })().catch(e => {
      console.log('Error in /store handler: ', e);
      res.status(500).send('Internal error');
    });
  };
};

/**
 * Handler for /retrieve
 * It retrieves level gauge data for a given device id
 * @param {DI} di
 * @returns {function(req, res)}
 */
const retrieveHandler = (di) => {
  return (req, res) => {
    return Promise.coroutine(function *() {
      const deviceId = req.body.deviceid;
      const redisData = (yield di.redis.lrangeAsync(deviceId, 0, -1))
        .map(jsonStr => {
          const data = JSON.parse(jsonStr);
          data.deviceid = deviceId;
          return data;
        });

      res.send({
        data: redisData
      });
    })().catch(e => {
      console.log('Error in /retrieve handler: ', e);
      res.status(500).send('Internal error');
    });
  };
};

/**
 * Handler for /close
 * It takes session token and closes the session
 * @param {DI} di
 * @returns {function(req, res)}
 */
const closeHandler = (di) => {
  return (req, res) => {
    return Promise.coroutine(function *() {
      const token = req.body.token;
      yield di.redis.delAsync(token);
      res.send({result: 'ok'});
    })().catch(e => {
      console.log('Error in /close handler: ', e);
      res.status(500).send('Internal error');
    });
  };
};

module.exports = {
  deviceHandler,storeHandler, retrieveHandler, closeHandler
};
