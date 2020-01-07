'use strict'

const cli = require('heroku-cli-util')
const path = require('path');
const child = require('child_process');
const fs = require('fs');

function maxFileSizeMegabytes() {
  return 300;
}

function maxFileSize() {
  return maxFileSizeMegabytes() * 1024 * 1024;
}

function herokuDeployJar() {
  return process.env.HEROKU_DEPLOY_JAR_PATH ?
    process.env.HEROKU_DEPLOY_JAR_PATH :
    path.join(__dirname, 'heroku-deploy-complete.jar')
}

function deploy(context, args) {
  return new Promise((resolve, reject) => {
    if (context.flags['webapp-runner'])
      args.unshift(`-Dheroku.webappRunnerVersion=${context.flags['webapp-runner']}`)

    if (context.flags.jdk)
      args.unshift(`-Dheroku.jdkVersion=${context.flags.jdk}`)

    if (context.flags.includes)
      args.unshift(`-Dheroku.includes=${context.flags.includes}`)

    if (context.flags['build-version'])
      args.unshift(`-Dheroku.buildVersion=${context.flags['build-version']}`)

    if (context.flags['buildpacks'])
      args.unshift(`-Dheroku.buildpacks=${context.flags['buildpacks']}`)

    let allArgs = [
      `-Dheroku.appName=${context.app}`,
      '-Xmx1g'
    ].concat(args)

    cli.hush(`java ${allArgs.join(' ')}`)
    let spawned = child.spawn('java', allArgs, {stdio: 'pipe'})
      .on('exit', (code, signal) => {
        if (signal || code) {
          reject(
            `There was a problem deploying to ${cli.color.white.bold(context.app)}.
            Make sure you have permission to deploy by running: ${cli.color.magenta('heroku apps:info -a ' + context.app)}`);
        } else {
          resolve();
        }
      });
    spawned.stdout.on('data', (chunk) => {
      cli.console.writeLog(chunk.toString());
    });
    spawned.stderr.on('data', (chunk) => {
      cli.console.writeLog(chunk.toString());
    });
  });
}

function runWebappRunner(context, warFile, args) {
  return new Promise((resolve, reject) => {
    _downloadWebappRunner(context.flags['webapp-runner'] || '9.0.30.0', function(webappRunnerJarPath) {
      let allArgs = [
        '-Xmx1g',
      ].concat(args).concat([
        '-jar',
        webappRunnerJarPath,
        warFile
      ])

      cli.hush(`java ${allArgs.join(' ')}`)
      let spawned = child.spawn('java', allArgs, {stdio: 'pipe'})
        .on('exit', (code, signal) => {
          if (signal || code) reject(signal || code);
          else resolve();
        });
      spawned.stdout.on('data', (chunk) => {
        cli.console.writeLog(chunk.toString());
      });
      spawned.stderr.on('data', (chunk) => {
        cli.console.writeLog(chunk.toString());
      });
      spawned.stdout.on('end', () => {});
    })
  })
}

function _downloadWebappRunner(version, callback) {
  let url = `http://central.maven.org/maven2/com/heroku/webapp-runner/${version}/webapp-runner-${version}.jar`
  if (knownWebappRunnerLegacyVersions.includes(version)) {
    url = `http://central.maven.org/maven2/com/github/jsimone/webapp-runner/${version}/webapp-runner-${version}.jar`
  }

  let file = path.join('target', `webapp-runner-${version}.jar`)
  if (fs.existsSync(file)) {
    callback(file);
  } else {
    if (!fs.existsSync(path.dirname(file))) fs.mkdirSync(path.dirname(file))
    cli.log(`Downloading ${file}...`)
    let fileStream = fs.createWriteStream(file)
    cli.got.stream(url).pipe(fileStream)
    fileStream.on('finish', function() {
      fileStream.close(() =>
        callback(file)
      )
    });
  }
}

const knownWebappRunnerLegacyVersions = [
  "9.0.27.1",
  "9.0.27.0",
  "9.0.24.1",
  "9.0.24.0",
  "9.0.22.0",
  "9.0.20.1",
  "9.0.20.0",
  "9.0.19.1",
  "9.0.19.0",
  "9.0.17.0",
  "9.0.16.0",
  "9.0.14.0",
  "9.0.13.0",
  "9.0.11.0",
  "9.0.8.1",
  "9.0.8.0",
  "8.5.47.2",
  "8.5.47.1",
  "8.5.47.0",
  "8.5.45.0",
  "8.5.43.1",
  "8.5.43.0",
  "8.5.41.1",
  "8.5.41.0",
  "8.5.40.1",
  "8.5.40.0",
  "8.5.39.0",
  "8.5.38.0",
  "8.5.37.1",
  "8.5.37.0",
  "8.5.35.0",
  "8.5.34.1",
  "8.5.34.0",
  "8.5.33.0",
  "8.5.32.1",
  "8.5.32.0",
  "8.5.31.1",
  "8.5.31.0",
  "8.5.30.0",
  "8.5.29.0",
  "8.5.28.0",
  "8.5.27.0",
  "8.5.24.0",
  "8.5.23.1",
  "8.5.23.0",
  "8.5.20.1",
  "8.5.20.0",
  "8.5.15.1",
  "8.5.15.0",
  "8.5.11.3",
  "8.5.11.2",
  "8.5.11.1",
  "8.5.11.0",
  "8.5.9.0",
  "8.5.5.2",
  "8.5.5.1",
  "8.5.5.0",
  "8.0.52.0",
  "8.0.51.0",
  "8.0.50.0",
  "8.0.47.0",
  "8.0.44.0",
  "8.0.39.0",
  "8.0.33.4",
  "8.0.33.3",
  "8.0.33.2",
  "8.0.33.1",
  "8.0.33.0",
  "8.0.30.2",
  "8.0.30.1",
  "8.0.30.0",
  "8.0.24.1",
  "8.0.24.0",
  "8.0.23.0",
  "8.0.18.0-M1",
  "7.0.91.0",
  "7.0.88.0",
  "7.0.86.0",
  "7.0.85.0",
  "7.0.84.0",
  "7.0.82.0",
  "7.0.57.2",
  "7.0.57.1",
  "7.0.40.2",
  "7.0.40.1",
  "7.0.40.0",
  "7.0.34.3",
  "7.0.34.2",
  "7.0.34.1",
  "7.0.34.0",
  "7.0.30.1",
  "7.0.29.3",
  "7.0.27.1",
  "7.0.22.3",
  "7.0.22.2",
  "7.0.22.1",
  "7.0.22"
];

module.exports = {
  deploy,
  runWebappRunner,
  herokuDeployJar,
  maxFileSize,
  maxFileSizeMegabytes
}
