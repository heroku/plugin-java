'use strict'

const cli = require('heroku-cli-util')
const path = require('path');
const child = require('child_process');
const url = require('url');
const co = require('co');
const ursa = require('ursa');
const socks = require('socksv5')
const Client = require('ssh2').Client;

function withTunnelStatus(context, heroku, configVars, options={}, callback) {
  var rawTunnelsUrl = configVars['TUNNELS_URL']
  var tunnelsUrl = url.parse(rawTunnelsUrl)
  var tunnelsPath = `/api/v1`

  return cli.got(`https://${tunnelsUrl.host}`, {
    auth: tunnelsUrl.auth,
    path: tunnelsPath,
    method: 'GET'
  }).then(callback).catch(error => {
    cli.error(error.response.body);
  });;
}

function withTunnelInfo(context, heroku, configVars, options={}, callback) {
  var rawTunnelsUrl = configVars['TUNNELS_URL']
  var tunnelsUrl = url.parse(rawTunnelsUrl)
  var dyno = context.flags.dyno || 'web.1'
  var tunnelsPath = `/api/v1/${dyno}`

  return cli.got(`https://${tunnelsUrl.host}`, {
    auth: tunnelsUrl.auth,
    path: tunnelsPath,
    method: 'GET'
  }).then(callback).catch(error => {
    cli.error(error.response.body);
  });;
}

function updateClientKey(context, heroku, configVars, callback) {
  return cli.action("Establishing credentials", {success: false}, co(function* () {
    var key = ursa.generatePrivateKey(2048, 65537);
    var privkeypem = key.toPrivatePem().toString('ascii');
    var pubkeypem = `ssh-rsa ${key.toPublicSsh('base64')}`;
    cli.hush(pubkeypem)

    var rawTunnelsUrl = configVars['TUNNELS_URL']
    var tunnelsUrl = url.parse(rawTunnelsUrl)
    var dyno = context.flags.dyno || 'web.1'
    var tunnelsPath = `/api/v1/${dyno}`

    return cli.got(`https://${tunnelsUrl.host}`, {
      auth: tunnelsUrl.auth,
      path: tunnelsPath,
      method: 'PUT',
      body: {client_key: pubkeypem}
    }).then(function (response) {
      cli.action.done('done')
      callback(privkeypem, dyno, response);
    }).catch(error => {
      cli.action.done('error');
      cli.hush(error);
      cli.error('Could not connect to dyno!\nCheck if the dyno is running with `heroku ps\'')
    });;
  }))
}

function createSocksProxy(context, heroku, configVars, callback) {
  return updateClientKey(context, heroku, configVars, function(key, response) {
    cli.hush(response.body);
    var json = JSON.parse(response.body);
    var user = json['dyno_user']
    var host = json['tunnel_host']
    var port = json['tunnel_port']
    var dyno_ip = json['dyno_ip']

    socksv5({ host: host, port: port, username: user, privateKey: key }, function() {
      if (callback) callback(dyno_ip)
    });
  })
}

function socksv5(ssh_config, callback) {
  socks.createServer(function(info, accept, deny) {
    var conn = new Client();
    conn.on('ready', function() {
      conn.forwardOut(info.srcAddr,
                      info.srcPort,
                      info.dstAddr,
                      info.dstPort,
                      function(err, stream) {
        if (err) {
          conn.end();
          return deny();
        }

        var clientSocket;
        if (clientSocket = accept(true)) {
          stream.pipe(clientSocket).pipe(stream).on('close', function() {
            conn.end();
          });
        } else
          conn.end();
      });
    }).on('error', function(err) {
      deny();
    }).connect(ssh_config);
  }).listen(1080, 'localhost', function() {
    console.log('SOCKSv5 proxy server started on port 1080');
    if (callback) callback();
  }).useAuth(socks.auth.None());
}

module.exports = {
  withTunnelInfo,
  updateClientKey,
  createSocksProxy,
  socksv5
}
