'use strict';

const child = require('child_process');
const cli = require('heroku-cli-util');
const co = require('co');
const Client = require('ssh2').Client;
const https = require('https')
const url = require('url');
const tty = require('tty')
const stream = require('stream')
const uuid = require('uuid');
const helpers = require('../lib/helpers')
const ssh = require('../lib/ssh')

module.exports = function(topic, command) {
  return {
    topic: topic,
    command: command,
    description: 'Generate a heap dump for a Java process',
    help: `Usage: heroku ${topic}:${command}`,
    variableArgs: true,
    flags: [
      { name: 'dyno', char: 'd', hasValue: true, description: 'specify the dyno to connect to' },
      { name: 'hprof', char: 'h', hasValue: false, description: 'Generate a binary heap dump in hprof format' },
      { name: 'output', char: 'o', hasValue: true, description: 'Name of the file to write the dump to' },
    ],
    needsApp: true,
    needsAuth: true,
    run: cli.command(co.wrap(run))
  }
};

function * run(context, heroku) {
  yield helpers.initAddon(context, heroku, function *(configVars) {
    yield helpers.updateClientKey(context, heroku, configVars, function(privateKey, dyno, response) {
      var message = `Generating heap dump for ${cli.color.cyan.bold(dyno)} on ${cli.color.app(context.app)}`
      cli.action(message, {success: false}, co(function* () {
        cli.hush(response.body);
        var json = JSON.parse(response.body);

        if (context.flags.hprof) {
          var dumpFile = context.flags.output || `heapdump-${uuid.v4()}.hprof`
          context.args = [`jps | grep -v "Jps" | tail -n1 | grep -o '^\\S*' | xargs jmap -dump:format=b,file=${dumpFile}`]
          ssh.connect(context, json['tunnel_host'], json['client_user'], privateKey, () => {
            ssh.scp(context, json['tunnel_host'], json['client_user'], privateKey, dumpFile, dumpFile)
          })
        } else {
          context.args = [`jps | grep -v "Jps" | tail -n1 | grep -o '^\\S*' | xargs jmap -histo`]
          ssh.connect(context, json['tunnel_host'], json['client_user'], privateKey)
        }
      }))
    })
  });
}
