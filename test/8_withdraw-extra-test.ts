import { Contract, fromNano, Signer, toNano } from "locklift";
import { User } from "../utils/entities/user";
import { Governance } from "../utils/entities/governance";
import { TokenRootUpgradeableAbi } from "../build/factorySource";
import { Vault } from "../utils/entities/vault";
import { StrategyFactory } from "../utils/entities/strategyFactory";
import { DePoolStrategyWithPool } from "../utils/entities/dePoolStrategy";
import { preparation } from "./preparation";
import { expect } from "chai";
import { concatMap, filter, from, lastValueFrom, map, mergeMap, range, toArray } from "rxjs";
import { createAndRegisterStrategy } from "../utils/highOrderUtils";
import BigNumber from "bignumber.js";
import { isT, toNanoBn } from "../utils";

let signer: Signer;
let admin: User;
let governance: Governance;
let user1: User;
let user2: User;
let tokenRoot: Contract<TokenRootUpgradeableAbi>;
let vault: Vault;
let strategyFactory: StrategyFactory;
let strategies: DePoolStrategyWithPool[] = [];
describe("Emergency testing", function () {
  before(async () => {
    const {
      vault: v,
      tokenRoot: tr,
      signer: s,
      users: [adminUser, _, u1, u2],
      governance: g,
      strategyFactory: sf,
    } = await preparation({ deployUserValue: locklift.utils.toNano(2000) });
    signer = s;
    vault = v;
    admin = adminUser;
    governance = g;
    user1 = u1;
    user2 = u2;
    tokenRoot = tr;
    strategyFactory = sf;
  });
  it("Vault should be initialized", async () => {
    await vault.initialize();

    expect((await vault.getDetails()).stTokenRoot.equals(tokenRoot.address)).to.be.true;
    await user1.depositToVault(toNano(1100));
    const DEPOSIT_TO_STRATEGIES_AMOUNT = toNano(101);
    strategies = await lastValueFrom(
      range(3).pipe(
        mergeMap(
          () =>
            createAndRegisterStrategy({
              signer,
              vault,
              admin: admin.account,
              strategyDeployValue: locklift.utils.toNano(12),
              poolDeployValue: locklift.utils.toNano(200000),
              strategyFactory,
            }),
          1,
        ),
        map(({ strategy }) => strategy),
        toArray(),
      ),
    );
    await governance.depositToStrategies({
      _depositConfigs: strategies.map(({ strategy }) => [
        strategy.address,
        {
          amount: DEPOSIT_TO_STRATEGIES_AMOUNT.toString(),
          fee: toNano(1),
        },
      ]),
    });
    await lastValueFrom(
      from(strategies).pipe(
        concatMap(strategyWithDePool => from(strategyWithDePool.emitDePoolRoundComplete(toNano(1000)))),
      ),
    );

    await governance.withdrawFromStrategiesRequest({
      _withdrawConfig: strategies.map(({ strategy }) => [
        strategy.address,
        {
          amount: toNano(10000000000).toString(),
          fee: locklift.utils.toNano(0.1),
        },
      ]),
    });
    await lastValueFrom(
      from(strategies).pipe(concatMap(strategyWithDePool => from(strategyWithDePool.emitWithdrawByRequests()))),
    );
  });
  it("admin should withdraw extra ever from vault", async () => {
    const vaultDetailsBefore = await vault.getDetails();
    const withdrawExtraEverTransaction = await vault.withdrawExtraEver();
    const vaultDetailsAfter = await vault.getDetails();
    expect(vaultDetailsAfter.availableAssets.toNumber()).to.be.eq(
      vaultDetailsAfter.totalAssets.toNumber(),
      "all extra assets should withdrawn",
    );
    const withdrawExtraEverEvents = await vault.getEventsAfterTransaction({
      parentTransaction: withdrawExtraEverTransaction,
      eventName: "SuccessWithdrawExtraEver",
    });
    expect(withdrawExtraEverEvents.length).to.be.eq(1);

    const withdrawnFee = Number(withdrawExtraEverEvents[0].data.value);
    expect(withdrawnFee).to.be.above(0);
    expect(vaultDetailsBefore.totalAssets.minus(withdrawnFee).toNumber()).to.be.lte(
      vaultDetailsAfter.totalAssets.toNumber(),
      "available assets should reduce by value from the event",
    );
    expect(vaultDetailsBefore.contractBalance.minus(withdrawnFee).toNumber()).to.be.eq(
      vaultDetailsAfter.contractBalance.toNumber(),
      "contract balance should reduce exactly by value from the event",
    );
  });
});