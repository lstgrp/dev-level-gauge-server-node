'use strict';

const UUID = require('uuid-1345');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

/**
 * Generate device id for given serial code
 * @param {string} serial Device serial code
 * @return {Promise.<string>}
 */
const generateDeviceId = (serial) => {
  return new Promise((res, rej) => {
    UUID.v5({
      namespace: config.UUIDNamespace,
      name: serial
    }, function (err, result) {
      if (err) {
        return rej(err);
      }

      return res(result.toString());
    });
  });
};

/**
 * Generate JWT token for given deviceid
 * @param {string} deviceid
 * @returns {string}
 */
const generateJWTToken = (deviceid) => {
  return jwt.sign({
    sub: deviceid,
    exp: config.tokenLifetime,
  }, config.tokenKey);
};

module.exports = {
  generateDeviceId, generateJWTToken
};

// Typedefs

/**
 * @typedef {Object} DI
 * @property redis
 */
