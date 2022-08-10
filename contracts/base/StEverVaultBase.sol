pragma ever-solidity >=0.62.0;


import "./StEverVaultStorage.sol";
import "../interfaces/IStEverVault.sol";
import "../StEverAccount.sol";
import "../Platform.sol";
import "../utils/ErrorCodes.sol";
import "../utils/Gas.sol";

import "broxus-ton-tokens-contracts/contracts/interfaces/ITokenRoot.sol";
import "@broxus/contracts/contracts/libraries/MsgFlag.sol";

abstract contract StEverVaultBase is StEverVaultStorage {
    //modifiers
    modifier onlyGovernanceAndAccept() {
        require(msg.pubkey() == governance,ErrorCodes.NOT_GOVERNANCE);
        tvm.accept();
        _;
    }

    modifier onlyGovernanceOrSelfAndAccept() {
        require(msg.pubkey() == governance || msg.sender == address(this),ErrorCodes.NOT_GOVERNANCE);
        tvm.accept();
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    modifier onlyAccount(address _user) {
        address account = getAccountAddress(_user);
        require(msg.sender == account,ErrorCodes.NOT_USER_DATA);
        _;
    }

    modifier onlyStrategy() {
        require(strategies.exists(msg.sender), ErrorCodes.STRATEGY_NOT_EXISTS);
        _;
    }

    modifier minCallValue() {
        require(msg.value >= StEverVaultGas.MIN_CALL_MSG_VALUE, ErrorCodes.LOW_MSG_VALUE);
        _;
    }

    // init
    function initVault(address _stTokenRoot) override external onlyOwner {
        stTokenRoot = _stTokenRoot;
        ITokenRoot(stTokenRoot).deployWallet{
			value: StEverVaultGas.ST_EVER_WALLET_DEPLOY_VALUE,
			callback: StEverVaultBase.receiveTokenWalletAddress,
            bounce: false
		}(address(this), StEverVaultGas.ST_EVER_WALLET_DEPLOY_GRAMS_VALUE);
    }

    function receiveTokenWalletAddress(address _wallet) external virtual {
        require (msg.sender == stTokenRoot, ErrorCodes.NOT_ROOT_WALLET);
		stEverWallet = _wallet;
	}
    // setters
    function setGainFee(uint128 _gainFee) override external onlyOwner {
        gainFee = _gainFee;
    }
    // utils
    function _reserve() internal pure returns (uint128) {
		return
			math.max(address(this).balance - msg.value, StEverVaultGas.CONTRACT_MIN_BALANCE);
	}

    function _reserveWithValue(uint128 _value) internal pure returns (uint128) {
		return math.max(address(this).balance - msg.value - _value, StEverVaultGas.CONTRACT_MIN_BALANCE);
	}

    function _reserveExceptFee(uint128 _fee) internal pure returns (uint128) {
		return math.max(address(this).balance - (msg.value - _fee), StEverVaultGas.CONTRACT_MIN_BALANCE);
	}

    function encodeDepositPayload(address _deposit_owner, uint64 _nonce) external override pure returns (TvmCell deposit_payload) {
        TvmBuilder builder;
        builder.store(_deposit_owner);
        builder.store(_nonce);
        return builder.toCell();
    }

    function decodeDepositPayload(TvmCell _payload) public virtual view returns (address deposit_owner, uint64 nonce, bool correct) {
        // check if payload assembled correctly
        TvmSlice slice = _payload.toSlice();
        // 1 address and 1 cell
        if (!slice.hasNBitsAndRefs(267 + 32, 0)) {
            return (address.makeAddrNone(), 0, false);
        }

        deposit_owner = slice.decode(address);
        nonce = slice.decode(uint64);

        return (deposit_owner, nonce, true);
    }
        // when the user deposits we should calculate the amount of stEver to send
    function getDepositStEverAmount(uint128 _amount) public view returns(uint128) {
        if(stEverSupply == 0 || totalAssets == 0) {
            return _amount;
        }
        return _amount * stEverSupply / totalAssets;
    }
        // when the user withdraw we should calculate the amount of ever to send
    function getWithdrawEverAmount(uint128 _amount) public view returns(uint128) {
        if(stEverSupply == 0 || totalAssets == 0) {
            return _amount;
        }
        return math.muldiv(_amount,totalAssets,stEverSupply);
    }

    // account utils
    function _buildAccountParams(address _user) internal virtual view returns (TvmCell) {
        TvmBuilder builder;
        builder.store(_user);
        return builder.toCell();
    }

    function _buildInitAccount(TvmCell _initialData)
		internal
		view
		virtual
		returns (TvmCell)
	{
		return
			tvm.buildStateInit({
				contr: Platform,
				varInit: {
					root: address(this),
                    platformType: 0,
                    initialData: _initialData,
                    platformCode: platformCode
				},
				pubkey: 0,
				code: platformCode
			});
	}

    function deployAccount(address _user)
		internal
		virtual
		returns (address)
	{
        TvmBuilder constructor_params;
        constructor_params.store(accountVersion);
        constructor_params.store(accountVersion);
        return new Platform{
            stateInit: _buildInitAccount(_buildAccountParams(_user)),
            value: StEverVaultGas.USER_DATA_DEPLOY_VALUE
        }(accountCode, constructor_params.toCell(), _user);
	}

    function getAccountAddress(address _user)
		public
		view
		virtual
		responsible
		returns (address)
	{
		return
			{value: 0, flag: MsgFlag.REMAINING_GAS, bounce: false} address(
				tvm.hash(_buildInitAccount(_buildAccountParams(_user)))
			);
	}

    function getDetails() override external responsible view returns(Details) {
        // TODO: add all variables
        return {value:0, bounce: false, flag: MsgFlag.REMAINING_GAS} Details(
                stTokenRoot,
                stEverWallet,
                stEverSupply,
                totalAssets,
                availableAssets,
                owner
            );
    }
}