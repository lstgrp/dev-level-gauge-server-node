# level-gauge-server-node
Sample API server for BLE Level Gauge application written in Node

# includs
- node express, raml, redis

# RESTful API List
- check [apidoc.raml](https://github.com/lstgrp/dev-level-gauge-server-node/blob/master/apidoc.raml "RAML") file

# Flow
- get /health : check available
- post /device : get token for access
- post /store : save data
- post /retrieve : get data
- post /close : close session

# Description in detail
- Google Document https://goo.gl/7T8qlV
