docker run \
    -v /$PWD/scripts:/scripts \
    -p 8545:8545 \
    -p 30303:30303 \
    ethereum/client-go:latest \
    --rpc \
    --rpcaddr '0.0.0.0' \
    --rpcport 8545 \
    --rpccorsdomain '*' \
    --nodiscover \
    --dev \
    --dev.period 1 \
    --targetgaslimit '9000000' \
    js ./scripts/geth-accounts.js \
    > /dev/null &
