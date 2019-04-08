const fs = require('fs');
const fetch = require('node-fetch');
const crypto = require('crypto');
const herokuDeployConfig = require('../package.json')['heroku-deploy']
const version = herokuDeployConfig.version;
const file = `lib/heroku-deploy-complete.jar`;
const url = `http://repo1.maven.apache.org/maven2/com/heroku/sdk/heroku-deploy-complete/${version}/heroku-deploy-complete-${version}.jar`;
const sha = herokuDeployConfig.sha

function checkSha(file, expectedSha) {
  fs.readFile(file, function(err, data) {
    actualSha = crypto
      .createHash('sha1')
      .update(data, 'utf8')
      .digest('hex')

    if (actualSha != expectedSha) {
      throw new Error(`Unexpect checksum: ${actualSha}`)
    }
  });
}

async function download(url, file, callback) {
  const res = await fetch(url);
  await new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(file);
    res.body.pipe(fileStream);
    res.body.on("error", (err) => {
      reject(err);
    });
    fileStream.on("finish", function() {
      callback()
      resolve();
    });
  });}


console.log(`Downloading ${file} from ${url}`)
download(url, file, () => {
  checkSha(file, sha)
  fs.chmodSync(file, 0o765);
});
