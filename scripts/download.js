const fs = require('fs');
const fetch = require('node-fetch');
const crypto = require('crypto');

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


const version = require('../package.json')['heroku-deploy'].version;
const file = `lib/heroku-deploy-complete.jar`;
const url = `http://repo1.maven.apache.org/maven2/com/heroku/sdk/heroku-deploy-complete/${version}/heroku-deploy-complete-${version}.jar`;
const sha = '42b710f3db0d437c825ca4321778b7a7e7f185b2'

console.log(`Downloading ${file} from ${url}`)
download(url, file, () => {
  checkSha(file, sha)
  fs.chmodSync(file, 0o765);
});
