'use strict';

const child = require('child_process');
const cli = require('heroku-cli-util');
const exec = require('heroku-exec-util');
const co = require('co');
const Client = require('ssh2').Client;
const https = require('https')
const url = require('url');
const tty = require('tty')
const stream = require('stream')

module.exports = function(topic, command) {
  return {
    topic: topic,
    command: command,
    description: 'Generate a thread dump for a Java process',
    help: `Usage: heroku ${topic}:${command}`,
    variableArgs: true,
    flags: [{ name: 'dyno', char: 'd', hasValue: true, description: 'specify the dyno to connect to' }],
    needsApp: true,
    needsAuth: true,
    run: cli.command(co.wrap(run))
  }
};

function * run(context, heroku) {
  yield exec.initAddon(context, heroku, function *(configVars) {
    yield exec.updateClientKey(context, heroku, configVars, function(privateKey, dyno, response) {
      var message = `Generating thread dump for ${cli.color.cyan.bold(dyno)} on ${cli.color.app(context.app)}`
      cli.action(message, {success: false}, co(function* () {
        cli.hush(response.body);
        var json = JSON.parse(response.body);

        context.args = [`jps | grep -v "Jps" | tail -n1 | grep -o '^\\S*' | xargs jstack`]
        exec.connect(context, json['tunnel_host'], json['client_user'], privateKey)
      }))
    })
  });
}
