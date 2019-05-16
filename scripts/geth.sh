
function launch_geth {
    # Get client
    docker pull ethereum/client-go:latest

    # Launch client (silently)
    docker run \
        -d \
        -p 8545:8545 \
        -p 30303:30303 \
        --name geth-client \
        --rm \
        ethereum/client-go:latest \
        --rpc \
        --rpcaddr '0.0.0.0' \
        --rpcport 8545 \
        --rpccorsdomain '*' \
        --rpcapi personal,web3,eth,net \
        --nodiscover \
        --allow-insecure-unlock \
        --dev \
        --dev.period 0 \
        --targetgaslimit '8000000' \
        > /dev/null &


    # Configure client
    npx geth-dev-assistant \
        --accounts 4 \
        --balance 100 \
        --gasLimit 8000000
}
