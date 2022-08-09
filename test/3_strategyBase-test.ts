import { preparation } from "./preparation";
import { Contract, Signer } from "locklift";
import { User } from "../utils/entities/user";
import { Governance } from "../utils/entities/governance";
import { TokenRootUpgradeableAbi } from "../build/factorySource";

import { expect } from "chai";
import { Vault } from "../utils/entities/vault";
import { DePoolStrategyWithPool } from "../utils/entities/dePoolStrategy";
import { assertEvent, getAddressEverBalance, toNanoBn } from "../utils";
import { createAndRegisterStrategy } from "../utils/highOrderUtils";
import { concatMap, lastValueFrom, range, toArray } from "rxjs";
import _ from "lodash";
import { StrategyFactory } from "../utils/entities/strategyFactory";
import BigNumber from "bignumber.js";

let signer: Signer;
let admin: User;
let governance: Governance;
let user1: User;
let user2: User;
let tokenRoot: Contract<TokenRootUpgradeableAbi>;
let vault: Vault;
let strategy: DePoolStrategyWithPool;
let strategyFactory: StrategyFactory;
describe("Strategy base", function () {
  before(async () => {
    const {
      vault: v,
      tokenRoot: tr,
      signer: s,
      users: [adminUser, _, u1, u2],
      governance: g,
      strategyFactory: st,
    } = await preparation();
    signer = s;
    vault = v;
    admin = adminUser;
    governance = g;
    user1 = u1;
    user2 = u2;
    tokenRoot = tr;
    strategyFactory = st;
  });
  it("Vault should be initialized", async () => {
    await vault.initialize();
  });
  it("should strategy deployed", async () => {
    strategy = await createAndRegisterStrategy({
      signer,
      vault,
      governance,
      strategyDeployValue: locklift.utils.toNano(12),
      poolDeployValue: locklift.utils.toNano(200),
      strategyFactory,
    });
    const { events: strategyAddedEvents } = await vault.vaultContract.getPastEvents({
      filter: ({ event }) => event === "StrategyAdded",
    });
    assertEvent(strategyAddedEvents, "StrategyAdded");
    expect(strategyAddedEvents[0].data.strategy.equals(strategy.strategy.address)).to.be.true;
  });
  it("governance should deposit to strategies", async () => {
    const DEPOSIT_TO_STRATEGIES_AMOUNT = toNanoBn(119.4);
    const DEPOSIT_FEE = new BigNumber(locklift.utils.toNano(0.6));

    await user1.depositToVault(toNanoBn(140).toString());
    const vaultStateBefore = await vault.getDetails();

    console.log(`vault balance before ${await getAddressEverBalance(vault.vaultContract.address)}`);
    await governance.depositToStrategies({
      _depositConfigs: [
        [
          locklift.utils.getRandomNonce(),
          {
            strategy: strategy.strategy.address,
            amount: DEPOSIT_TO_STRATEGIES_AMOUNT.toString(),
            fee: DEPOSIT_FEE.toString(),
          },
        ],
      ],
    });
    const { events } = await vault.vaultContract.getPastEvents({
      filter: ({ event }) => event === "StrategyHandledDeposit",
    });
    assertEvent(events, "StrategyHandledDeposit");
    const vaultStateAfter = await vault.getDetails();

    expect(events[0].data.strategy.equals(strategy.strategy.address)).to.be.true;
    expect(Number(events[0].data.returnedFee)).to.be.above(0);
    expect(vaultStateBefore.totalAssets.toNumber()).to.be.gt(
      vaultStateAfter.totalAssets.toNumber(),
      "total assets should be reduced by fee",
    );
    expect(vaultStateAfter.totalAssets.toNumber()).to.be.gt(
      vaultStateBefore.totalAssets.minus(DEPOSIT_FEE).toNumber(),
      "some fee should be returned",
    );
    expect(vaultStateBefore.availableAssets.minus(DEPOSIT_TO_STRATEGIES_AMOUNT).toNumber()).to.be.gt(
      vaultStateAfter.availableAssets.toNumber(),
      "total assets should be reduced more than deposit amount",
    );

    expect(vaultStateAfter.availableAssets.toNumber()).to.be.gt(
      vaultStateBefore.availableAssets.minus(DEPOSIT_TO_STRATEGIES_AMOUNT).minus(DEPOSIT_FEE).toNumber(),
      "some fee should be returned",
    );
    const strategyInfo = await vault.getStrategyInfo(strategy.strategy.address);
    expect(strategyInfo.totalAssets).to.be.equals(DEPOSIT_TO_STRATEGIES_AMOUNT.toString());
    expect(strategyInfo.totalGain).to.be.equals("0");
    expect(strategyInfo.lastReport).to.be.equals("0");
    console.log(`Returned strategy fee is ${locklift.utils.fromNano(events[0].data.returnedFee)}`);
    console.log(`vault balance after ${await getAddressEverBalance(vault.vaultContract.address)}`);
  });
  it("strategy state should be changed after report", async () => {
    const strategyInfoBefore = await vault.getStrategyInfo(strategy.strategy.address);
    const ROUND_REWARD = toNanoBn(10);
    await strategy.emitDePoolRoundComplete(ROUND_REWARD.toString());
    const strategyInfoAfter = await vault.getStrategyInfo(strategy.strategy.address);
    expect(strategyInfoAfter.totalGain).to.be.equals(toNanoBn(10).toString());
    expect(strategyInfoAfter.totalAssets).to.be.equals(ROUND_REWARD.plus(strategyInfoBefore.totalAssets).toString());
  });
  it("strategy state should be changed after withdraw", async () => {
    const strategyInfoBefore = await vault.getStrategyInfo(strategy.strategy.address);
    const WITHDRAW_AMOUNT = toNanoBn(100);
    await governance.withdrawFromStrategies({
      _withdrawConfig: [
        [
          locklift.utils.getRandomNonce(),
          { strategy: strategy.strategy.address, amount: WITHDRAW_AMOUNT.toString(), fee: toNanoBn(0.6).toString() },
        ],
      ],
    });
    const strategyInfoAfter = await vault.getStrategyInfo(strategy.strategy.address);

    expect(new BigNumber(strategyInfoBefore.totalAssets).minus(WITHDRAW_AMOUNT).toString()).to.be.equals(
      strategyInfoAfter.totalAssets.toString(),
    );
  });
  it.skip("governance shouldn't deposit to strategy with low value", async () => {
    const DEPOSIT_TO_STRATEGIES_AMOUNT = 100;
    await user1.depositToVault(locklift.utils.toNano(DEPOSIT_TO_STRATEGIES_AMOUNT));

    console.log(`vault balance before ${await getAddressEverBalance(vault.vaultContract.address)}`);
    console.log(`strategy balance before ${await getAddressEverBalance(strategy.strategy.address)}`);
    const result = await governance
      .depositToStrategies({
        _depositConfigs: [
          [
            locklift.utils.getRandomNonce(),
            {
              fee: locklift.utils.toNano(0.6),
              amount: locklift.utils.toNano(0.1),
              strategy: strategy.strategy.address,
            },
          ],
        ],
      })
      .catch(e => ({ error: true }));
    const { events } = await vault.vaultContract.getPastEvents({
      filter: ({ event }) => event === "StrategyDidntHandleDeposit",
    });
    assertEvent(events, "StrategyDidntHandleDeposit");
    console.log(`strategy balance after ${await getAddressEverBalance(strategy.strategy.address)}`);
    console.log(`vault balance after ${await getAddressEverBalance(vault.vaultContract.address)}`);
  });
  it("should strategy request value from vault", async () => {
    const strategyWithDePool = await createAndRegisterStrategy({
      governance,
      signer,
      vault,
      strategyDeployValue: locklift.utils.toNano(4),
      poolDeployValue: locklift.utils.toNano(200),
      strategyFactory,
    });
    console.log(`strategy balance before ${await getAddressEverBalance(strategyWithDePool.strategy.address)}`);
    const strategyBalanceBeforeReport = await strategyWithDePool.getStrategyBalance();
    await user1.depositToVault(locklift.utils.toNano(100));
    await governance.depositToStrategies({
      _depositConfigs: [
        [
          locklift.utils.getRandomNonce(),
          {
            strategy: strategyWithDePool.strategy.address,
            amount: locklift.utils.toNano(100),
            fee: locklift.utils.toNano(0.6),
          },
        ],
      ],
    });
    await strategyWithDePool.emitDePoolRoundComplete(locklift.utils.toNano(10));
    const strategyBalanceAfterReport = await strategyWithDePool.getStrategyBalance();
    expect(Number(strategyBalanceAfterReport)).to.be.above(
      Number(strategyBalanceBeforeReport),
      "strategy balance should be increased",
    );
  });
  it("should validate deposit request", async () => {
    const result = await vault.vaultContract.methods
      .validateDepositRequest({
        _depositConfigs: _.range(0, 120).map(() => [
          locklift.utils.getRandomNonce(),
          {
            strategy: strategy.strategy.address,
            amount: locklift.utils.toNano(90),
            fee: locklift.utils.toNano(0.6),
          },
        ]),
      })
      .call();
    expect(result.value0.length).to.be.equals(120);
  });
  it.skip("should created and deposited to 110 strategies", async () => {
    const strategies = await lastValueFrom(
      range(2).pipe(
        concatMap(() =>
          createAndRegisterStrategy({
            signer,
            vault,
            governance,
            strategyDeployValue: locklift.utils.toNano(12),
            poolDeployValue: locklift.utils.toNano(200),
            strategyFactory,
          }),
        ),
        toArray(),
      ),
    );
    await user1.depositToVault(locklift.utils.toNano(3000));
    console.log(`Vault balance before ${await getAddressEverBalance(vault.vaultContract.address)}`);

    await governance.depositToStrategies({
      _depositConfigs: _.range(0, 55)
        .reduce(acc => [...acc, ...strategies], [] as DePoolStrategyWithPool[])
        .map(strategy => [
          locklift.utils.getRandomNonce(),
          {
            fee: locklift.utils.toNano(0.6),
            amount: locklift.utils.toNano(2),
            strategy: strategy.strategy.address,
          },
        ]),
    });
    console.log(`Vault balance after ${await getAddressEverBalance(vault.vaultContract.address)}`);
  });
});
