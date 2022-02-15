const { verify } = require("crypto");
const { BigNumber } = require("ethers");
const { formatEther, parseEther } = require("ethers/lib/utils");
const hre = require("hardhat");
const ethers = hre.ethers;

// Script configs
const sleepToggle = true;
const sleepTime = 15000;
const recallTime = 60000
const callAttempts = 3;

// References
const txRefs = {};
const allReports = [];

// Addresses & Contracts
const governance = "0xE4ee7EdDDBEBDA077975505d11dEcb16498264fB";
const strategist = "0x4204FDD868FFe0e62F57e6A626F8C9530F7d5AD1";
const controller = "0xc335740c951F45200b38C5Ca84F0A9663b51AEC6";
const timelock = "0xE4ee7EdDDBEBDA077975505d11dEcb16498264fB";

const contracts = [
  // "src/strategies/fantom/oxd/strategy-oxd-xboo.sol:StrategyOxdXboo",
  // "src/strategies/fantom/spookyswap/strategy-boo-ftm-sushi-lp.sol:StrategyBooFtmSushiLp",
  // "src/strategies/fantom/spookyswap/strategy-boo-btc-eth-lp.sol:StrategyBooBtcEthLp",
  "src/strategies/fantom/spookyswap/strategy-boo-ftm-treeb-lp.sol:StrategyBooFtmTreebLp",
  // "src/strategies/fantom/spookyswap/strategy-boo-ftm-any-lp.sol:StrategyBooFtmAnyLp",
];

const testedStrategies = [
  "0xA6b01164af308d74eD593e24637275ee26Cf9531", "0x20b515d6fA1a248e92350d449286B8D258d91C19", "0xbe9e4d2902f23B83c9d04c1780C09809af5E7b3F", "0x2722930172C38420a4A0Aa7af67C316ebD845Be4", "0x62e02D2E56A18C5DCD5bE447D30D04C9800519E8", "0x767ef1887A71734A1F5198b2bE6dA9c32293ca5e",
];

const jarAndStrat ={};

// Script configs
const sleepToggle = true;
const sleepTime = 10000;
const recallTime = 60000
const callAttempts = 3;

// Functions
const sleep = async (ms, active=true) => {
  if (active) {
    console.log("Sleeping...")
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
};

const recall = async (fn, ...args) => {
  const delay = async() => new Promise(resolve => setTimeout(resolve, recallTime));
  await delay();
  await fn(...args);
}

const verifyContracts = async (strategies) => {
  console.log(`Verifying contracts...`);
  await Promise.all(strategies.map(async(strategy) => {
    try {
      await hre.run("verify:verify", {
        address: strategy,
        constructorArguments: [governance, strategist, controller, timelock],
      });
    } catch (e) {
      console.error(e);
    }
  }));
}

const deployAndTest = async () => {
// Script configs
  const sleepToggle = true;
  const sleepTime = 15000;
  const recallTime = 60000
  const callAttempts = 3;

// References
  const txRefs ={};
  const allReports = [];

  const executeTx = async (calls, tx, fn, ...args) => {
    await sleep(sleepTime, sleepToggle);
    recall(executeTx, calls, tx, fn, ...args);
    try {
      txRefs[tx] = await fn(...args);
      console.log(txRefs);
      if (tx === strategy || tx === jar) {
        await tx.deployTransaction.wait();
      } else {
        await tx.wait();
      }
    } catch (e) {
      console.error(e);
      if (calls > 0) {
        console.log(`Trying again. ${calls} more attempts left.`);
        await executeTx(calls - 1, tx, fn, ...args);
      } else {
        console.log('Looks like something is broken!');
        return;
      }
    }
    await sleep(sleepTime, sleepToggle);
  }

  for (const contract of contracts) {
    const StrategyFactory = await ethers.getContractFactory(contract);
    // console.log("" + StrategyFactory.deploy);
    const PickleJarFactory = await ethers.getContractFactory("src/pickle-jar.sol:PickleJar");
    const Controller = await ethers.getContractAt("src/controller-v4.sol:ControllerV4", controller);
    const currentContract = contract.substring(contract.lastIndexOf(":") + 1);

    try {
// Deploy Strategy contract
      console.log(`Deploying ${currentContract}...`);
      let strategy;
      await executeTx(callAttempts, strategy, StrategyFactory.deploy, governance, strategist, controller, timelock);
      console.log(`✔️ Strategy deployed at: ${strategy.address}`);

// Get Want
      const want = await txRefs[strategy].want();

// Deploy PickleJar contract
      let jar;
      await executeTx(callAttempts, txRefs[jar], PickleJarFactor.deploy, want, governance, timelock, controller);
      console.log(`✔️ PickleJar deployed at: ${txRefs[jar].address}`);

// Log Want
      console.log(`Want address is: ${want}`);
      console.log(`Approving want token for deposit...`);
      const wantContract = await ethers.getContractAt("ERC20", want);

// Approve Want
      let approveTx;
      await executeTx(callAttempts, approveTx, wantContract.approve, txRefs[jar].address, ethers.constants.MaxUint256);
      console.log(`✔️ Successfully approved Jar to spend want`);
      console.log(`Setting all the necessary stuff in controller...`);

// Approve Strategy
      let approveStratTx;
      await executeTx(callAttempts, approveStratTx, Controller.approveStrategy, want, txRefs[strategy].address);
      console.log(`Strategy Approved!`)

// Set Jar
      let setJarTx;
      await executeTx(callAttempts, setJarTx, Controller.setJar, want, txRefs[jar].address);
      console.log(`Jar Set!`)

// Set Strategy
      let setStratTx;
      await executeTx(callAttempts, setStratTx, Controller.setStrategy, want, strategy.address);
      console.log(`Strategy Set!`)
      console.log(`✔️ Controller params all set!`);

// Deposit Want
      console.log(`Depositing in Jar...`);
      let depositTx;
      await executeTx(callAttempts, depositTx, txRefs[jar].depositAll)
      console.log(`✔️ Successfully deposited want in Jar`);

// Call Earn
      console.log(`Calling earn...`);
      let earnTx;
      await executeTx(callAttempts, earnTx, txRefs[jar].earn);
      console.log(`✔️ Successfully called earn`);

// Call Harvest
      console.log(`Waiting for 30 seconds before harvesting...`);
      await sleep(30000);
      let harvestTx;
      await executeTx(callAttempts, harvestTx, txRefs[strategy].harvest);

      const ratio = await txRefs[jar].getRatio();

      if (ratio.gt(BigNumber.from(parseEther("1")))) {
        console.log(`✔️ Harvest was successful, ending ratio of ${ratio.toString()}`);
        testedStrategies.push({contract: currentContract, address: txRefs[strategy].address})
      } else {
        console.log(`❌ Harvest failed, ending ratio of ${ratio.toString()}`);
      }
// Script Report
      const report =
      `
      Jar Info -
      name: ${currentContract}
      want: ${want}
      picklejar: ${txRefs[jar].address}
      strategy: ${txRefs[strategy].address}
      ratio: ${ratio.toString()}
      `;

      console.log(report)
      allReports.push(report)
    } catch (e) {
      console.log(`Oops something went wrong...`);
      console.error(e);
    }
  }
  console.log(
    `
    ----------------------------
      Here's the full report -
    ----------------------------
    ${allReports.join('\n')}
    `
  );
};

const main = async () => {
  await deployAndTest();
  await verifyContracts(testedStrategies);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

