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
    description: 'Launch JConsole into an app',
    help: `Usage: heroku ${topic}:${command}`,
    args: [],
    needsApp: true,
    needsAuth: true,
    run: cli.command(co.wrap(run))
  }
};

function * run(context, heroku) {
  yield helpers.initAddon(context, heroku, function *(configVars) {
    yield helpers.createSocksProxy(context, heroku, configVars, function(dyno_ip) {
      cli.log("Launching JConsole...")
      child.execFile('jconsole', ['-J-DsocksProxyHost=localhost', '-J-DsocksProxyPort=1080', `${dyno_ip}:1098`])
      // TODO terminate socks proxy if java process ends?
    })
  });
}
