#!/usr/bin/env bash

# Executes cleanup function at script exit.

trap cleanup EXIT

cleanup() {
  # Kill the testrpc instance that we started (if we started one and if it's still running).
  if [ -n "$testrpc_pid" ] && ps -p $testrpc_pid > /dev/null; then
    kill -9 $testrpc_pid
  fi
}

testrpc_port=8545

testrpc_running() {
  nc -z localhost "$testrpc_port"
}

start_testrpc() {
  node_modules/.bin/ganache-cli --gasLimit 8000000 "${accounts[@]}" > /dev/null &
  testrpc_pid=$!
}

# Copy over the package and install
cp package.json mock/package.json
cd mock && npm install

# Copy over eth-gas-reporter
if [ ! -e node_modules/eth-gas-reporter ]; then
  mkdir node_modules/eth-gas-reporter
fi

cp ./../index.js node_modules/eth-gas-reporter/index.js
cp ./../gasStats.js node_modules/eth-gas-reporter/gasStats.js
cp ./../sync.js node_modules/eth-gas-reporter/sync.js
cp ./../package.json node_modules/eth-gas-reporter/package.json

# Start testrpc
if testrpc_running; then
  echo "Using existing testrpc instance"
else
  echo "Starting our own testrpc instance"
  start_testrpc
fi

# Start truffle test
echo "Visual test"
node_modules/.bin/truffle test --network development "$@"

# Run with config
echo "Visual test with config"
cp ./truffle.js ./safe_truffle.js
cp ./config-template.js ./truffle.js
node_modules/.bin/truffle test --network development "$@"
cp ./safe_truffle.js ./truffle.js
rm ./safe_truffle.js
