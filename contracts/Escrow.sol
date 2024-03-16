// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPortal {
	function withdraw(uint256 realTokenAmount, uint256 axlTokenAmount) external;

	function deposit(uint256 realTokenAmount, uint256 axlTokenAmount) external;
}

contract Escrow is Initializable, AccessControlUpgradeable {
	address public portalAddress;
	address public deusAddress;
	uint256 public thresholdAmount;

	bytes32 public constant DEPOSIT_ROLE = keccak256("DEPOSIT_ROLE");
	bytes32 public constant WITHDRAW_ROLE = keccak256("WITHDRAW_ROLE");

	event DepositToPortal(uint256 amount, uint256 thresholdAmount);
	event WithdrawFromPortal(uint256 amount, uint256 thresholdAmount);
	event SetThresholdAmount(uint256 thresholdAmount);
	event WithdrawToken(address token, address to, uint256 amount);

	function initialize(address _portalAddress, address _deusAddress, uint256 _thresholdAmount) public initializer {
		__AccessControl_init();
		__Escrow_init_unchained(_portalAddress, _deusAddress, _thresholdAmount);
	}

	function __Escrow_init_unchained(address _portalAddress, address _deusAddress, uint256 _thresholdAmount) internal onlyInitializing {
		portalAddress = _portalAddress;
		deusAddress = _deusAddress;
		thresholdAmount = _thresholdAmount;

		_setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
	}

	function depositToPortal() external onlyRole(DEPOSIT_ROLE) {
		uint256 portalBalance = IERC20(deusAddress).balanceOf(portalAddress);
		require(portalBalance <= thresholdAmount, "Escrow: Portal balance exceeds threshold, cannot deposit");

		uint256 requiredAmount = thresholdAmount - portalBalance;
		uint256 escrowBalance = IERC20(deusAddress).balanceOf(address(this));
		require(escrowBalance >= requiredAmount, "Escrow: Insufficient Escrow balance for required deposit");

		IERC20(deusAddress).approve(portalAddress, requiredAmount);
		IPortal(portalAddress).deposit(requiredAmount, 0);

		emit DepositToPortal(requiredAmount, thresholdAmount);
	}

	function withdrawFromPortal() external onlyRole(WITHDRAW_ROLE) {
		uint256 portalBalance = IERC20(deusAddress).balanceOf(portalAddress);
		require(portalBalance >= thresholdAmount, "Escrow: Portal balance below threshold, cannot withdraw");

		uint256 requiredAmount = portalBalance - thresholdAmount;
		IPortal(portalAddress).withdraw(requiredAmount, 0);

		emit WithdrawFromPortal(requiredAmount, thresholdAmount);
	}

	function setThresholdAmount(uint256 _thresholdAmount) external onlyRole(DEFAULT_ADMIN_ROLE) {
		thresholdAmount = _thresholdAmount;

		emit SetThresholdAmount(_thresholdAmount);
	}

	function withdraw(address token, address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
		IERC20(token).transfer(to, amount);

		emit WithdrawToken(token, to, amount);
	}
}
