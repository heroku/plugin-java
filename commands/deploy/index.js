module.exports = function index(pkg) {
  return {
    topic: pkg.topic,
    description: pkg.description,
    run: showVersion
  };

  function showVersion(context) {
    cli.warn('We deprecated this command. For more information about deploying Java apps with Heroku, see https://devcenter.heroku.com/articles/deploying-jar-and-war-files.')
    console.log(pkg.version);
  }
}
