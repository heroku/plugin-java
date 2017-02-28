'use strict';

const child = require('child_process');
const path = require('path');
const cli = require('heroku-cli-util');
const https = require('https')
const http = require('http')
const fs = require('fs');
const co = require('co');
const url = require('url');
const helpers = require('../lib/helpers')

module.exports = function(topic, command) {
  return {
    topic: topic,
    command: command,
    description: 'Check the status of your heroku-exec add-on',
    help: `Usage: heroku ${topic}:${command}`,
    args: [],
    needsApp: true,
    needsAuth: true,
    run: cli.command(co.wrap(run))
  }
};

function * run(context, heroku) {
  let configVars = yield heroku.get(`/apps/${context.app}/config-vars`)

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

    cli.styledHeader(`${context.app} Heroku-Exec status`);

    if (reservations.length == 0) {
      cli.error("Heroku-Exec is not running!")
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
