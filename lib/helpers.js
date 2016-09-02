'use strict'

const cli = require('heroku-cli-util')
const path = require('path');
const child = require('child_process');
const url = require('url');
const socks = require('socksv5'),
    Client = require('ssh2').Client;

function withTunnelInfo(context, heroku, configVars, options={}, callback) {
  var rawTunnelsUrl = configVars['TUNNELS_URL']
  var tunnelsUrl = url.parse(rawTunnelsUrl)
  cli.hush('HOST: ' + tunnelsUrl.host)
  cli.hush('AUTH: ' + tunnelsUrl.auth)

  var dyno = context.args.path || 'web.1'
  var tunnelsPath = `/api/v1/${dyno}`
  if (options['ssh'] == true) {
    tunnelsPath += "?ssh=true"
  }

  cli.hush('PATH: ' + tunnelsPath)

  return cli.got(`https://${tunnelsUrl.host}`, {
    auth: tunnelsUrl.auth,
    path: tunnelsPath,
    method: 'GET'
  }).then(callback).catch(error => {
    cli.error(error.response.body);
  });;
}

function massagePrivateKey(rawKey) {
  var privateKeyHeader = '-----BEGIN RSA PRIVATE KEY-----'
  var privateKeyBody = rawKey
    .replace(`${privateKeyHeader} `, '')
    .replace(/ -----END RSA PRIVATE KEY-----[ ]+/, '')
    .replace(/ /g, "\n")
  var privateKey = `${privateKeyHeader}\n${privateKeyBody}\n-----END RSA PRIVATE KEY-----`
  return privateKey;
}

function createSocksProxy(context, heroku, configVars, callback) {
  withTunnelInfo(
    context,
    heroku,
    configVars,
    {ssh: true}
  ).then(response => {
    cli.hush(response.body);
    var json = JSON.parse(response.body);

    var user = json['dyno_user']
    var host = json['tunnel_host']
    var port = json['tunnel_port']
    var key = helpers.massagePrivateKey(json['private_key'])

    cli.hush('server: ' + user + '@' + host + ':' + port)

    helpers.socksv5({
      host: host,
      port: port,
      username: user,
      privateKey: key
    }, function() {
      callback(dyno_ip)
    });
  }).catch(error => {
    cli.error(error.response.body);
  });
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
  massagePrivateKey,
  createSocksProxy,
  socksv5
}
