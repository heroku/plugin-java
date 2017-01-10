'use strict';

var child = require('child_process');
let cli = require('heroku-cli-util');
let co = require('co');

module.exports = {
  topic: 'tunnels',
  command: 'init',
  description: 'Initialize an app for the Tunnels add-on',
  help: 'Usage: heroku tunnels:init',
  args: [],
  needsApp: true,
  needsAuth: true,
  run: cli.command(co.wrap(run))
}

function * run(context, heroku) {
  var buildpackUrl = "https://github.com/tunnels-addon/buildpack"

  let buildpacks = yield heroku.request({
    path: `/apps/${context.app}/buildpack-installations`,
    headers: {Range: ''}
  });

  if (buildpacks.length === 0) {
    cli.error(`${context.app} has no Buildpack URL set. You must deploy your application first!`);
  } else {
    let configVars = yield heroku.get(`/apps/${context.app}/config-vars`)
    var tunnelsUrl = configVars['TUNNELS_URL']
    if (!tunnelsUrl) {
      child.execSync(`heroku addons:create tunnels -a ${context.app}`)
    } else {
      cli.log("Using existing Tunnels addon")
    }

    if (buildpacks[0]['buildpack']['url'] === buildpackUrl) {
      cli.log(`The Tunnels buildpack has already been added!`);
    } else {
      cli.log(`Adding the Tunnels buildpack to ${context.app}`)
      child.execSync(`heroku buildpacks:add -i 1 ${buildpackUrl} -a ${context.app}`)
    }
    cli.log('')
    cli.log('Run the following commands redeploy your app, then Tunnels will be ready to use:')
    cli.log('  $ git commit -m "Added Tunnels" --allow-empty')
    cli.log('  $ git push heroku master')
  }
}
