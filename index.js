'use strict';
exports.topics = [
  { name: 'java', description: 'Client tools for Java on Heroku' },
  { name: 'deploy', description: 'Deploy WAR and JAR files' },
  { name: 'war', description: 'Manage WAR files' },
  { name: 'jar', description: 'Manage JAR files' }
];

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
