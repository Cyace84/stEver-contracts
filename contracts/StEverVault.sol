pragma ever-solidity >=0.62.0;
pragma AbiHeader expire;
pragma AbiHeader pubkey;


import "./interfaces/IStrategy.sol";
import "./StEverAccount.sol";
import "./base/StEverVaultEmergency.sol";
import "./utils/ErrorCodes.sol";
import "./utils/Constants.sol";

import "@broxus/contracts/contracts/libraries/MsgFlag.sol";
import "broxus-ton-tokens-contracts/contracts/interfaces/ITokenRoot.sol";
import "broxus-ton-tokens-contracts/contracts/interfaces/ITokenWallet.sol";
import "broxus-ton-tokens-contracts/contracts/interfaces/IAcceptTokensBurnCallback.sol";
import "broxus-ton-tokens-contracts/contracts/interfaces/IAcceptTokensTransferCallback.sol";
import "broxus-ton-tokens-contracts/contracts/abstract/TokenWalletBurnableBase.sol";
import "locklift/src/console.sol";


contract StEverVault is StEverVaultEmergency, IAcceptTokensBurnCallback, IAcceptTokensTransferCallback {
    constructor(
        address _owner,
        uint128 _gainFee
    ) public {
        require (tvm.pubkey() != 0, ErrorCodes.WRONG_PUB_KEY);
        require (tvm.pubkey() == msg.pubkey(), ErrorCodes.WRONG_PUB_KEY);

        tvm.accept();
        owner = _owner;
        gainFee = _gainFee;
    }


    function addStrategy(address _strategy) override external onlyOwner minCallValue {
        tvm.rawReserve(_reserve(),0);

        strategies[_strategy] = StrategyParams({
            lastReport: 0,
            totalGain: 0,
            depositingAmount: 0,
            withdrawingAmount: 0
        });

        emit StrategyAdded(_strategy);

        owner.transfer({value: 0, flag: MsgFlag.ALL_NOT_RESERVED, bounce: false});
    }

    function removeStrategy(address _strategy) override external onlyOwner minCallValue {
        require (strategies.exists(_strategy));

        tvm.rawReserve(_reserve(),0);

        emit StrategyRemoved(_strategy);
        delete strategies[_strategy];

        owner.transfer({value: 0, flag: MsgFlag.ALL_NOT_RESERVED, bounce: false});
    }

    function validateDepositRequest(mapping (address => DepositConfig) _depositConfigs) override public view returns(ValidationResult[]) {
        ValidationResult[] validationResults;

        uint128 totalRequiredBalance;

        for (uint256 i = 0; !_depositConfigs.empty(); i++) {

            (address strategy, DepositConfig depositConfig) = _depositConfigs.delMin().get();

            if(!strategies.exists(strategy)) {
                validationResults.push(ValidationResult(strategy, ErrorCodes.STRATEGY_NOT_EXISTS));
            }

            if(depositConfig.amount < minStrategyDepositValue) {
                validationResults.push(ValidationResult(strategy, ErrorCodes.BAD_DEPOSIT_TO_STRATEGY_VALUE));
            }

            uint128 valueToSend = depositConfig.amount + depositConfig.fee;
            totalRequiredBalance += valueToSend;

            if(!isCanTransferValue(totalRequiredBalance)) {
                validationResults.push(ValidationResult(strategy, ErrorCodes.NOT_ENOUGH_VALUE_TO_DEPOSIT));
            }

            if(!isStrategyInInitialState(strategy)) {
                validationResults.push(ValidationResult(strategy, ErrorCodes.STRATEGY_NOT_IN_INITIAL_STATE));
            }
        }
        return validationResults;
    }

    function depositToStrategies(mapping (address => DepositConfig) _depositConfigs) override external onlyGovernanceOrSelfAndAccept {
        uint256 chunkSize = 50;

        for (uint256 i = 0; i < chunkSize && !_depositConfigs.empty(); i++) {

            (address strategy, DepositConfig depositConfig) = _depositConfigs.delMin().get();

            // calculate required amount to send
            uint128 valueToSend = depositConfig.amount + depositConfig.fee;
            if (!isCanTransferValue(valueToSend)) {
                emit ProcessDepositToStrategyError(strategy, ErrorCodes.NOT_ENOUGH_VALUE_TO_DEPOSIT);
                continue;
            }
            // require(isCanTransferValue(valueToSend), ErrorCodes.NOT_ENOUGH_VALUE_TO_DEPOSIT);

            if (!strategies.exists(strategy)) {
                emit ProcessDepositToStrategyError(strategy, ErrorCodes.STRATEGY_NOT_EXISTS);
                continue;
            }
            // require (strategies.exists(strategy), ErrorCodes.STRATEGY_NOT_EXISTS);

            if (depositConfig.amount < minStrategyDepositValue) {
                emit ProcessDepositToStrategyError(strategy, ErrorCodes.BAD_DEPOSIT_TO_STRATEGY_VALUE);
                continue;
            }
            // require (depositConfig.amount >= minStrategyDepositValue, ErrorCodes.BAD_DEPOSIT_TO_STRATEGY_VALUE);

            if (!isStrategyInInitialState(strategy)) {
                emit ProcessDepositToStrategyError(strategy, ErrorCodes.STRATEGY_NOT_IN_INITIAL_STATE);
                continue;
            }
            // require (isStrategyInInitialState(strategy), ErrorCodes.STRATEGY_NOT_IN_INITIAL_STATE);

            // change depositing strategy state
            strategies[strategy].depositingAmount = depositConfig.amount;

            // reduce availableAssets
            availableAssets -= valueToSend;

            // grab fee from total assets, then add it back after receiving response from strategy
            // TODO! check total assets!!
            totalAssets -= depositConfig.fee;

            IStrategy(strategy).deposit{value: depositConfig.amount + depositConfig.fee, bounce: false}(uint64(depositConfig.amount));
        }
        if (!_depositConfigs.empty()) {
            this.depositToStrategies{value: StEverVaultGas.SEND_SELF_VALUE, bounce: false}(_depositConfigs);
        }
    }

    function onStrategyHandledDeposit() override external onlyStrategy {
        uint128 depositingAmount = strategies[msg.sender].depositingAmount;
        // set init state for depositing
        strategies[msg.sender].depositingAmount = 0;

        // calculate remaining gas
        uint128 returnedFee = (msg.value - StEverVaultGas.HANDLING_STRATEGY_CB_FEE);

        // add fee back
        availableAssets += returnedFee;
        totalAssets += returnedFee;
        emit StrategyHandledDeposit(msg.sender, depositingAmount);
    }



    function onStrategyDidntHandleDeposit(uint32 _errcode) override external onlyStrategy {
        uint128 depositingAmount = strategies[msg.sender].depositingAmount;
        // set init state for depositing
        strategies[msg.sender].depositingAmount = 0;

        availableAssets += msg.value - StEverVaultGas.HANDLING_STRATEGY_CB_FEE;

        // add fee back to total assets
        if (depositingAmount > msg.value) {
        // if depositing amount gt msg.value therefore we spent more than attached fee
            totalAssets -= depositingAmount - msg.value + StEverVaultGas.HANDLING_STRATEGY_CB_FEE;
        }
        if (msg.value > depositingAmount) {
            totalAssets += msg.value - depositingAmount - StEverVaultGas.HANDLING_STRATEGY_CB_FEE;
        }
        emit StrategyDidntHandleDeposit(msg.sender, _errcode);
    }

    function strategyReport(uint128 _gain, uint128 _loss, uint128 _totalAssets, uint128 _requestedBalance) override external onlyStrategy {

        strategies[msg.sender].lastReport = now;
        strategies[msg.sender].totalGain += _gain;

        uint128 stEverFee = math.muldiv(_gain, stEverFeePercent, Constants.ONE_HUNDRED_PERCENT);
        totalStEverFee += stEverFee;
        uint128 gainWithoutStEverFee = _gain - stEverFee;

        // if gain less than the fee, therefore, we shouldn't increase total assets
        uint128 gainWithoutGasFee = gainWithoutStEverFee > gainFee ?
            gainWithoutStEverFee - gainFee :
            0;

        totalAssets += gainWithoutGasFee;
        emit StrategyReported(msg.sender, StrategyReport(gainWithoutGasFee, _loss, _totalAssets));

        uint128 sendValueToStrategy;
        if (_requestedBalance > 0 && isCanTransferValue(_requestedBalance)) {
            totalAssets -= _requestedBalance;
            availableAssets -= _requestedBalance;
            sendValueToStrategy = _requestedBalance;
        }
        tvm.rawReserve(_reserveWithValue(sendValueToStrategy), 0);
        msg.sender.transfer({value: 0, flag: MsgFlag.ALL_NOT_RESERVED, bounce: false});
    }

    function validateWithdrawFromStrategiesRequest(mapping (address => WithdrawConfig) _withdrawConfig) override public view returns (ValidationResult[]) {
        ValidationResult[] validationResults;

        uint128 totalRequiredBalance;

        for (uint256 i = 0; !_withdrawConfig.empty(); i++) {
            (address strategy ,WithdrawConfig config) = _withdrawConfig.delMin().get();

            if(config.amount < minStrategyWithdrawValue) {
                validationResults.push(ValidationResult(strategy, ErrorCodes.BAD_WITHDRAW_FROM_STRATEGY_VALUE));
            }

            if(!strategies.exists(strategy)) {
                validationResults.push(ValidationResult(strategy, ErrorCodes.STRATEGY_NOT_EXISTS));
            }
            totalRequiredBalance += config.fee;
            if(!isCanTransferValue(totalRequiredBalance)) {
                validationResults.push(ValidationResult(strategy, ErrorCodes.NOT_ENOUGH_VALUE_TO_WITHDRAW));
            }

            if(!isStrategyInInitialState(strategy)) {
                validationResults.push(ValidationResult(strategy, ErrorCodes.STRATEGY_NOT_IN_INITIAL_STATE));
            }
        }
        return validationResults;
    }

    function processWithdrawFromStrategies(mapping (address => WithdrawConfig) _withdrawConfig) override external onlyGovernanceOrSelfAndAccept {
        uint256 chunkSize = 50;

        for (uint256 i = 0; i < chunkSize && !_withdrawConfig.empty(); i++) {
            (address strategy, WithdrawConfig config) = _withdrawConfig.delMin().get();

            // require (config.amount >= minStrategyWithdrawValue, ErrorCodes.BAD_WITHDRAW_FROM_STRATEGY_VALUE);
            if (config.amount < minStrategyWithdrawValue) {
                emit ProcessWithdrawFromStrategyError(strategy, ErrorCodes.BAD_WITHDRAW_FROM_STRATEGY_VALUE);
                continue;
            }

            // require (strategies.exists(strategy), ErrorCodes.STRATEGY_NOT_EXISTS);
            if (!strategies.exists(strategy)) {
                emit ProcessWithdrawFromStrategyError(strategy, ErrorCodes.STRATEGY_NOT_EXISTS);
                continue;
            }

            // require (isCanTransferValue(config.fee), ErrorCodes.NOT_ENOUGH_VALUE_TO_WITHDRAW);
            if (!isCanTransferValue(config.fee)) {
                emit ProcessWithdrawFromStrategyError(strategy, ErrorCodes.NOT_ENOUGH_VALUE_TO_WITHDRAW);
                continue;
            }

            // require (isStrategyInInitialState(strategy), ErrorCodes.STRATEGY_NOT_IN_INITIAL_STATE);
            if (!isStrategyInInitialState(strategy)) {
                emit ProcessWithdrawFromStrategyError(strategy, ErrorCodes.STRATEGY_NOT_IN_INITIAL_STATE);
                continue;
            }

            // grab fee, then add it back after receiving response from strategy
            availableAssets -= config.fee;

            // TODO! check total assets!!
            totalAssets -= config.fee;

            // change withdrawing strategy state
            strategies[strategy].withdrawingAmount = config.amount;

            IStrategy(strategy).withdraw{value:config.fee, bounce: false}(uint64(config.amount));
        }
        if (!_withdrawConfig.empty()) {
            this.processWithdrawFromStrategies{value: StEverVaultGas.SEND_SELF_VALUE, bounce:false}(_withdrawConfig);
        }
    }

    function onStrategyHandledWithdrawRequest() override external onlyStrategy {

        emit StrategyHandledWithdrawRequest(msg.sender, strategies[msg.sender].withdrawingAmount);

        if (isEmergencyProcess()) {
            tvm.rawReserve(_reserve(), 0);
            emergencyState.emitter.transfer({value: 0, flag: MsgFlag.ALL_NOT_RESERVED, bounce: false});
            return;
        }
        // set back remaining gas after withdraw request
        availableAssets += msg.value - StEverVaultGas.HANDLING_STRATEGY_CB_FEE;
        totalAssets += msg.value - StEverVaultGas.HANDLING_STRATEGY_CB_FEE;
    }

    function receiveFromStrategy() override external onlyStrategy {
        uint128 withdrawingAmount = strategies[msg.sender].withdrawingAmount;
        // set init state for withdrawing
        strategies[msg.sender].withdrawingAmount = 0;

        uint128 receivedAmount = msg.value - StEverVaultGas.HANDLING_STRATEGY_CB_FEE;

        availableAssets += receivedAmount;

        emit StrategyWithdrawSuccess(msg.sender, receivedAmount);

    }

    function receiveAdditionalTransferFromStrategy() override external onlyStrategy {
        uint128 receivedAmount = msg.value - StEverVaultGas.HANDLING_STRATEGY_CB_FEE;

        availableAssets += receivedAmount;

        emit ReceiveAdditionalTransferFromStrategy(msg.sender, receivedAmount);
    }

    function withdrawFromStrategyError(uint32 _errcode) override external onlyStrategy {
        emit StrategyWithdrawError(msg.sender, _errcode);
        // set init state for withdrawing
        strategies[msg.sender].withdrawingAmount = 0;

        if (isEmergencyProcess()) {
            tvm.rawReserve(_reserve(), 0);
            emergencyState.emitter.transfer({value: 0, flag: MsgFlag.ALL_NOT_RESERVED, bounce: false});
            return;
        }
        // calculate remaining gas
        uint128 notUsedFee = msg.value - StEverVaultGas.HANDLING_STRATEGY_CB_FEE;

        // set remaining gas
        availableAssets += notUsedFee;
        // TODO why not reset to the totalAssets ?

    }
    // deposit
    function deposit(uint128 _amount, uint64 _nonce) override external {
        require (msg.value >= _amount + StEverVaultGas.MIN_CALL_MSG_VALUE, ErrorCodes.NOT_ENOUGH_DEPOSIT_VALUE);

        tvm.rawReserve(address(this).balance - (msg.value - _amount), 0);

        uint128 amountToSend = getDepositStEverAmount(_amount);

        totalAssets += _amount;
        availableAssets += _amount;
        stEverSupply += amountToSend;

        TvmBuilder builder;
		builder.store(_nonce);

        emit Deposit(msg.sender, _amount, amountToSend);
        ITokenRoot(stTokenRoot).mint{
            value: 0,
            flag: MsgFlag.ALL_NOT_RESERVED,
            bounce: false
        }(
            amountToSend,
            msg.sender,
            StEverVaultGas.ST_EVER_WALLET_DEPLOY_VALUE,
            msg.sender,
            false,
            builder.toCell()
        );
    }


    // withdraw
    function onAcceptTokensTransfer(
        address _tokenRoot,
        uint128 _amount,
        address _sender,
        address _senderWallet,
        address _remainingGasTo,
        TvmCell _payload
    ) override external {
        require (msg.sender == stEverWallet, ErrorCodes.NOT_ROOT_WALLET);

        // if not enough value, resend tokens to sender
        if (msg.value < StEverVaultGas.WITHDRAW_FEE + StEverVaultGas.WITHDRAW_FEE_FOR_USER_DATA) {
            tvm.rawReserve(_reserve(), 0);
            emit BadWithdrawRequest(_sender, _amount, msg.value);
            ITokenWallet(stEverWallet).transfer{
                value: 0,
                flag: MsgFlag.ALL_NOT_RESERVED,
                bounce: false
            }(
                _amount,
                _sender,
                0,
                _sender,
                false,
                _payload
            );
            return;
        }
        requestWithdraw(_sender, _amount, _payload);
    }

    function requestWithdraw(address _user, uint128 _amount, TvmCell _payload) internal {
        tvm.rawReserve(address(this).balance - (msg.value - StEverVaultGas.WITHDRAW_FEE), 0);

        address accountAddr = getAccountAddress(_user);

        (, uint64 _nonce, bool correct) = decodeDepositPayload(_payload);

        pendingWithdrawals[_nonce] = PendingWithdraw(_amount, _user);

        addPendingValueToAccount(_nonce, _amount, accountAddr, 0, MsgFlag.ALL_NOT_RESERVED);
    }

    function handleAddPendingValueError(TvmSlice slice) internal {
        tvm.rawReserve(_reserve(), 0);

        uint64 _withdraw_nonce = slice.decode(uint64);

        PendingWithdraw pendingWithdraw = pendingWithdrawals[_withdraw_nonce];

        address account = deployAccount(pendingWithdraw.user);

        addPendingValueToAccount(_withdraw_nonce, pendingWithdraw.amount, account, 0, MsgFlag.ALL_NOT_RESERVED);
    }

    function addPendingValueToAccount(uint64 _withdraw_nonce, uint128 amount, address account, uint128 _value, uint8 _flag) internal {
        IStEverAccount(account).addPendingValue{
            value:_value,
            flag: _flag,
            bounce: true
        }(_withdraw_nonce, amount);
    }

    function onPendingWithdrawAccepted(uint64 _nonce,address user) override external onlyAccount(user) {
       tvm.rawReserve(_reserve(), 0);

       PendingWithdraw pendingWithdraw = pendingWithdrawals[_nonce];
       emit WithdrawRequest(pendingWithdraw.user, pendingWithdraw.amount, _nonce);
       delete pendingWithdrawals[_nonce];

       pendingWithdraw.user.transfer({value:0, flag:MsgFlag.ALL_NOT_RESERVED, bounce:false});
    }

    function onPendingWithdrawRejected(uint64 _nonce, address user, uint128 _amount) override external onlyAccount(user) {
        tvm.rawReserve(_reserveWithValue(StEverVaultGas.WITHDRAW_FEE), 0);

        delete pendingWithdrawals[_nonce];

        TvmCell payload;
        ITokenWallet(stEverWallet).transfer{
            value:0,
            flag:MsgFlag.ALL_NOT_RESERVED,
            bounce:false
        }(
            _amount,
            user,
            0,
            user,
            false,
            payload
        );
    }

    function removePendingWithdraw(uint64 _nonce) override external minCallValue {
        tvm.rawReserve(_reserve(), 0);
        address account = getAccountAddress(msg.sender);
        IStEverAccount(account).removePendingWithdraw{value:0, flag:MsgFlag.ALL_NOT_RESERVED, bounce: false}(_nonce);
    }

    function onPendingWithdrawRemoved(address user, uint64 nonce, uint128 _amount) override external onlyAccount(user) {
        tvm.rawReserve(_reserveWithValue(StEverVaultGas.WITHDRAW_FEE), 0);

        emit WithdrawRequestRemoved(user, nonce);

        TvmCell payload;
        ITokenWallet(stEverWallet).transfer{
            value:0,
            flag:MsgFlag.ALL_NOT_RESERVED,
            bounce:false
        }(
            _amount,
            user,
            0,
            user,
            false,
            payload
        );
    }

    function processSendToUsers(mapping (address => SendToUserConfig) sendConfig) override external onlyGovernanceOrSelfAndAccept {
        uint256 chunkSize = 50;

        for (uint256 i = 0; i < chunkSize && !sendConfig.empty(); i++) {
            (address user, SendToUserConfig config) = sendConfig.delMin().get();
            address account = getAccountAddress(user);
            IStEverAccount(account).processWithdraw{value: StEverVaultGas.WITHDRAW_FEE * uint128(config.nonces.length), bounce: false}(config.nonces);
        }

        if (!sendConfig.empty()) {
            this.processSendToUsers{value: StEverVaultGas.SEND_SELF_VALUE, bounce: false}(sendConfig);
        }
    }

    function withdrawToUser(
        uint128 amount,
        address _user,
        mapping(uint64 => IStEverAccount.WithdrawRequest) _withdrawals
    ) override external onlyAccount(_user) {
        tvm.rawReserve(_reserve(), 0);

        if(_withdrawals.empty()) {
            return;
        }

        // create withdraw info
        mapping(uint64 => WithdrawToUserInfo) withdrawInfo = getWithdrawToUserInfo(_withdrawals);

        uint128 everAmount = getWithdrawEverAmount(amount);
        // if not enough balance, reset pending to the Account;
        if (availableAssets < everAmount) {
            emit WithdrawError(_user, withdrawInfo, amount);

            if (isEmergencyProcess()) {
                IStEverAccount(msg.sender).resetPendingValues{
                    value:0,
                    flag:MsgFlag.ALL_NOT_RESERVED,
                    bounce: false
                }(_withdrawals, _user);
                return;
            }

            IStEverAccount(msg.sender).resetPendingValues{
                value:0,
                flag:MsgFlag.ALL_NOT_RESERVED,
                bounce: false
            }(_withdrawals, address(this));
            return;
        }
        totalAssets -= everAmount;
        availableAssets -= everAmount;
        stEverSupply -= amount;


        TvmBuilder builder;
        builder.store(_user);
        builder.store(everAmount);
        builder.store(withdrawInfo);

        TokenWalletBurnableBase(stEverWallet).burn{value: 0, flag: MsgFlag.ALL_NOT_RESERVED, bounce: false}(
            amount,
            address(this),
            address(this),
            builder.toCell()
        );
    }

    function onAcceptTokensBurn(
        uint128 amount,
        address walletOwner,
        address wallet,
        address remainingGasTo,
        TvmCell payload
    ) override external {
        require (wallet == stEverWallet, ErrorCodes.NOT_ROOT_WALLET);

        TvmSlice slice = payload.toSlice();
        address user = slice.decode(address);
        uint128 everAmount = slice.decode(uint128);
        mapping(uint64 => WithdrawToUserInfo) withdrawals = slice.decode(mapping(uint64 => WithdrawToUserInfo));

        tvm.rawReserve(_reserveWithValue(everAmount), 0);

        emit WithdrawSuccess(user, everAmount, withdrawals);
        user.transfer({value: 0, flag :MsgFlag.ALL_NOT_RESERVED, bounce: false});
    }

    onBounce(TvmSlice slice) external {
		tvm.accept();

		uint32 functionId = slice.decode(uint32);
		if (functionId == tvm.functionId(StEverAccount.addPendingValue)) {
			handleAddPendingValueError(slice);
		}
	}
    // extra money from strategies
    function processWithdrawExtraMoneyFromStrategies(address[] _strategies) override external onlyGovernanceOrSelfAndAccept {

        for (address strategy : _strategies) {
            if (!strategies.exists(strategy)) {
               emit ProcessWithdrawExtraMoneyFromStrategyError(strategy, ErrorCodes.STRATEGY_NOT_EXISTS);
               continue;
            }

            if (!isCanTransferValue(Constants.MIN_TRANSACTION_VALUE)) {
               emit ProcessWithdrawExtraMoneyFromStrategyError(strategy, ErrorCodes.NOT_ENOUGH_VALUE);
               continue;
            }

            availableAssets -= Constants.MIN_TRANSACTION_VALUE;

            IStrategy(strategy).withdrawExtraMoney{value: Constants.MIN_TRANSACTION_VALUE, bounce: false}();
        }
    }

    function receiveExtraMoneyFromStrategy() override external onlyStrategy {
        uint128 receivedValue = msg.value - StEverVaultGas.HANDLING_STRATEGY_CB_FEE;

        availableAssets += receivedValue;

        uint128 availableAssetsIncreasedFor = receivedValue > Constants.MIN_TRANSACTION_VALUE ?
        receivedValue - Constants.MIN_TRANSACTION_VALUE : 0;

        emit ReceiveExtraMoneyFromStrategy(msg.sender, availableAssetsIncreasedFor);
    }

    // withdraw stEver fee
    function withdrawStEverFee(uint128 _amount) override external onlyGovernanceOrSelfAndAccept {
        require (totalStEverFee >= _amount, ErrorCodes.NOT_ENOUGH_ST_EVER_FEE);
        require (isCanTransferValue(_amount), ErrorCodes.NOT_ENOUGH_AVAILABLE_ASSETS);

        // fee should payed by admin
        tvm.rawReserve(address(this).balance - _amount, 0);

        totalStEverFee -= _amount;
        availableAssets -= _amount;
        emit WithdrawFee(_amount);
        owner.transfer({value: 0, flag:MsgFlag.ALL_NOT_RESERVED, bounce: false});
    }
    // withdraw extra
    function withdrawExtraEver() override external onlyOwner {

        require (
            availableAssets > totalAssets && (availableAssets - totalAssets) > totalStEverFee,
            ErrorCodes.AVAILABLE_ASSETS_SHOULD_GT_TOTAL_ASSETS
        );

        uint128 extraAvailableAssets = availableAssets - totalAssets - totalStEverFee;
        uint128 extraPureBalance = address(this).balance - extraAvailableAssets - StEverVaultGas.CONTRACT_MIN_BALANCE;
        uint128 totalExtraEver = extraAvailableAssets + extraPureBalance;

        // remove extra ever from availableAssets
        availableAssets -= extraAvailableAssets;

        tvm.rawReserve(_reserveWithValue(totalExtraEver), 0);

        emit SuccessWithdrawExtraEver(totalExtraEver);

        owner.transfer({value: 0, flag: MsgFlag.ALL_NOT_RESERVED, bounce: false});
    }

    // upgrade
    function upgrade(TvmCell _newCode, uint32 _newVersion, address _sendGasTo) override external onlyOwner {
        if (_newVersion == stEverVaultVersion) {
            tvm.rawReserve(_reserve(), 0);
            _sendGasTo.transfer({value: 0, flag: MsgFlag.ALL_NOT_RESERVED, bounce:false});
            return;
        }

        // should be unpacked in the same order!
        TvmCell data = abi.encode(
            _newVersion,
            _sendGasTo,
            governance,
            platformCode,
            accountCode,
            stEverSupply,
            totalAssets,
            availableAssets,
            totalStEverFee,
            stEverWallet,
            stTokenRoot,
            gainFee,
            stEverFeePercent,
            minStrategyDepositValue,
            minStrategyWithdrawValue,
            owner,
            accountVersion,
            strategies,
            pendingWithdrawals,
            emergencyState
        );

        // set code after complete this method
        tvm.setcode(_newCode);
        // run onCodeUpgrade from new code
        tvm.setCurrentCode(_newCode);

        onCodeUpgrade(data);

    }

    // upgrade to v2
    function onCodeUpgrade(TvmCell _upgradeData) private {}
}
