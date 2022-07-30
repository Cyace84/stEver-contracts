const sampleAbi = {"ABIversion":2,"version":"2.2","header":["pubkey","time","expire"],"functions":[{"name":"constructor","inputs":[{"name":"_state","type":"uint256"}],"outputs":[]},{"name":"setState","inputs":[{"name":"_state","type":"uint256"}],"outputs":[]},{"name":"getDetails","inputs":[],"outputs":[{"name":"_state","type":"uint256"}]}],"data":[{"key":1,"name":"_nonce","type":"uint16"}],"events":[{"name":"StateChange","inputs":[{"name":"_state","type":"uint256"}],"outputs":[]}],"fields":[{"name":"_pubkey","type":"uint256"},{"name":"_timestamp","type":"uint64"},{"name":"_constructorFlag","type":"bool"},{"name":"_nonce","type":"uint16"},{"name":"state","type":"uint256"}]} as const
const strategyBaseAbi = {"ABIversion":2,"version":"2.2","header":["time","expire"],"functions":[{"name":"constructor","inputs":[{"name":"_vault","type":"address"},{"name":"_dePool","type":"address"}],"outputs":[]},{"name":"getDetails","inputs":[{"name":"answerId","type":"uint32"}],"outputs":[{"components":[{"name":"vault","type":"address"},{"name":"isActive","type":"bool"},{"name":"delegatedAssets","type":"uint256"},{"name":"totalAssets","type":"uint256"}],"name":"value0","type":"tuple"}]},{"name":"deposit","inputs":[{"name":"amount","type":"uint64"}],"outputs":[]},{"name":"withdraw","inputs":[{"name":"amount","type":"uint64"}],"outputs":[]},{"name":"receiveFromStrategy","inputs":[{"name":"amount","type":"uint64"}],"outputs":[]},{"name":"sendToStrategy","inputs":[{"name":"strategy","type":"address"},{"name":"amount","type":"uint64"}],"outputs":[]},{"name":"onRoundComplete","inputs":[{"name":"roundId","type":"uint64"},{"name":"reward","type":"uint64"},{"name":"ordinaryStake","type":"uint64"},{"name":"vestingStake","type":"uint64"},{"name":"lockStake","type":"uint64"},{"name":"reinvest","type":"bool"},{"name":"reason","type":"uint8"}],"outputs":[]},{"name":"receiveAnswer","inputs":[{"name":"errcode","type":"uint32"},{"name":"comment","type":"uint64"}],"outputs":[]},{"name":"onTransfer","inputs":[{"name":"source","type":"address"},{"name":"amount","type":"uint128"}],"outputs":[]}],"data":[],"events":[{"name":"Deposit","inputs":[{"name":"amount","type":"uint256"}],"outputs":[]},{"name":"Withdraw","inputs":[{"name":"amount","type":"uint256"}],"outputs":[]}],"fields":[{"name":"_pubkey","type":"uint256"},{"name":"_timestamp","type":"uint64"},{"name":"_constructorFlag","type":"bool"},{"name":"vault","type":"address"},{"name":"dePool","type":"address"}]} as const
const tokenRootAbi = {"ABIversion":2,"version":"2.2","header":["pubkey","time","expire"],"functions":[{"name":"constructor","inputs":[{"name":"initialSupplyTo","type":"address"},{"name":"initialSupply","type":"uint128"},{"name":"deployWalletValue","type":"uint128"},{"name":"mintDisabled","type":"bool"},{"name":"burnByRootDisabled","type":"bool"},{"name":"burnPaused","type":"bool"},{"name":"remainingGasTo","type":"address"}],"outputs":[]},{"name":"supportsInterface","inputs":[{"name":"answerId","type":"uint32"},{"name":"interfaceID","type":"uint32"}],"outputs":[{"name":"value0","type":"bool"}]},{"name":"disableMint","inputs":[{"name":"answerId","type":"uint32"}],"outputs":[{"name":"value0","type":"bool"}]},{"name":"mintDisabled","inputs":[{"name":"answerId","type":"uint32"}],"outputs":[{"name":"value0","type":"bool"}]},{"name":"burnTokens","inputs":[{"name":"amount","type":"uint128"},{"name":"walletOwner","type":"address"},{"name":"remainingGasTo","type":"address"},{"name":"callbackTo","type":"address"},{"name":"payload","type":"cell"}],"outputs":[]},{"name":"disableBurnByRoot","inputs":[{"name":"answerId","type":"uint32"}],"outputs":[{"name":"value0","type":"bool"}]},{"name":"burnByRootDisabled","inputs":[{"name":"answerId","type":"uint32"}],"outputs":[{"name":"value0","type":"bool"}]},{"name":"burnPaused","inputs":[{"name":"answerId","type":"uint32"}],"outputs":[{"name":"value0","type":"bool"}]},{"name":"setBurnPaused","inputs":[{"name":"answerId","type":"uint32"},{"name":"paused","type":"bool"}],"outputs":[{"name":"value0","type":"bool"}]},{"name":"transferOwnership","inputs":[{"name":"newOwner","type":"address"},{"name":"remainingGasTo","type":"address"},{"components":[{"name":"value","type":"uint128"},{"name":"payload","type":"cell"}],"name":"callbacks","type":"map(address,tuple)"}],"outputs":[]},{"name":"name","inputs":[{"name":"answerId","type":"uint32"}],"outputs":[{"name":"value0","type":"string"}]},{"name":"symbol","inputs":[{"name":"answerId","type":"uint32"}],"outputs":[{"name":"value0","type":"string"}]},{"name":"decimals","inputs":[{"name":"answerId","type":"uint32"}],"outputs":[{"name":"value0","type":"uint8"}]},{"name":"totalSupply","inputs":[{"name":"answerId","type":"uint32"}],"outputs":[{"name":"value0","type":"uint128"}]},{"name":"walletCode","inputs":[{"name":"answerId","type":"uint32"}],"outputs":[{"name":"value0","type":"cell"}]},{"name":"rootOwner","inputs":[{"name":"answerId","type":"uint32"}],"outputs":[{"name":"value0","type":"address"}]},{"name":"walletOf","inputs":[{"name":"answerId","type":"uint32"},{"name":"walletOwner","type":"address"}],"outputs":[{"name":"value0","type":"address"}]},{"name":"deployWallet","inputs":[{"name":"answerId","type":"uint32"},{"name":"walletOwner","type":"address"},{"name":"deployWalletValue","type":"uint128"}],"outputs":[{"name":"tokenWallet","type":"address"}]},{"name":"mint","inputs":[{"name":"amount","type":"uint128"},{"name":"recipient","type":"address"},{"name":"deployWalletValue","type":"uint128"},{"name":"remainingGasTo","type":"address"},{"name":"notify","type":"bool"},{"name":"payload","type":"cell"}],"outputs":[]},{"name":"acceptBurn","id":"0x192B51B1","inputs":[{"name":"amount","type":"uint128"},{"name":"walletOwner","type":"address"},{"name":"remainingGasTo","type":"address"},{"name":"callbackTo","type":"address"},{"name":"payload","type":"cell"}],"outputs":[]},{"name":"sendSurplusGas","inputs":[{"name":"to","type":"address"}],"outputs":[]}],"data":[{"key":1,"name":"name_","type":"string"},{"key":2,"name":"symbol_","type":"string"},{"key":3,"name":"decimals_","type":"uint8"},{"key":4,"name":"rootOwner_","type":"address"},{"key":5,"name":"walletCode_","type":"cell"},{"key":6,"name":"randomNonce_","type":"uint256"},{"key":7,"name":"deployer_","type":"address"}],"events":[],"fields":[{"name":"_pubkey","type":"uint256"},{"name":"_timestamp","type":"uint64"},{"name":"_constructorFlag","type":"bool"},{"name":"name_","type":"string"},{"name":"symbol_","type":"string"},{"name":"decimals_","type":"uint8"},{"name":"rootOwner_","type":"address"},{"name":"walletCode_","type":"cell"},{"name":"totalSupply_","type":"uint128"},{"name":"burnPaused_","type":"bool"},{"name":"burnByRootDisabled_","type":"bool"},{"name":"mintDisabled_","type":"bool"},{"name":"randomNonce_","type":"uint256"},{"name":"deployer_","type":"address"}]} as const
const tokenWalletAbi = {"ABIversion":2,"version":"2.2","header":["pubkey","time","expire"],"functions":[{"name":"constructor","inputs":[],"outputs":[]},{"name":"supportsInterface","inputs":[{"name":"answerId","type":"uint32"},{"name":"interfaceID","type":"uint32"}],"outputs":[{"name":"value0","type":"bool"}]},{"name":"destroy","inputs":[{"name":"remainingGasTo","type":"address"}],"outputs":[]},{"name":"burnByRoot","inputs":[{"name":"amount","type":"uint128"},{"name":"remainingGasTo","type":"address"},{"name":"callbackTo","type":"address"},{"name":"payload","type":"cell"}],"outputs":[]},{"name":"burn","inputs":[{"name":"amount","type":"uint128"},{"name":"remainingGasTo","type":"address"},{"name":"callbackTo","type":"address"},{"name":"payload","type":"cell"}],"outputs":[]},{"name":"balance","inputs":[{"name":"answerId","type":"uint32"}],"outputs":[{"name":"value0","type":"uint128"}]},{"name":"owner","inputs":[{"name":"answerId","type":"uint32"}],"outputs":[{"name":"value0","type":"address"}]},{"name":"root","inputs":[{"name":"answerId","type":"uint32"}],"outputs":[{"name":"value0","type":"address"}]},{"name":"walletCode","inputs":[{"name":"answerId","type":"uint32"}],"outputs":[{"name":"value0","type":"cell"}]},{"name":"transfer","inputs":[{"name":"amount","type":"uint128"},{"name":"recipient","type":"address"},{"name":"deployWalletValue","type":"uint128"},{"name":"remainingGasTo","type":"address"},{"name":"notify","type":"bool"},{"name":"payload","type":"cell"}],"outputs":[]},{"name":"transferToWallet","inputs":[{"name":"amount","type":"uint128"},{"name":"recipientTokenWallet","type":"address"},{"name":"remainingGasTo","type":"address"},{"name":"notify","type":"bool"},{"name":"payload","type":"cell"}],"outputs":[]},{"name":"acceptTransfer","id":"0x67A0B95F","inputs":[{"name":"amount","type":"uint128"},{"name":"sender","type":"address"},{"name":"remainingGasTo","type":"address"},{"name":"notify","type":"bool"},{"name":"payload","type":"cell"}],"outputs":[]},{"name":"acceptMint","id":"0x4384F298","inputs":[{"name":"amount","type":"uint128"},{"name":"remainingGasTo","type":"address"},{"name":"notify","type":"bool"},{"name":"payload","type":"cell"}],"outputs":[]},{"name":"sendSurplusGas","inputs":[{"name":"to","type":"address"}],"outputs":[]}],"data":[{"key":1,"name":"root_","type":"address"},{"key":2,"name":"owner_","type":"address"}],"events":[],"fields":[{"name":"_pubkey","type":"uint256"},{"name":"_timestamp","type":"uint64"},{"name":"_constructorFlag","type":"bool"},{"name":"root_","type":"address"},{"name":"owner_","type":"address"},{"name":"balance_","type":"uint128"}]} as const
const vaultAbi = {"ABIversion":2,"version":"2.2","header":["time","expire"],"functions":[{"name":"constructor","inputs":[{"name":"_owner","type":"address"},{"name":"_withdrawUserDataCode","type":"cell"}],"outputs":[]},{"name":"initVault","inputs":[{"name":"_stTokenRoot","type":"address"}],"outputs":[]},{"name":"getWithdrawUserDataAddress","inputs":[{"name":"answerId","type":"uint32"},{"name":"user","type":"address"}],"outputs":[{"name":"value0","type":"address"}]},{"name":"receiveTokenWalletAddress","inputs":[{"name":"wallet","type":"address"}],"outputs":[]},{"name":"getDetails","inputs":[{"name":"answerId","type":"uint32"}],"outputs":[{"components":[{"name":"stEverRoot","type":"address"},{"name":"stEverWallet","type":"address"},{"name":"stEverSupply","type":"uint128"},{"name":"everBalance","type":"uint128"},{"name":"owner","type":"address"}],"name":"value0","type":"tuple"}]},{"name":"addStrategy","inputs":[{"name":"_strategy","type":"address"}],"outputs":[]},{"name":"deposit","inputs":[{"name":"_amount","type":"uint128"},{"name":"_nonce","type":"uint64"}],"outputs":[]},{"name":"onRunBalancer","inputs":[{"components":[{"name":"strategy","type":"address"},{"name":"deposit","type":"uint128"},{"name":"withdraw","type":"uint128"}],"name":"balancerConfig","type":"tuple[]"}],"outputs":[]},{"name":"withdraw","inputs":[{"name":"_amount","type":"uint128"}],"outputs":[]},{"name":"processWithdrawFromStrategies","inputs":[{"components":[{"name":"strategy","type":"address"},{"name":"amount","type":"uint128"}],"name":"withdrawConfig","type":"tuple[]"}],"outputs":[]},{"name":"strategyReport","inputs":[{"name":"gain","type":"uint128"},{"name":"loss","type":"uint128"},{"name":"totalAssets","type":"uint128"}],"outputs":[]},{"name":"onAcceptTokensBurn","inputs":[{"name":"amount","type":"uint128"},{"name":"walletOwner","type":"address"},{"name":"wallet","type":"address"},{"name":"remainingGasTo","type":"address"},{"name":"payload","type":"cell"}],"outputs":[]},{"name":"processSendToUser","inputs":[{"components":[{"name":"user","type":"address"},{"name":"nonces","type":"uint64[]"}],"name":"sendConfig","type":"tuple[]"}],"outputs":[]},{"name":"withdrawToUser","inputs":[{"name":"amount","type":"uint128"},{"name":"user","type":"address"},{"components":[{"name":"amount","type":"uint128"},{"name":"nonce","type":"uint64"}],"name":"withdrawDump","type":"tuple[]"}],"outputs":[]},{"name":"onPendingWithdrawAccepted","inputs":[{"name":"_nonce","type":"uint64"},{"name":"user","type":"address"}],"outputs":[]},{"name":"encodeDepositPayload","inputs":[{"name":"deposit_owner","type":"address"},{"name":"_nonce","type":"uint64"}],"outputs":[{"name":"deposit_payload","type":"cell"}]},{"name":"decodeDepositPayload","inputs":[{"name":"payload","type":"cell"}],"outputs":[{"name":"deposit_owner","type":"address"},{"name":"nonce","type":"uint64"},{"name":"correct","type":"bool"}]},{"name":"onAcceptTokensTransfer","inputs":[{"name":"_tokenRoot","type":"address"},{"name":"_amount","type":"uint128"},{"name":"_sender","type":"address"},{"name":"_senderWallet","type":"address"},{"name":"_remainingGasTo","type":"address"},{"name":"_payload","type":"cell"}],"outputs":[]},{"name":"nonce","inputs":[],"outputs":[{"name":"nonce","type":"uint128"}]},{"name":"withdrawUserDataCode","inputs":[],"outputs":[{"name":"withdrawUserDataCode","type":"cell"}]}],"data":[{"key":1,"name":"nonce","type":"uint128"},{"key":2,"name":"governance","type":"address"}],"events":[{"name":"StrategyAdded","inputs":[{"name":"strategy","type":"address"}],"outputs":[]},{"name":"StrategyReported","inputs":[{"name":"strategy","type":"address"},{"components":[{"name":"gain","type":"uint128"},{"name":"loss","type":"uint128"},{"name":"totalAssets","type":"uint128"}],"name":"report","type":"tuple"}],"outputs":[]},{"name":"Deposit","inputs":[{"name":"user","type":"address"},{"name":"depositAmount","type":"uint128"},{"name":"receivedStEvers","type":"uint128"}],"outputs":[]},{"name":"WithdrawRequest","inputs":[{"name":"user","type":"address"},{"name":"amount","type":"uint128"},{"name":"nonce","type":"uint64"}],"outputs":[]},{"name":"WithdrawSuccess","inputs":[{"name":"user","type":"address"},{"name":"amount","type":"uint128"}],"outputs":[]}],"fields":[{"name":"_pubkey","type":"uint256"},{"name":"_timestamp","type":"uint64"},{"name":"_constructorFlag","type":"bool"},{"name":"nonce","type":"uint128"},{"name":"governance","type":"address"},{"name":"stEverSupply","type":"uint128"},{"name":"everBalance","type":"uint128"},{"name":"stEverWallet","type":"address"},{"name":"stTokenRoot","type":"address"},{"name":"owner","type":"address"},{"name":"withdrawUserDataCode","type":"cell"},{"components":[{"name":"lastReport","type":"uint128"},{"name":"totalGain","type":"uint128"},{"name":"totalAssets","type":"uint128"}],"name":"strategies","type":"map(address,tuple)"},{"components":[{"name":"amount","type":"uint128"},{"name":"user","type":"address"}],"name":"pendingWithdrawMap","type":"map(uint64,tuple)"}]} as const
const walletAbi = {"ABIversion":2,"version":"2.2","header":["pubkey","time","expire"],"functions":[{"name":"sendTransaction","inputs":[{"name":"dest","type":"address"},{"name":"value","type":"uint128"},{"name":"bounce","type":"bool"},{"name":"flags","type":"uint8"},{"name":"payload","type":"cell"}],"outputs":[]},{"name":"transferOwnership","inputs":[{"name":"newOwner","type":"uint256"}],"outputs":[]},{"name":"constructor","inputs":[],"outputs":[]},{"name":"owner","inputs":[],"outputs":[{"name":"owner","type":"uint256"}]},{"name":"_randomNonce","inputs":[],"outputs":[{"name":"_randomNonce","type":"uint256"}]}],"data":[{"key":1,"name":"_randomNonce","type":"uint256"}],"events":[{"name":"OwnershipTransferred","inputs":[{"name":"previousOwner","type":"uint256"},{"name":"newOwner","type":"uint256"}],"outputs":[]}],"fields":[{"name":"_pubkey","type":"uint256"},{"name":"_timestamp","type":"uint64"},{"name":"_constructorFlag","type":"bool"},{"name":"owner","type":"uint256"},{"name":"_randomNonce","type":"uint256"}]} as const
const withdrawUserDataAbi = {"ABIversion":2,"version":"2.2","header":["time","expire"],"functions":[{"name":"constructor","inputs":[],"outputs":[]},{"name":"getDetails","inputs":[{"name":"answerId","type":"uint32"}],"outputs":[{"components":[{"name":"pendingReturnedTokens","type":"uint128"},{"name":"pendingReceiveEver","type":"uint128"},{"name":"user","type":"address"}],"name":"value0","type":"tuple"}]},{"name":"addPendingValue","inputs":[{"name":"_nonce","type":"uint64"},{"name":"_amount","type":"uint128"}],"outputs":[]},{"name":"receiveFromVault","inputs":[{"name":"amount","type":"uint128"}],"outputs":[]},{"name":"processWithdraw","inputs":[{"name":"_satisfiedWithdrawRequests","type":"uint64[]"}],"outputs":[]},{"name":"finishWithdraw","inputs":[{"name":"_satisfiedWithdrawRequests","type":"uint64[]"},{"name":"everAmount","type":"uint128"},{"name":"send_gas_to","type":"address"}],"outputs":[]},{"name":"withdrawUserDataCode","inputs":[],"outputs":[{"name":"withdrawUserDataCode","type":"cell"}]}],"data":[{"key":1,"name":"vault","type":"address"},{"key":2,"name":"user","type":"address"},{"key":3,"name":"withdrawUserDataCode","type":"cell"}],"events":[{"name":"Receive","inputs":[{"name":"amount","type":"uint128"}],"outputs":[]}],"fields":[{"name":"_pubkey","type":"uint256"},{"name":"_timestamp","type":"uint64"},{"name":"_constructorFlag","type":"bool"},{"name":"vault","type":"address"},{"name":"user","type":"address"},{"name":"withdrawUserDataCode","type":"cell"},{"name":"pendingReturnedTokens","type":"uint128"},{"name":"pendingReceiveEver","type":"uint128"},{"components":[{"name":"amount","type":"uint128"}],"name":"withdrawRequests","type":"map(uint64,tuple)"}]} as const

export const factorySource = {
    Sample: sampleAbi,
    StrategyBase: strategyBaseAbi,
    TokenRoot: tokenRootAbi,
    TokenWallet: tokenWalletAbi,
    Vault: vaultAbi,
    Wallet: walletAbi,
    WithdrawUserData: withdrawUserDataAbi
} as const

export type FactorySource = typeof factorySource
export type SampleAbi = typeof sampleAbi
export type StrategyBaseAbi = typeof strategyBaseAbi
export type TokenRootAbi = typeof tokenRootAbi
export type TokenWalletAbi = typeof tokenWalletAbi
export type VaultAbi = typeof vaultAbi
export type WalletAbi = typeof walletAbi
export type WithdrawUserDataAbi = typeof withdrawUserDataAbi
