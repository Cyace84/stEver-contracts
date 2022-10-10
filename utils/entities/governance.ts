import { Contract, Signer } from "locklift";
import { StEverVaultAbi } from "../../build/factorySource";

import { UpgradedVault, Vault } from "./vault";

export class Governance {
  constructor(public readonly keyPair: Signer, private vault: Vault) {}
  emitWithdraw = async (...params: Parameters<Contract<StEverVaultAbi>["methods"]["processSendToUsers"]>) => {
    return await locklift.tracing.trace(
      this.vault.vaultContract.methods
        .processSendToUsers(...params)
        .sendExternal({ publicKey: this.keyPair.publicKey }),
    );
  };

  setUpgradedVault = (upgradedVault: UpgradedVault) => {
    this.vault = upgradedVault;
  };

  depositToStrategies = async (...params: Parameters<Contract<StEverVaultAbi>["methods"]["depositToStrategies"]>) => {
    const { transaction, traceTree } = await locklift.tracing.trace(
      this.vault.vaultContract.methods
        .depositToStrategies(...params)
        .sendExternal({ publicKey: this.keyPair.publicKey }),
    );
    const depositSuccessEvents = await this.vault.getEventsAfterTransaction({
      eventName: "StrategyHandledDeposit",
      parentTransaction: transaction,
    });
    const depositToStrategyErrorEvents = await this.vault.getEventsAfterTransaction({
      eventName: "StrategyDidntHandleDeposit",
      parentTransaction: transaction,
    });
    const processingErrorEvent = await this.vault.getEventsAfterTransaction({
      eventName: "ProcessDepositToStrategyError",
      parentTransaction: transaction,
    });
    return {
      successEvents: depositSuccessEvents,
      errorEvents: depositToStrategyErrorEvents,
      processingErrorEvent,
      transaction,
      traceTree,
    };
  };

  withdrawFromStrategiesRequest = async (
    ...params: Parameters<Contract<StEverVaultAbi>["methods"]["processWithdrawFromStrategies"]>
  ) => {
    const { transaction } = await locklift.tracing.trace(
      this.vault.vaultContract.methods
        .processWithdrawFromStrategies(...params)
        .sendExternal({ publicKey: this.keyPair.publicKey }),
    );
    const successEvents = await this.vault.getEventsAfterTransaction({
      eventName: "StrategyHandledWithdrawRequest",
      parentTransaction: transaction,
    });
    const errorEvent = await this.vault.getEventsAfterTransaction({
      eventName: "StrategyWithdrawError",
      parentTransaction: transaction,
    });
    const processingErrorEvent = await this.vault.getEventsAfterTransaction({
      eventName: "ProcessWithdrawFromStrategyError",
      parentTransaction: transaction,
    });
    return {
      successEvents,
      errorEvent,
      transaction,
      processingErrorEvent,
    };
  };

  forceWithdrawFromStrategies = async (
    ...params: Parameters<Contract<StEverVaultAbi>["methods"]["forceWithdrawFromStrategies"]>
  ) => {
    const { transaction } = await locklift.tracing.trace(
      this.vault.vaultContract.methods
        .forceWithdrawFromStrategies(...params)
        .sendExternal({ publicKey: this.keyPair.publicKey }),
    );
    const successEvents = await this.vault.getEventsAfterTransaction({
      eventName: "StrategyWithdrawSuccess",
      parentTransaction: transaction,
    });
    const errorEvent = await this.vault.getEventsAfterTransaction({
      eventName: "StrategyWithdrawError",
      parentTransaction: transaction,
    });
    const processingErrorEvent = await this.vault.getEventsAfterTransaction({
      eventName: "ProcessWithdrawFromStrategyError",
      parentTransaction: transaction,
    });
    return {
      successEvents,
      errorEvent,
      transaction,
      processingErrorEvent,
    };
  };

  withdrawFee = ({ amount }: { amount: number }) => {
    return locklift.tracing.trace(
      this.vault.vaultContract.methods
        .withdrawStEverFee({
          _amount: amount,
        })
        .sendExternal({
          publicKey: this.keyPair.publicKey,
        }),
    );
  };

  withdrawExtraMoneyFromStrategy = async (
    ...params: Parameters<Contract<StEverVaultAbi>["methods"]["processWithdrawExtraMoneyFromStrategies"]>
  ) => {
    const { transaction } = await locklift.tracing.trace(
      this.vault.vaultContract.methods.processWithdrawExtraMoneyFromStrategies(...params).sendExternal({
        publicKey: this.keyPair.publicKey,
      }),
    );
    const successEvents = await this.vault.getEventsAfterTransaction({
      eventName: "ReceiveExtraMoneyFromStrategy",
      parentTransaction: transaction,
    });
    return {
      successEvents,
    };
  };
}
