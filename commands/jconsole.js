'use strict';

const child = require('child_process');
const cli = require('heroku-cli-util');
const exec = require('heroku-exec-util');
const co = require('co');

module.exports = function(topic, command) {
  return {
    topic: topic,
    command: command,
    description: 'Launch JConsole connected to Heroku',
    help: `Usage: heroku ${topic}:${command}`,
    args: [],
    flags: [{ name: 'dyno', char: 'd', hasValue: true, description: 'specify the dyno to connect to' }],
    needsApp: true,
    needsAuth: true,
    run: cli.command(co.wrap(run))
  }
};

function * run(context, heroku) {
  yield exec.initFeature(context, heroku, function *(configVars) {
    yield exec.createSocksProxy(context, heroku, configVars, function(dyno_ip) {
      cli.log("Launching JConsole...")
      child.execFile('jconsole', ['-J-DsocksProxyHost=localhost', '-J-DsocksProxyPort=1080', `${dyno_ip}:1098`], (error, stdout, stderr) => {
        if (error) {
          cli.log("Could not open JConsole. Make sure it is on your PATH environment variable.")
          cli.log("Leave this process running and execute the following command in another terminal:")
          cli.log(cli.color.magenta(`jconsole -J-DsocksProxyHost=localhost -J-DsocksProxyPort=1080 ${dyno_ip}:1098`));
        }
      })
      cli.log(`Use ${cli.color.magenta('CTRL+C')} to stop the connection`)
    })
  });
  return new Promise(resolve => {})
}
