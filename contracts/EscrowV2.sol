// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IGatewayV2 {
    function withdraw(uint256 realTokenAmount, uint256 bridgedTokenAmount) external;

    function deposit(uint256 realTokenAmount) external;

    function realToken() external view returns (address);

    function bridgedToken() external view returns (address);
}

/// @notice The modified Escrow contract to work with GatewayV2
contract EscrowV2 is Initializable, AccessControlEnumerableUpgradeable {
    address public gatewayAddress;
    address public deusAddress;
    address public msigAddress;
    uint256 public thresholdAmount;

    bytes32 public constant DEPOSITOR_ROLE = keccak256("DEPOSITOR_ROLE");
    bytes32 public constant WITHDRAWER_ROLE = keccak256("WITHDRAWER_ROLE");
    bytes32 public constant ASSET_MANAGER_ROLE = keccak256("ASSET_MANAGER_ROLE");

    event DepositToGateway(uint256 amount, uint256 thresholdAmount);
    event WithdrawFromGateway(uint256 amount, uint256 thresholdAmount);
    event SetThresholdAmount(uint256 thresholdAmount);
    event WithdrawERC20(address token, address to, uint256 amount);

    function initialize(
        address _gatewayAddress,
        address _msigAddress,
        uint256 _thresholdAmount
    ) public initializer {
        __AccessControl_init();

        gatewayAddress = _gatewayAddress;
        msigAddress = _msigAddress;
        thresholdAmount = _thresholdAmount;

        deusAddress = IGatewayV2(gatewayAddress).realToken();

        _grantRole(DEFAULT_ADMIN_ROLE, _msigAddress);
    }

    function depositToGateway() external onlyRole(DEPOSITOR_ROLE) {
        uint256 gatewayBalance = IERC20(deusAddress).balanceOf(gatewayAddress);
        require(gatewayBalance < thresholdAmount, "Escrow: Gateway balance exceeds the threshold");

        uint256 requiredAmount = thresholdAmount - gatewayBalance;
        uint256 escrowBalance = IERC20(deusAddress).balanceOf(address(this));
        uint256 amount = requiredAmount < escrowBalance ? requiredAmount : escrowBalance;

        IERC20(deusAddress).approve(gatewayAddress, amount);
        IGatewayV2(gatewayAddress).deposit(amount);

        emit DepositToGateway(amount, thresholdAmount);
    }

    function withdrawFromGateway() external onlyRole(WITHDRAWER_ROLE) {
        uint256 gatewayBalance = IERC20(deusAddress).balanceOf(gatewayAddress);
        require(gatewayBalance > thresholdAmount, "Escrow: Gateway balance is below the threshold");

        uint256 requiredAmount = gatewayBalance - thresholdAmount;
        IGatewayV2(gatewayAddress).withdraw(requiredAmount, 0);

        emit WithdrawFromGateway(requiredAmount, thresholdAmount);
    }

    function setThresholdAmount(uint256 _thresholdAmount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        thresholdAmount = _thresholdAmount;

        emit SetThresholdAmount(_thresholdAmount);
    }

    function withdrawERC20(address token, uint256 amount) external onlyRole(ASSET_MANAGER_ROLE) {
        IERC20(token).transfer(msigAddress, amount);

        emit WithdrawERC20(token, msigAddress, amount);
    }

    function _call(
        address _target,
        bytes calldata _calldata)
    external
    payable
    onlyRole(DEFAULT_ADMIN_ROLE)
    returns (bool _success, bytes memory _resultdata) {
        return _target.call{value : msg.value}(_calldata);
    }
}
