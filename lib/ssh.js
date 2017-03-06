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
const command = require('../lib/command.js')

function connect(context, addonHost, dynoUser, privateKey) {
  var addonPort = 80
  return new Promise((resolve, reject) => {
    var conn = new Client();
    conn.on('ready', function() {
      cli.action.done('up')
      if (context.args.length > 0) {
        let cmd = command.buildCommand(context.args)
        conn.exec(cmd, function(err, stream) {
          if (err) throw err;
          stream.on('close', function(code, signal) {
            conn.end();
            resolve();
          })
          .on('data', _readData(stream))
          .on('error', reject);
          process.once('SIGINT', () => conn.end())
        });
      } else {
        conn.shell(function(err, stream) {
          if (err) {
            return _logConnectionError(err);
          }
          stream.on('close', function() {
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
      port: addonPort,
      username: dynoUser,
      privateKey: privateKey
    });
  });
}

function scp(context, addonHost, dynoUser, privateKey, src, dest) {
  var addonPort = 80
  return new Promise((resolve, reject) => {
    var conn = new Client();
    conn.on('ready', function() {
      cli.action.done('up')
      conn.sftp(function(err, sftp) {
        if (err) {
          return _logConnectionError(err);
        }

        var sftp_readStream = sftp.createReadStream(src);
        sftp_readStream.on('error', function(err){
          if (err) {
            cli.error("ERROR: Could not transfer the file!");
            cli.error("Make sure the filename is correct.");
            conn.end();
            resolve();
          }
        });
        sftp_readStream.pipe(fs.createWriteStream(dest))
          .on('close',function(){
            conn.end();
            resolve();
          })
          .on('error', reject);
      });
    }).on('error', reject).connect({
      host: addonHost,
      port: addonPort,
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
    process.stdout.write(data)
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
