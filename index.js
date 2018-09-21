'use strict';
exports.topic = {
  name: 'java',
  description: 'Client tools for Java on Heroku'
};

exports.commands = [
  require('./commands/jconsole.js')('java', 'jconsole'),
  require('./commands/jvisualvm.js')('java', 'visualvm'),
  require('./commands/jstack.js')('java', 'jstack'),
  require('./commands/jmap.js')('java', 'jmap'),
  require('./commands/deploy/war')('deploy', 'war'),
  require('./commands/deploy/jar')('deploy', 'jar'),
  require('./commands/deploy/war')('war', 'deploy'),
  require('./commands/deploy/jar')('jar', 'deploy'),
  require('./commands/war/run')('war', 'run')
];
