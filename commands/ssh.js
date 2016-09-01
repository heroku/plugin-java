'use strict';

const child = require('child_process');
const cli = require('heroku-cli-util');
const co = require('co');
const Client = require('ssh2').Client;
const https = require('https')
const url = require('url');
const helpers = require('../lib/helpers')

module.exports = {
  topic: 'tunnels',
  command: 'ssh',
  description: 'Create an SSH session through the tunnel',
  help: 'Usage: heroku tunnels:ssh',
  args: [{name: 'dyno', optional: true}],
  needsApp: true,
  needsAuth: true,
  run: cli.command(co.wrap(run))
};

function * run(context, heroku) {
  let configVars = yield heroku.get(`/apps/${context.app}/config-vars`)

  helpers.withTunnelInfo(
    context,
    heroku,
    configVars,
    {ssh: true}
  ).then(response => {
    cli.hush(response.body);
    var json = JSON.parse(response.body);
    var privateKey = helpers.massagePrivateKey(json['private_key'])
    ssh(json['tunnel_host'], json['tunnel_port'], json['dyno_user'], privateKey)
  }).catch(error => {
    cli.error(error.response.body);
  });
}

function ssh(tunnelHost, tunnelPort, dynoUser, privateKey) {
  var conn = new Client();
  conn.on('ready', function() {
    cli.hush('Client :: ready');
    conn.shell(function(err, stream) {
      if (err) throw err;
      stream.on('close', function() {
        cli.hush('Stream :: close');
        conn.end();
        cli.exit(0);
      }).on('data', function(data) {
        // console.log('STDOUT: ' + data);
      }).stderr.on('data', function(data) {
        cli.log('STDERR: ' + data);
      });

      stream.stdin.pipe(process.stdin);
      process.stdout.pipe(stream.stdout);
    });
  }).connect({
    host: tunnelHost,
    port: tunnelPort,
    username: dynoUser,
    privateKey: privateKey
  });
}
