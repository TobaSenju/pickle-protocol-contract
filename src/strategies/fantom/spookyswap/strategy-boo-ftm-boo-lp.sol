// SPDX-License-Identifier: MIT
pragma solidity ^0.6.7;

import "../strategy-spookyswap-base.sol";

contract StrategyBooFtmBooLp is StrategyBooFarmLPBase {
    uint256 public ftm_boo_poolid = 0;
    // Token addresses
    address public ftm_boo_lp = 0xEc7178F4C41f346b2721907F5cF7628E388A7a58;

    constructor(
        address _governance,
        address _strategist,
        address _controller,
        address _timelock
    )
        public
        StrategyNettFarmLPBase(
            ftm_boo_lp,
            ftm_boo_poolid,
            _governance,
            _strategist,
            _controller,
            _timelock
        )
    {
        swapRoutes[ftm] = [boo, ftm];
    }

    // **** Views ****

    function getName() external pure override returns (string memory) {
        return "StrategyBooFtmBooLp";
    }
}
