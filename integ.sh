#!/bin/bash

assert_equal() {
  local a=${1}
  local b=${2}
  if [ "$a" != "$b" ]; then
    echo "FAILED: expected ${a}, found ${b}"
    exit 1
  fi
}

set -e

heroku plugins:link .

app="tunnels-test-$RANDOM"
echo "Creating test app ${app}..."
pushd . > /dev/null 2>&1
cd /tmp
mkdir ${app}
cd ${app}
git init
web="ruby -rwebrick -e\"s=WEBrick::HTTPServer.new(:BindAddress => '0.0.0.0', :Port => \$PORT, :DocumentRoot => Dir.pwd); s.mount_proc('/'){|q,r| r.body='Hello'}; s.start\""
echo "web: ${web}" > Procfile
heroku create ${app}
git add Procfile
git commit -m "first"

echo "Creating addon..."
heroku addons:create tunnels

echo "Setting buildpack..."
heroku buildpacks:set https://github.com/jkutner/heroku-buildpack-tunnels

echo "Deploying..."
git push heroku master

state="starting"
while [ "up" != "$state" ]; do
  if [ "starting" != "$state" ]; then
    echo "WARNING: dyno state is \"${state}\""
  fi
  sleep 1
  state=$(heroku ps --json | jq .[0].state -r)
done

assert_equal "/app" "$(heroku tunnels:ssh "pwd")"

popd > /dev/null 2>&1
echo "Cleaning up..."
heroku destroy ${app} --confirm ${app}
rm -rf /tmp/${app}

echo ""
echo "SUCCESS: All tests passed!"
