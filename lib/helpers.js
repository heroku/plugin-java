'use strict'

const cli = require('heroku-cli-util')
const path = require('path');
const child = require('child_process');
const url = require('url');
const co = require('co');
const keypair = require('keypair');
const forge = require('node-forge');
const socks = require('socksv5')
const Client = require('ssh2').Client;

function withTunnelStatus(context, heroku, configVars, options={}, callback) {
  var rawTunnelsUrl = _getTunnelsUrl(configVars)
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
  var rawTunnelsUrl = _getTunnelsUrl(configVars)
  var tunnelsUrl = url.parse(rawTunnelsUrl)
  var dyno = context.flags.dyno || _getTunnelsDyno(configVars)
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
    var key = keypair();
    var privkeypem = key.private;
    var publicKey = forge.pki.publicKeyFromPem(key.public);
    var pubkeypem = forge.ssh.publicKeyToOpenSSH(publicKey, '');
    cli.hush(pubkeypem)

    var rawTunnelsUrl = _getTunnelsUrl(configVars)
    var tunnelsUrl = url.parse(rawTunnelsUrl)
    var dyno = context.flags.dyno || _getTunnelsDyno(configVars)
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
  return updateClientKey(context, heroku, configVars, function(key, dyno, response) {
    cli.hush(response.body);
    var json = JSON.parse(response.body);
    var user = json['client_user']
    var host = json['tunnel_host']
    var port = 80
    var dyno_ip = json['dyno_ip']

    socksv5({ host: host, port: port, username: user, privateKey: key }, function(socks_port) {
      if (callback) callback(dyno_ip, dyno, socks_port)
    });
  })
}

function socksv5(ssh_config, callback) {
  var socksPort = 1080;
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
  }).listen(socksPort, 'localhost', function() {
    console.log(`SOCKSv5 proxy server started on port ${socksPort}`);
    if (callback) callback(socksPort);
  }).useAuth(socks.auth.None());
}

function _getTunnelsUrl(configVars) {
  var url = configVars['TUNNELS_URL']
  if (url) return url;
  throw new Error("No Tunnels add-on found!\nDid you run `heroku addons:create tunnels'?")
}

function _getTunnelsDyno(configVars) {
  return configVars['TUNNELS_DYNO'] || 'web.1'
}

module.exports = {
  withTunnelInfo,
  updateClientKey,
  createSocksProxy,
  socksv5
}
