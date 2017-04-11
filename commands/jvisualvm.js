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
    description: 'Launch VisualVM connected to Heroku',
    help: `Usage: heroku ${topic}:${command}`,
    args: [],
    flags: [{ name: 'dyno', char: 'd', hasValue: true, description: 'specify the dyno to connect to' }],
    needsApp: true,
    needsAuth: true,
    run: cli.command(co.wrap(run))
  }
};

function * run(context, heroku) {
  yield helpers.initAddon(context, heroku, function *(configVars) {
    yield helpers.createSocksProxy(context, heroku, configVars, function(dyno_ip) {
      cli.log("Launching VisualVM...")
      child.execFile('jvisualvm', ['-J-DsocksProxyHost=localhost', '-J-DsocksProxyPort=1080', `--openjmx=${dyno_ip}:1098`], (error, stdout, stderr) => {
        if (error) {
          cli.log("Could not open VisualVM. Make sure it is on your PATH environment variable.")
          cli.log("Leave this process running and execute the following command in another terminal:")
          cli.log(cli.color.magenta(`jvisualvm -J-DsocksProxyHost=localhost -J-DsocksProxyPort=1080 --openjmx=${dyno_ip}:1098`));
        }
      })
      cli.log(`Use ${cli.color.magenta('CTRL+C')} to stop the connection`)
    })
  });
}
