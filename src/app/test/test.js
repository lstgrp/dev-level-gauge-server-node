'use strict';

const assert = require('assert');
const Promise = require('bluebird');
const request = require('supertest-as-promised');
const Server = require('../../server');

let server;
const cot = (gen) => Promise.coroutine(gen)();
const makeRequest = (method, path, body, expectedCode) => {
  return request(server.app)[method](path)
    .set('x-api-token', 'master-token')
    .type('json')
    .send(body)
    .expect(expectedCode)
    .then(res => res)
    // Hard throw for catching in coroutine above
    .catch(e => {throw e});
};

describe('Handler test, successful', () => {
  before(done => {
    server = Server.create();
    server.initWithRAML().then(() => {
      server.start();
      done()
    });
  });

  beforeEach(done => server.di.redis.flushdb(done));

  after(done => {
    server.tearDown();
    server = null;
    done();
  });

  it('/device', () => {
    return cot(function *() {
      const sampleDeviceData = {
        device: {
          name: 'test_name',
          serial: 'test_serial',
        },
      };

      const res = yield makeRequest('post', '/device', sampleDeviceData, 200);
      assert(res.body.deviceid && res.body.token && res.body.ttl, 'Expect deviceid, token and ttl in response body');
    }).catch(e => assert(false, `Expected /device to succeed, but got error: ${e}`));
  });

  it('/store', () => {
    return cot(function *() {
      const sampleLevelGaugeData = {
        deviceid: 'test_id',
        time: Date.now(),
        event: 0,
        level: 1,
      };

      const res = yield makeRequest('post', '/store', sampleLevelGaugeData, 200);
      assert(res.body.result === 'ok', 'Returned result should be ok');
    }).catch(e => {
      assert(false, `Expected /store handler to succeed, but got error: ${e}`)
    });
  });

  it('/retrieve', () => {
    return cot(function *() {
      const deviceid = 'test_id';
      const now = Date.now();

      for (let i = 0; i < 10; i++) {
        const sampleLevelGaugeData = {
          deviceid: deviceid,
          time: now,
          event: 0,
          level: 1,
        };

        yield makeRequest('post', '/store', sampleLevelGaugeData, 200);
      }

      const res = yield makeRequest('post', '/retrieve', {deviceid}, 200);
      const data = res.body.data;
      assert(data.length === 10, `Expected retrieved data length to be 10, instead got: ${data.length}`);

      for (let i = 0; i < data.length; i++) {
        assert(data[i].deviceid === deviceid && data[i].time === now, `Expected correct data, instead got: ${data[i]}`)
      }
    }).catch(e => {
      assert(false, `Expected /retrieve handler to succeed, but got error: ${e}`);
    });
  });

  it('/close', () => {
    return cot(function *() {
      const res = yield makeRequest('post', '/device', {device: {name: 'test_name', serial: 'test_serial'}}, 200);
      const closeRes = yield makeRequest('post', '/close', {token: res.body.token}, 200);
      assert(closeRes.body.result === 'ok', `Expected session closing to return 'ok' as result, got: ${closeRes.body.result}`);
    }).catch(e => {
      assert(false, `Expected /close handler to succeed, but got error: ${e}`)
    });
  })
});

describe('Handler test, failure', () => {
  before(done => {
    server = Server.create();
    server.initWithRAML().then(() => {
      server.start();
      done()
    });
  });

  beforeEach(done => server.di.redis.flushdb(done));

  after(done => {
    server.tearDown();
    server = null;
    done();
  });

  it('/device, missing field "device.serial" in request body', () => {
    return cot(function *() {
      const sampleDeviceData = {
        device: {
          name: 'test_name',
        },
      };

      const res = yield makeRequest('post', '/device', sampleDeviceData, 400);
      assert(res.statusCode === 400, 'Expected to fail with status code 40');
    });
  });

  it('/store, missing field "deviceid" in request body', () => {
    return cot(function *() {
      const sampleLevelGaugeData = {
        time: Date.now(),
        event: 0,
        level: 1,
      };

      const res = yield makeRequest('post', '/store', sampleLevelGaugeData, 400);
      assert(res.statusCode === 400, 'Expected to fail with status code 404');
    });
  });
});
