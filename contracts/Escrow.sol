// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";

interface IPortal {
	function withdraw(uint256 realTokenAmount, uint256 axlTokenAmount) external;

	function deposit(uint256 realTokenAmount, uint256 axlTokenAmount) external;
}

contract Escrow is Initializable, AccessControlEnumerableUpgradeable {
	address public portalAddress;
	address public deusAddress;
	uint256 public thresholdAmount;

	bytes32 public constant DEPOSITOR_ROLE = keccak256("DEPOSITOR_ROLE");
	bytes32 public constant WITHDRAWER_ROLE = keccak256("WITHDRAWER_ROLE");

	event DepositToPortal(uint256 amount, uint256 thresholdAmount);
	event WithdrawFromPortal(uint256 amount, uint256 thresholdAmount);
	event SetThresholdAmount(uint256 thresholdAmount);
	event WithdrawERC20(address token, address to, uint256 amount);

	function initialize(address _portalAddress, address _deusAddress, address _msigAddress, uint256 _thresholdAmount) public initializer {
		__AccessControl_init();

		msigAddress = _msigAddress;
		portalAddress = _portalAddress;
		deusAddress = _deusAddress;
		thresholdAmount = _thresholdAmount;

		_grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
	}

	function depositToPortal() external onlyRole(DEPOSITOR_ROLE) {
		uint256 portalBalance = IERC20(deusAddress).balanceOf(portalAddress);
		require(portalBalance < thresholdAmount, "Escrow: Portal balance exceeds the threshold");

		uint256 requiredAmount = thresholdAmount - portalBalance;
		uint256 escrowBalance = IERC20(deusAddress).balanceOf(address(this));
		uint256 amount = requiredAmount < escrowBalance ? requiredAmount : escrowBalance;

		IERC20(deusAddress).approve(portalAddress, amount);
		IPortal(portalAddress).deposit(amount, 0);

		emit DepositToPortal(amount, thresholdAmount);
	}

	function withdrawFromPortal() external onlyRole(WITHDRAWER_ROLE) {
		uint256 portalBalance = IERC20(deusAddress).balanceOf(portalAddress);
		require(portalBalance > thresholdAmount, "Escrow: Portal balance is below the threshold");

		uint256 requiredAmount = portalBalance - thresholdAmount;
		IPortal(portalAddress).withdraw(requiredAmount, 0);

		emit WithdrawFromPortal(requiredAmount, thresholdAmount);
	}

	function setThresholdAmount(uint256 _thresholdAmount) external onlyRole(DEFAULT_ADMIN_ROLE) {
		thresholdAmount = _thresholdAmount;

		emit SetThresholdAmount(_thresholdAmount);
	}

	function withdrawERC20(address token, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
		IERC20(token).transfer(msigAddress, amount);

		emit WithdrawERC20(token, msigAddress, amount);
	}
}
