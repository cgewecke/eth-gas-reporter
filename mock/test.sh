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
  node_modules/.bin/testrpc "${accounts[@]}" > /dev/null &
  testrpc_pid=$!
}

if testrpc_running; then
  echo "Using existing testrpc instance"
else
  echo "Starting our own testrpc instance"
  start_testrpc
fi

cp index.js mock/node_modules/eth-gas-reporter/index.js 
cd mock
./node_modules/.bin/truffle test --network development "$@"
