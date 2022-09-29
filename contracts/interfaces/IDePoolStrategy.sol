pragma ever-solidity >=0.62.0;
pragma AbiHeader expire;

interface IDePoolStrategy {
    struct Details {
        address vault;
        address dePool;
        uint32 strategyVersion;
    }
    function getDetails() external responsible view returns(Details);

}
