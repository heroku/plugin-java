'use strict';
exports.topic = {
  name: 'tunnels',
  description: 'Client tools for the Tunnels add-on'
};

exports.commands = [
  require('./commands/jconsole.js'),
  require('./commands/ssh.js')
];
