'use strict';

const UUID = require('uuid-1345');

module.exports = {
  port: 5656,
  redisPort: 6379,
  UUIDNamespace: new UUID('27d03927-7c8f-469e-8ba1-68a376d43cc9'),
  tokenKey: 'skjdhfjk',
  tokenLifetime: 3600,
  masterKey: 'master-key',
};
