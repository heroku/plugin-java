'use strict';
exports.topic = {
  name: 'tunnels',
  description: 'Client tools for the Tunnels add-on'
};

exports.commands = [
  require('./commands/jconsole.js'),
  require('./commands/ssh.js'),
  require('./commands/open.js'),
  require('./commands/socks.js'),
  require('./commands/status.js'),
  require('./commands/jstack.js')
];
