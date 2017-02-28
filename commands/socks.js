'use strict';

const child = require('child_process');
const path = require('path');
const cli = require('heroku-cli-util');
const https = require('https')
const http = require('http')
const fs = require('fs')
const co = require('co');
const helpers = require('../lib/helpers')

module.exports = function(topic, command) {
  return {
    topic: topic,
    command: command,
    description: 'Launch a SOCKS proxy into a dyno',
    help: `Usage: heroku ${topic}:${command}`,
    args: [],
    flags: [{ name: 'dyno', char: 'd', hasValue: true }],
    needsApp: true,
    needsAuth: true,
    run: cli.command(co.wrap(run))
  }
};

function * run(context, heroku) {
  let configVars = yield heroku.get(`/apps/${context.app}/config-vars`)
  yield helpers.createSocksProxy(context, heroku, configVars)
}
