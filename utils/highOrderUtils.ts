import { assertEvent } from "./index";
import { expect } from "chai";
import { User } from "./entities/user";
import { concatMap, from, map, toArray } from "rxjs";
import { Governance } from "./entities/governance";
import { Contract, Signer } from "locklift";
import { createStrategy, DePoolStrategyWithPool } from "./entities/dePoolStrategy";
import { Vault } from "./entities/vault";
import { StrategyFactory } from "./entities/strategyFactory";
import { StEverVaultAbi } from "../build/factorySource";

export const makeWithdrawToUsers = async ({
  amount,
  users,
  governance,
  vaultContract,
}: {
  amount: string;
  users: Array<User>;
  governance: Governance;
  vaultContract: Contract<StEverVaultAbi>;
}) => {
  const withdrawSetup = (await from(users)
    .pipe(
      concatMap(user => from(user.makeWithdrawRequest(amount)).pipe(map(({ nonce }) => ({ user, nonce })))),
      toArray(),
    )
    .toPromise())!;

  await governance.emitWithdraw({
    sendConfig: withdrawSetup.map(({ user, nonce }) => [
      locklift.utils.getRandomNonce(),
      { user: user.account.address, nonces: [nonce] },
    ]),
  });

  const { events: withdrawSuccessEvents } = await vaultContract.getPastEvents({
    filter: event => event.event === "WithdrawSuccess",
  });
  const { events: withdrawErrorEvents } = await vaultContract.getPastEvents({
    filter: event => event.event === "WithdrawError",
  });

  return {
    successEvents: withdrawSuccessEvents,
    errorEvents: withdrawErrorEvents,
  };
};

export const createAndRegisterStrategy = async ({
  governance,
  vault,
  signer,
  poolDeployValue,
  strategyDeployValue,
  strategyFactory,
}: {
  governance: Governance;
  vault: Vault;
  signer: Signer;
  poolDeployValue: string;
  strategyDeployValue: string;
  strategyFactory: StrategyFactory;
}): Promise<DePoolStrategyWithPool> => {
  const strategy = await createStrategy({
    vaultContract: vault.vaultContract,
    signer,
    strategyDeployValue,
    poolDeployValue,
    strategyFactory,
  });

  await locklift.tracing.trace(
    vault.vaultContract.methods
      .addStrategy({ _strategy: strategy.strategy.address })
      .sendExternal({ publicKey: governance.keyPair.publicKey }),
  );
  return strategy;
};
