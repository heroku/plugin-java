#!/bin/bash

assert_equal() {
  local a=${1}
  local b=${2}
  if [ "$a" != "$b" ]; then
    echo "\nFAILED: expected ${a}, found ${b}"
    exit 1
  fi
}

assert_contains() {
  local a=${1}
  local b=${2}
  if echo "$b" | grep -qi "$a"; then
    :
  else
    echo "\nFAILED: expected ${a} to match ${b}"
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

trap "{ echo ''; echo 'Cleaning up...'; heroku destroy ${app} --confirm ${app}; popd > /dev/null 2>&1; rm -rf /tmp/${app}; }" EXIT

echo "Creating addon..."
heroku addons:create tunnels

echo "Setting buildpack..."
heroku buildpacks:set https://github.com/tunnels-addon/buildpack

assert_contains "No tunnels running!" "$(heroku tunnels:status 2>&1 >/dev/null)"

output="$(heroku tunnels:ssh "pwd" 2>&1 >/dev/null)"
assert_contains "Establishing credentials" "$output"
assert_contains "Could not connect to dyno!" "$output"

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

output="$(heroku tunnels:status)"
assert_contains "web.1" "$output"
assert_contains "running" "$output"
assert_contains "up" "$output"

heroku ps:scale web=0
heroku run:detached "curl -sSL \$TUNNELS_URL | bash -s \$DYNO; echo 'class A{public static void main(String[] a) throws Exception{while(true){Thread.sleep(1000);}}}' > A.java; javac A.java; java A"
dyno="$(heroku ps --json | jq .[0].name -r)"

# status="null"
# while [ "$status" != "up" ]; do
#   status="$(heroku ps --json | jq .[0].status -r)"
# end

sleep 5

heroku logs -d $dyno

assert_contains "run." "$dyno"
dump="$(heroku tunnels:jstack --dyno $dyno)"

assert_contains "GC task thread" "$dump"

dump="$(heroku tunnels:jmap --dyno $dyno)"

assert_contains "#instances" "$dump"
assert_contains "java.lang.String" "$dump"
assert_contains "Total" "$dump"

echo ""
echo "SUCCESS: All tests passed!"
