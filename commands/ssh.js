'use strict';

const child = require('child_process');
const cli = require('heroku-cli-util');
const co = require('co');
const Client = require('ssh2').Client;
const https = require('https')
const url = require('url');
const tty = require('tty')
const stream = require('stream')
const helpers = require('../lib/helpers')
const command = require('../lib/command')
const ssh = require('../lib/ssh')

module.exports = function(topic, command) {
  return {
    topic: topic,
    command: command,
    description: 'Create an SSH session to a dyno with Heroku-Exec',
    help: `Usage: heroku ${topic}:${command}`,
    variableArgs: true,
    flags: [
      { name: 'dyno', char: 'd', hasValue: true },
      { name: 'status', hasValue: false }],
    needsApp: true,
    needsAuth: true,
    run: cli.command(co.wrap(run))
  }
};

function * run(context, heroku) {
  yield helpers.initAddon(context, heroku, function *(configVars) {
    if (context.flags.status) {
      yield helpers.checkStatus(context, heroku, configVars);
    } else {
      yield helpers.updateClientKey(context, heroku, configVars, function(privateKey, dyno, response) {
        var message = `Connecting to ${cli.color.cyan.bold(dyno)} on ${cli.color.app(context.app)}`
        cli.action(message, {success: false}, co(function* () {
          cli.hush(response.body);
          var json = JSON.parse(response.body);
          ssh.connect(context, json['tunnel_host'], json['client_user'], privateKey);
        }))
      })
    }
  });
}
