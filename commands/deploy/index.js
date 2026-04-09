module.exports = function index(pkg) {
  return {
    topic: pkg.topic,
    description: pkg.description,
    run: showVersion
  };

  function showVersion(context) {
    cli.warn('This command is deprecated. For information about deploying Java applications with Heroku, refer to https://devcenter.heroku.com/articles/deploying-jar-and-war-files.')
    console.log(pkg.version);
  }
}
