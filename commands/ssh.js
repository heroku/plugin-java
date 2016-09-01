'use strict';

var child = require('child_process');
let cli = require('heroku-cli-util');
let co = require('co');
var Client = require('ssh2').Client;
var https = require('https')
var url = require('url');

module.exports = {
  topic: 'tunnels',
  command: 'ssh',
  description: 'Create an SSH session through the tunnel',
  help: 'Usage: heroku tunnels:ssh',
  args: [],
  needsApp: true,
  needsAuth: true,
  run: cli.command(co.wrap(run))
};

function * run(context, heroku) {
  let configVars = yield heroku.get(`/apps/${context.app}/config-vars`)
  var rawTunnelsUrl = configVars['TUNNELS_URL']
  var tunnelsUrl = url.parse(rawTunnelsUrl)
  cli.hush('HOST: ' + tunnelsUrl.host)
  cli.hush('AUTH: ' + tunnelsUrl.auth)

  var tunnelsPath = `/api/v1/web.1?sshd=true`
  cli.hush('PATH: ' + tunnelsPath)

  cli.got(`https://${tunnelsUrl.host}`, {
    auth: tunnelsUrl.auth,
    path: tunnelsPath,
    method: 'GET'})
  .then(response => {
    console.log(response.body);
    var json = JSON.parse(response.body);

    var privateKeyHeader = '-----BEGIN RSA PRIVATE KEY-----'
    var privateKeyBody = json['private_key']
      .replace(`${privateKeyHeader} `, '')
      .replace(/ -----END RSA PRIVATE KEY-----[ ]+/, '')
      .replace(/ /g, "\n")
    var privateKey = `${privateKeyHeader}\n${privateKeyBody}\n-----END RSA PRIVATE KEY-----`
    ssh(
      json['tunnel_host'],
      json['tunnel_port'],
      json['dyno_user'],
      privateKey
    );
  })
  .catch(error => {
    console.error(error.response.body);
  });
}

function ssh(tunnelHost, tunnelPort, dynoUser, privateKey) {
  var conn = new Client();
  conn.on('ready', function() {
    console.log('Client :: ready');
    conn.shell(function(err, stream) {
    if (err) throw err;
      stream.on('close', function() {
        console.log('Stream :: close');
        conn.end();
      }).on('data', function(data) {
        // console.log('STDOUT: ' + data);
      }).stderr.on('data', function(data) {
        console.log('STDERR: ' + data);
      });

      stream.stdin.pipe(process.stdin);
      process.stdout.pipe(stream.stdout);

      process.stdout.on('end', function(e) {
          console.log('command finished')
          stream.exit(0);
          stream.end();
      })
    });
  }).connect({
    host: tunnelHost,
    port: tunnelPort,
    username: dynoUser,
    privateKey: privateKey
  });
}
