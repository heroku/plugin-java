'use strict';
exports.topic = {
  name: 'ps',
  description: 'Client tools for the Heroku-Exec add-on'
};

exports.commands = [
  require('./commands/jconsole.js')('java', 'jconsole'),
  require('./commands/jstack.js')('java', 'jstack'),
  require('./commands/jmap.js')('java', 'jmap'),

  topics = ['ps', 'dyno']
  for (var i = 0, i < topics.length ; i++) {
    require('./commands/ssh.js')(topics[i], 'exec'),
    require('./commands/socks.js')(topics[i], 'socks'),
    require('./commands/status.js')(topics[i], 'status'),
    require('./commands/port.js')(topics[i], 'forward'),
    require('./commands/copy.js')(topics[i], 'copy')
  }
];
