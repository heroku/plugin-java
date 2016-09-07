'use strict';

const assert = require('chai').assert;
const compareSync = require('dir-compare').compareSync;
const path = require('path');
const fs = require('fs-extra');
const child = require('child_process');
const os = require('os');
const Heroku = require('heroku-client');
const heroku = new Heroku({ token: apiKey });
const expect = require('unexpected');
const sleep = require('sleep');

const ssh = commands.find((c) => c.topic === 'tunnels' && c.command === 'ssh')

describe('ssh', function() {
  this.timeout(0);
  // this.app = {};

  beforeEach(() => {
    cli.mockConsole();
    cli.exit.mock();
  });

  beforeEach(function() {
    return heroku.post('/apps').then((app) => {
      this.app = app;
      console.log(`Created ${ this.app.name }`);
    });
  });

  afterEach(function() {
    return heroku.delete(`/apps/${ this.app.name }`).then(() => {
      console.log(`Deleted ${ this.app.name }`);
    });
  });

  describe('with add-on created', function() {
    beforeEach(function() {
      return heroku.request({
        path: `/apps/${this.app.name}/addons`,
        method: 'POST',
        body: { "plan": "tunnels" }
      }).then(() => {
        console.log(`Created tunnels add-on for ${this.app.name}...`)
      });
    });

    describe('with one-off dyno', function() {
      beforeEach(function() {
        return heroku.request({
          path: `/apps/${this.app.name}/dynos`,
          method: 'POST',
          body: {
          "attach": false,
          "command": "curl -sSL $TUNNELS_URL | bash -s $DYNO; while true; do sleep 1; done",
          "size": "free",
          "type": "run",
          "time_to_live": 120
        }}).then((response) => {
          this.dyno = response
          console.log(`Started ${this.dyno.name}`)
        });
      })

      describe('after tunnel has started', function() {
        beforeEach(function() {
          console.log('Waiting for the tunnel...');
          sleep.sleep(8)
        });

        it('prints the working dir', function() {
          let config = {
            debug: true,
            auth: {password: apiKey},
            args: [ 'pwd' ],
            flags: { dyno: this.dyno.name },
            app: this.app.name
          };

          console.log(`Running tunnels:ssh on ${this.app.name} ${this.dyno.name}...`);
          return ssh.run(config)
            .then(() => expect(cli.stderr, 'to contain', 'Establishing credentials...'))
            .then(() => expect(cli.stderr, 'to contain', `Connecting to ${this.dyno.name} on ${this.app.name}...`))
            .then(() => expect(cli.stdout, 'to contain', '/app'))
        });
      });
    });
  });
});
