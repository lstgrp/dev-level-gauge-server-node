'use strict';

const Server = require('./server');

const server = Server.create();
server.initWithRAML().then(server.start.bind(server));
