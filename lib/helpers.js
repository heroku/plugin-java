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

function * checkStatus(context, heroku, configVars) {
  let dynos = yield heroku.request({path: `/apps/${context.app}/dynos`})

  var rawAddonUrl = configVars['HEROKU_EXEC_URL']
  var configDyno = configVars['HEROKU_EXEC_DYNO']
  var addonUrl = url.parse(rawAddonUrl)
  var addonPath = `/api/v1`

  return cli.got(`https://${addonUrl.host}`, {
    auth: addonUrl.auth,
    path: addonPath,
    method: 'GET'
  }).then(response => {

    var reservations = JSON.parse(response.body);

    cli.styledHeader(`${context.app} Heroku Exec status`);

    if (reservations.length == 0) {
      cli.error("Heroku Exec is not running!")
      cli.error("Check dyno status with `heroku ps'")
    } else {

      for (var i in reservations) {
        var name = configDyno || reservations[i]['dyno_name']
        var dyno = dynos.find(d => d.name === name)

        cli.table([
          {
            dyno_name: cli.color.white.bold(name),
            proxy_status: 'running',
            dyno_status: !dyno ? cli.color.red('missing!') : (dyno.state === 'up' ? cli.color.green(dyno.state) : cli.color.yellow(dyno.state))
          }
        ], {
          columns: [
            {key: 'dyno_name', label: 'Dyno'},
            {key: 'proxy_status', label: 'Proxy Status'},
            {key: 'dyno_status', label: 'Dyno Status'},
          ]
        });

      }
    }
  }).catch(error => {
    cli.error(error);
  });;
}

function * initAddon(context, heroku, callback) {
  var buildpackUrl = "https://github.com/heroku/exec-buildpack"

  let buildpacks = yield heroku.request({
    path: `/apps/${context.app}/buildpack-installations`,
    headers: {Range: ''}
  });

  if (buildpacks.length === 0) {
    cli.error(`${context.app} has no Buildpack URL set. You must deploy your application first!`);
  } else {
    let configVars = yield heroku.get(`/apps/${context.app}/config-vars`)
    var addonUrl = configVars['HEROKU_EXEC_URL']
    if (!addonUrl) {
      child.execSync(`heroku addons:create heroku-exec -a ${context.app}`)

      if (buildpacks[0]['buildpack']['url'] === buildpackUrl) {
        cli.log(`The Heroku Exec buildpack has already been added!`);
      } else {
        cli.log(`Adding the Heroku Exec buildpack to ${context.app}`)
        child.execSync(`heroku buildpacks:add -i 1 ${buildpackUrl} -a ${context.app}`)
      }
      cli.log('');
      cli.log('Run the following commands to redeploy your app, then Heroku Exec will be ready to use:');
      cli.log(cli.color.magenta('  git commit -m "Heroku Exec initialization" --allow-empty'));
      cli.log(cli.color.magenta('  git push heroku master'));
    } else {
      yield callback(configVars);
    }
  }
}

function withAddonInfo(context, heroku, configVars, options={}, callback) {
  var rawAddonUrl = _getAddonUrl(configVars)
  var addonUrl = url.parse(rawAddonUrl)
  var dyno = context.flags.dyno || _getExecDyno(configVars)
  var addonPath = `/api/v1/${dyno}`

  return cli.got(`https://${addonUrl.host}`, {
    auth: addonUrl.auth,
    path: addonPath,
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

    var rawAddonUrl = _getAddonUrl(configVars)
    var addonUrl = url.parse(rawAddonUrl)
    var dyno = context.flags.dyno || _getExecDyno(configVars)
    var addonPath = `/api/v1/${dyno}`

    return cli.got(`https://${addonUrl.host}`, {
      auth: addonUrl.auth,
      path: addonPath,
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
    console.log(`SOCKSv5 proxy server started on port ${cli.color.white.bold(socksPort)}`);
    if (callback) callback(socksPort);
  }).useAuth(socks.auth.None());
}

function _getAddonUrl(configVars) {
  var url = configVars['HEROKU_EXEC_URL']
  if (url) return url;
  throw new Error("No Heroku Exec add-on found!\nDid you run `heroku addons:create heroku-exec'?")
}

function _getExecDyno(configVars) {
  return configVars['HEROKU_EXEC_DYNO'] || 'web.1'
}

module.exports = {
  checkStatus,
  initAddon,
  withAddonInfo,
  updateClientKey,
  createSocksProxy,
  socksv5
}
