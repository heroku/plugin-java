'use strict';

const child = require('child_process');
const path = require('path');
const cli = require('heroku-cli-util');
const https = require('https')
const http = require('http')
const fs = require('fs')
const co = require('co');
const helpers = require('../lib/helpers')

module.exports = {
  topic: 'tunnels',
  command: 'socks',
  description: 'Launch a SOCKS proxy into a dyno',
  help: 'Usage: heroku tunnels:socks',
  args: [],
  needsApp: true,
  needsAuth: true,
  run: cli.command(co.wrap(run))
};

function * run(context, heroku) {
  let configVars = yield heroku.get(`/apps/${context.app}/config-vars`)
  helpers.createSocksProxy(context, heroku, configVars)
}
