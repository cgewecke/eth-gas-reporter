#!/usr/bin/env bash

set -o errexit

if [ "$TEST" = "integration" ]; then

  npm test

elif [ "$TEST" = "geth" ]; then

  source ./scripts/geth.sh
  launch_geth
  npm test
  docker stop geth-client

elif [ "$TEST" = "colony" ]; then

  npm install -g yarn
  git clone https://github.com/JoinColony/colonyNetwork.git
  cd colonyNetwork || exit
  yarn
  yarn remove -W eth-gas-reporter --dev
  yarn add -W https://github.com/cgewecke/eth-gas-reporter.git#$TRAVIS_PULL_REQUEST_BRANCH
  git submodule update --init
  yarn run provision:token:contracts
  yarn run test:contracts:gasCosts

fi
