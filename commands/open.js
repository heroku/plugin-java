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
  command: 'open',
  description: 'Open the proxied HTTP service in a browser.',
  help: 'Usage: heroku tunnels:open',
  args: [],
  needsApp: true,
  needsAuth: true,
  run: cli.command(co.wrap(run))
};

function * run(context, heroku) {
  let configVars = yield heroku.get(`/apps/${context.app}/config-vars`)
  helpers.withTunnelInfo(context, heroku, configVars, {}, response => {
    cli.hush(response.body);
    var json = JSON.parse(response.body);
    var path=`https://${json['tunnel_host']}:${json['tunnel_port']}`
    cli.open(url.resolve(path, context.args.path || ''))
  })
}
