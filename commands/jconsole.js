'use strict';
var child = require('child_process');
var path = require('path');
let cli = require('heroku-cli-util');
var https = require('https')
var http = require('http')
var fs = require('fs')
var socks = require('socksv5'),
    Client = require('ssh2').Client;

module.exports = {
  topic: 'jmx',
  command: 'jconsole',
  description: 'Launch JConsole into an app',
  help: 'Usage: heroku jmx:jconsole [user@host] [proxy_host:port]',
  args: [ {name: 'userDyno'}, {name: 'proxyPort'} ],
  needsApp: true,
  needsAuth: true,
  run: cli.command(function (context, heroku) {
    heroku.apps(context.app).info(function (err, app) {
      if (err) { throw err; }
      var user = context.args.userDyno.split("@")[0]
      var dyno_ip = context.args.userDyno.split("@")[1]
      var host = context.args.proxyPort.split(":")[0]
      var port = context.args.proxyPort.split(":")[1]
      var key = downloadPrivateKey(context.app, context.herokuDir)

      cli.hush('server: ' + user + '@' + host + ':' + port)

      socksv5({
        host: host,
        port: port,
        username: user,
        privateKey: key
      }, function() {
        console.log("Launching JConsole...")
        child.exec(`jconsole -J-DsocksProxyHost=localhost -J-DsocksProxyPort=1080 ${dyno_ip}:1098`)
      });
    });
  })
};

function socksv5(ssh_config, callback) {
  socks.createServer(function(info, accept, deny) {
    // NOTE: you could just use one ssh2 client connection for all forwards, but
    // you could run into server-imposed limits if you have too many forwards open
    // at any given time
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
    callback();
  }).useAuth(socks.auth.None());
}

function downloadPrivateKey(app, herokuDir) {
    cli.log('Downloading private key...')
    return child.execSync('heroku run cat /app/.ssh/id_rsa -a ' + app).toString()
}
