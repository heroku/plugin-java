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
const ssh = require('../lib/ssh')

module.exports = {
  topic: 'tunnels',
  command: 'jstack',
  description: 'Generate a thread dump for a Java process',
  help: 'Usage: heroku tunnels:jstack',
  variableArgs: true,
  flags: [{ name: 'dyno', char: 'd', hasValue: true }],
  needsApp: true,
  needsAuth: true,
  run: cli.command(co.wrap(run))
};

function * run(context, heroku) {
  let configVars = yield heroku.get(`/apps/${context.app}/config-vars`)

  yield helpers.updateClientKey(context, heroku, configVars, function(privateKey, dyno, response) {
    var message = `Generating thread dump for ${cli.color.cyan.bold(dyno)} on ${cli.color.app(context.app)}`
    cli.action(message, {success: false}, co(function* () {
      cli.hush(response.body);
      var json = JSON.parse(response.body);

      context.args = [`jps | grep -v "Jps" | tail -n1 | grep -o '^\\S*' | xargs jstack`]
      ssh.connect(context, json['tunnel_host'], json['client_user'], privateKey)
    }))
  })
}
