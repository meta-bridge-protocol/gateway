// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title AxelarGateway
/// @author DEUS Finance
/// @notice This contract allows users to swap "axl" prefixed tokens to real tokens and vice versa.
contract AxelarGateway is ReentrancyGuard, AccessControlEnumerable, Pausable {
	address public axlToken;
	address public realToken;

	bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
	bytes32 public constant UNPAUSER_ROLE = keccak256("UNPAUSER_ROLE");

	mapping(address => uint256) public deposits; // Track the deposits of users

	/// @notice Event to log the successful token swap.
	/// @param from The address that initiated the swap.
	/// @param to The address that received the swapped tokens.
	/// @param fromToken The address of the token that was swapped.
	/// @param toToken The address of the token that was received.
	/// @param amount The amount of tokens swapped.
	event TokenSwapped(address indexed from, address to, address indexed fromToken, address indexed toToken, uint256 amount);

	/// @notice Event to log the successful deposit of tokens.
	/// @param user The address of the user who deposited.
	/// @param realTokenAmount The amount of real tokens deposited.
	/// @param axlTokenAmount The amount of axl prefixed tokens deposited.
	event Deposited(address indexed user, uint256 realTokenAmount, uint256 axlTokenAmount);

	/// @notice Event to log the successful withdrawal of tokens.
	/// @param user The address of the user who withdrew.
	/// @param realTokenAmount The amount of real tokens withdrawn.
	/// @param axlTokenAmount The amount of axl prefixed tokens withdrawn.
	event Withdrawn(address indexed user, uint256 realTokenAmount, uint256 axlTokenAmount);

	/// @notice Constructs a new AxelarGateway contract.
	/// @param axlToken_ The address of the "axl" prefixed token.
	/// @param realToken_ The address of the corresponding real token.
	constructor(address admin, address axlToken_, address realToken_) {
		require(admin != address(0), "AxelarGateway: ADMIN_ADDRESS_MUST_BE_NON-ZERO");
		require(axlToken_ != address(0), "AxelarGateway: AXL_TOKEN_ADDRESS_MUST_BE_NON-ZERO");
		require(realToken_ != address(0), "AxelarGateway: REAL_TOKEN_ADDRESS_MUST_BE_NON-ZERO");

		_grantRole(DEFAULT_ADMIN_ROLE, admin);

		axlToken = axlToken_;
		realToken = realToken_;
	}

	/// @notice Swaps a specified amount of "axl" prefixed tokens to real tokens.
	/// @param amount The amount of "axl" prefixed tokens to swap.
	function swapToReal(uint256 amount) external nonReentrant whenNotPaused {
		_swap(amount, msg.sender, axlToken, realToken);
	}

	/// @notice Swaps a specified amount of real tokens to "axl" prefixed tokens.
	/// @param amount The amount of real tokens to swap.
	function swapToAxl(uint256 amount) external nonReentrant whenNotPaused {
		_swap(amount, msg.sender, realToken, axlToken);
	}

	/// @notice Swaps a specified amount of "axl" prefixed tokens to real tokens.
	/// @param amount The amount of "axl" prefixed tokens to swap.
	/// @param to The recipient address of the real tokens.
	function swapToRealTo(uint256 amount, address to) external nonReentrant whenNotPaused {
		_swap(amount, to, axlToken, realToken);
	}

	/// @notice Swaps a specified amount of real tokens to "axl" prefixed tokens.
	/// @param amount The amount of real tokens to swap.
	/// @param to The recipient address of the "axl" prefixed tokens.
	function swapToAxlTo(uint256 amount, address to) external nonReentrant whenNotPaused {
		_swap(amount, to, realToken, axlToken);
	}

	/// @dev Internal function to handle the token swap.
	/// @param amount The amount of tokens to swap.
	/// @param to The recipient address of the swapped tokens.
	/// @param fromToken The address of the token that is being swapped.
	/// @param toToken The address of the token that is being received.
	function _swap(uint256 amount, address to, address fromToken, address toToken) internal {
		require(amount > 0, "AxelarGateway: AMOUNT_MUST_BE_GREATER_THAN_0");
		require(to != address(0), "AxelarGateway: RECIPIENT_ADDRESS_MUST_BE_NON-ZERO");

		IERC20(fromToken).transferFrom(msg.sender, address(this), amount);
		IERC20(toToken).transfer(to, amount);

		emit TokenSwapped(msg.sender, to, fromToken, toToken, amount);
	}

	/// @notice Allows users to deposit both real tokens and "axl" prefixed tokens.
	/// @param realTokenAmount The amount of real tokens to deposit.
	/// @param axlTokenAmount The amount of "axl" prefixed tokens to deposit.
	function deposit(uint256 realTokenAmount, uint256 axlTokenAmount) external nonReentrant whenNotPaused {
		require(realTokenAmount + axlTokenAmount > 0, "AxelarGateway: TOTAL_DEPOSIT_MUST_BE_GREATER_THAN_0");

		if (realTokenAmount > 0) {
			IERC20(realToken).transferFrom(msg.sender, address(this), realTokenAmount);
		}
		if (axlTokenAmount > 0) {
			IERC20(axlToken).transferFrom(msg.sender, address(this), axlTokenAmount);
		}

		deposits[msg.sender] += realTokenAmount + axlTokenAmount;
		emit Deposited(msg.sender, realTokenAmount, axlTokenAmount);
	}

	/// @notice Allows users to withdraw both real tokens and "axl" prefixed tokens.
	/// @param realTokenAmount The amount of real tokens to withdraw.
	/// @param axlTokenAmount The amount of "axl" prefixed tokens to withdraw.
	function withdraw(uint256 realTokenAmount, uint256 axlTokenAmount) external nonReentrant whenNotPaused {
		require(realTokenAmount + axlTokenAmount > 0, "AxelarGateway: TOTAL_WITHDRAWAL_MUST_BE_GREATER_THAN_0");
		uint256 totalWithdrawal = realTokenAmount + axlTokenAmount;

		require(deposits[msg.sender] >= totalWithdrawal, "AxelarGateway: INSUFFICIENT_USER_BALANCE");

		deposits[msg.sender] -= totalWithdrawal;

		if (realTokenAmount > 0) {
			IERC20(realToken).transfer(msg.sender, realTokenAmount);
		}
		if (axlTokenAmount > 0) {
			IERC20(axlToken).transfer(msg.sender, axlTokenAmount);
		}

		emit Withdrawn(msg.sender, realTokenAmount, axlTokenAmount);
	}

	function pause() external onlyRole(PAUSER_ROLE) {
		_pause();
	}

	function unpause() external onlyRole(UNPAUSER_ROLE) {
		_unpause();
	}
}
