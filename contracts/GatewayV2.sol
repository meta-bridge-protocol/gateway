// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/// @title GatewayV2
/// @author DEUS Finance
/// @notice This contract allows users to swap bridged tokens to real tokens and vice versa.
contract GatewayV2 is ReentrancyGuard, AccessControlEnumerable, Pausable {
	using SafeERC20 for IERC20;

	enum SwapType {
		TO_REAL,
		TO_BRIDGED
	}

	bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

	address public realToken;
	address public bridgedToken;

	mapping(address => uint256) public deposits;

	/// @notice Event to log the successful token swap.
	/// @param from The address that initiated the swap.
	/// @param to The address that received the swapped tokens.
	/// @param fromToken The address of the token that was swapped.
	/// @param toToken The address of the token that was received.
	/// @param amount The amount of tokens swapped.
	event TokenSwapped(
		address indexed from,
		address to,
		address indexed fromToken,
		address indexed toToken,
		uint256 amount
	);

	/// @notice Event to log the successful deposit of tokens.
	/// @param user The address of the user who deposited.
	/// @param realTokenAmount The amount of real tokens deposited.
	event Deposited(address indexed user, uint256 realTokenAmount);

	/// @notice Event to log the successful withdrawal of tokens.
	/// @param user The address of the user who withdrew.
	/// @param realTokenAmount The amount of real tokens withdrawn.
	/// @param bridgedTokenAmount The amount of bridged tokens withdrawn.
	event Withdrawn(address indexed user, uint256 realTokenAmount, uint256 bridgedTokenAmount);

	/// @notice Constructs a new GatewayV2 contract.
	constructor(address _admin, address _realToken, address _bridgedToken) {
		require(_admin != address(0), "Gateway: ADMIN_ADDRESS_MUST_BE_NON-ZERO");

		_grantRole(DEFAULT_ADMIN_ROLE, _admin);

		realToken = _realToken;
		bridgedToken = _bridgedToken;
	}

	/// @notice Swaps a specified amount of bridged tokens to real tokens.
	/// @param amount The amount of bridged tokens to swap.
	function swapToReal(uint256 amount) external nonReentrant whenNotPaused {
		_swap(amount, msg.sender, SwapType.TO_REAL);
	}

	/// @notice Swaps a specified amount of real tokens to bridged tokens.
	/// @param amount The amount of real tokens to swap.
	function swapToBridged(uint256 amount) external nonReentrant whenNotPaused {
		_swap(amount, msg.sender, SwapType.TO_BRIDGED);
	}

	/// @notice Swaps a specified amount of bridged tokens to real tokens.
	/// @param amount The amount of bridged tokens to swap.
	/// @param to The recipient address of the real tokens.
	function swapToRealTo(uint256 amount, address to) external nonReentrant whenNotPaused {
		_swap(amount, to, SwapType.TO_REAL);
	}

	/// @notice Swaps a specified amount of real tokens to bridged tokens.
	/// @param amount The amount of real tokens to swap.
	/// @param to The recipient address of the bridged tokens.
	function swapToBridgedTo(uint256 amount, address to) external nonReentrant whenNotPaused {
		_swap(amount, to, SwapType.TO_BRIDGED);
	}

	/// @notice Allows users to deposit real tokens.
	/// @param realTokenAmount The amount of real tokens to deposit.
	function deposit(uint256 realTokenAmount) external nonReentrant whenNotPaused {
		require(realTokenAmount > 0, "Gateway: TOTAL_DEPOSIT_MUST_BE_GREATER_THAN_0");

		uint256 balance = IERC20(realToken).balanceOf(address(this));

		IERC20(realToken).safeTransferFrom(msg.sender, address(this), realTokenAmount);

		uint256 receivedAmount = IERC20(realToken).balanceOf(address(this)) - balance;
		require(realTokenAmount == receivedAmount, "Gateway: INVALID_RECEIVED_AMOUNT");

		deposits[msg.sender] += realTokenAmount;

		emit Deposited(msg.sender, realTokenAmount);
	}

	/// @notice Allows users to withdraw both real tokens and bridged tokens.
	/// @param realTokenAmount The amount of real tokens to withdraw.
	/// @param bridgedTokenAmount The amount of bridged tokens to withdraw.
	function withdraw(uint256 realTokenAmount, uint256 bridgedTokenAmount) external nonReentrant whenNotPaused {
		uint256 totalWithdrawal = realTokenAmount + bridgedTokenAmount;
		require(totalWithdrawal > 0, "Gateway: TOTAL_WITHDRAWAL_MUST_BE_GREATER_THAN_0");
		require(deposits[msg.sender] >= totalWithdrawal, "Gateway: INSUFFICIENT_USER_BALANCE");

		deposits[msg.sender] -= totalWithdrawal;
		if (realTokenAmount > 0) {
			IERC20(realToken).safeTransfer(msg.sender, realTokenAmount);
		}
		if (bridgedTokenAmount > 0) {
			IERC20(bridgedToken).safeTransfer(msg.sender, bridgedTokenAmount);
		}

		emit Withdrawn(msg.sender, realTokenAmount, bridgedTokenAmount);
	}

	/// @notice Pauses the contract.
	function pause() external onlyRole(PAUSER_ROLE) {
		_pause();
	}

	/// @notice Unpauses the contract.
	function unpause() external onlyRole(PAUSER_ROLE) {
		_unpause();
	}

	/// @dev Internal function to handle the token swap.
	/// @param amount_ The amount of tokens to swap.
	/// @param to_ The recipient address of the swapped tokens.
	/// @param type_ The swap type (TO_REAL or TO_BRIDGED).
	function _swap(uint256 amount_, address to_, SwapType type_) internal {
		require(amount_ > 0, "Gateway: AMOUNT_MUST_BE_GREATER_THAN_0");
		require(to_ != address(0), "Gateway: RECIPIENT_ADDRESS_MUST_BE_NON-ZERO");

		address fromToken;
		address toToken;
		if (type_ == SwapType.TO_BRIDGED) {
			fromToken = realToken;
			toToken = bridgedToken;
		} else if (type_ == SwapType.TO_REAL) {
			fromToken = bridgedToken;
			toToken = realToken;
		} else {
			revert("Invalid SwapType");
		}

		uint256 balance = IERC20(fromToken).balanceOf(address(this));

		IERC20(fromToken).safeTransferFrom(msg.sender, address(this), amount_);

		uint256 receivedAmount = IERC20(fromToken).balanceOf(address(this)) - balance;
		require(amount_ == receivedAmount, "Gateway: INVALID_RECEIVED_AMOUNT");

		IERC20(toToken).safeTransfer(to_, amount_);

		emit TokenSwapped(msg.sender, to_, fromToken, toToken, amount_);
	}
}
