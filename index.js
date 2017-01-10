'use strict';
exports.topic = {
  name: 'tunnels',
  description: 'Client tools for the Tunnels add-on'
};

exports.commands = [
  require('./commands/init.js'),
  require('./commands/jconsole.js'),
  require('./commands/ssh.js'),
  require('./commands/socks.js'),
  require('./commands/status.js'),
  require('./commands/jstack.js'),
  require('./commands/jmap.js'),
  require('./commands/port.js')
];
