'use strict'

const child = require('child_process');
const cli = require('heroku-cli-util');
const co = require('co');
const Client = require('ssh2').Client;
const https = require('https')
const url = require('url');
const tty = require('tty')
const stream = require('stream')
const fs = require('fs')
// const ProgressBar = require('ascii-progress');
const progress = require('smooth-progress')
const command = require('../lib/command.js')

function connect(context, addonHost, dynoUser, privateKey, callback) {
  return new Promise((resolve, reject) => {
    var conn = new Client();
    cli.hush("[cli-ssh] created")
    conn.on('ready', function() {
      cli.hush("[cli-ssh] ready")
      cli.action.done('up')
      if (context.args.length > 0 && context.args != 'bash') {
        let cmd = command.buildCommand(context.args)
        cli.hush(`[cli-ssh] command: ${cmd}`)
        conn.exec(cmd, function(err, stream) {
          cli.hush("[cli-ssh] exec")
          if (err) {
            cli.hush(`[cli-ssh] err: ${err}`)
            throw err;
          }
          stream.on('close', function(code, signal) {
            cli.hush("[cli-ssh] close")
            conn.end();
            resolve();
            if (callback) callback();
          })
          .on('data', _readData(stream))
          .on('error', reject);
          process.once('SIGINT', () => conn.end())
        });
      } else {
        cli.hush("[cli-ssh] bash")
        conn.shell(function(err, stream) {
          cli.hush("[cli-ssh] shell")
          if (err) {
            cli.hush(`[cli-ssh] err: ${err}`)
            return _logConnectionError(err);
          }
          stream.on('close', function() {
            cli.hush("[cli-ssh] close")
            conn.end();
            resolve();
          })
          .on('data', _readData(stream))
          .on('error', reject)
          process.once('SIGINT', () => conn.end())
        });
      }
    }).on('error', reject).connect({
      host: addonHost,
      port: 80,
      username: dynoUser,
      privateKey: privateKey
    });
  });
}

function scp(context, addonHost, dynoUser, privateKey, src, dest) {
  return new Promise((resolve, reject) => {
    var conn = new Client();
    conn.on('ready', function() {
      cli.action.done('up')
      conn.sftp(function(err, sftp) {
        if (err) {
          return _logConnectionError(err);
        }

        var bar = false;
        var progressCallback = function (totalTransferred, chunk, totalFile) {
          if (!bar) {
            bar = progress({
              tmpl: 'Downloading... :bar :percent :eta',
              width: 25,
              total: totalFile
            })
          }
          bar.tick(chunk, totalTransferred)
        };

        sftp.fastGet(src, dest, {
          step: function (totalTransferred, chunk, totalFile) {
            progressCallback(totalTransferred, chunk, totalFile);
          }
        }, function(error) {
          if (error) {
            cli.hush(error)
            cli.error("ERROR: Could not transfer the file!");
            cli.error("Make sure the filename is correct.");
          }
          conn.end();
          resolve();
        });
      });
    }).on('error', reject).connect({
      host: addonHost,
      port: 80,
      username: dynoUser,
      privateKey: privateKey
    });
  });
}

function _logConnectionError(err) {
  cli.error("ERROR: Could not connect to the dyno!");
  cli.error(`Check that the dyno is active by running ${cli.color.white.bold("heroku ps")}`);
  return err;
}

function _readData (c) {
  let firstLine = true
  return function(data) {
    if (firstLine) {
      firstLine = false
      _readStdin(c)
    }
    if (data) {
      data = data.toString().replace(' \r', '\n')
      process.stdout.write(data)
    }
  }
}

function _readStdin (c) {
  let stdin = process.stdin
  stdin.setEncoding('utf8')
  if (stdin.unref) stdin.unref()
  if (tty.isatty(0)) {
    stdin.setRawMode(true)
    stdin.pipe(c)
    let sigints = []
    stdin.on('data', function (c) {
      if (c === '\u0003') sigints.push(new Date())
      sigints = sigints.filter(d => d > new Date() - 1000)
      if (sigints.length >= 4) {
        cli.error('forcing dyno disconnect')
        process.exit(1)
      }
    })
  } else {
    stdin.pipe(new stream.Transform({
      objectMode: true,
      transform: (chunk, _, next) => c.write(chunk, next),
      flush: done => c.write('\x04', done)
    }))
  }
}


module.exports = {
  connect,
  scp
}
