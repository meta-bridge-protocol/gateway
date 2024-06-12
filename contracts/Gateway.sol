// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/// @title Gateway
/// @author DEUS Finance
/// @notice This contract allows users to swap bridged tokens to real tokens and vice versa.
contract Gateway is ReentrancyGuard, AccessControlEnumerable, Pausable {
    using SafeERC20 for IERC20;

    enum SwapType {
        TO_REAL,
        TO_BRIDGED
    }

    struct Token {
        uint16 id;
        address realToken;
        address bridgedToken;
        bool active;
    }

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UNPAUSER_ROLE = keccak256("UNPAUSER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    uint16 public lastTokenId;

    mapping(uint16 => Token) public tokens;
    mapping(uint16 => mapping(address => uint256)) public deposits;

    mapping(address => uint16) public tokensFromReal;
    mapping(address => uint16) public tokensFromBridged;

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
        address indexed toToken, uint256 amount
    );

    /// @notice Event to log the successful deposit of tokens.
    /// @param user The address of the user who deposited.
    /// @param tokenId The token deposited to.
    /// @param realTokenAmount The amount of real tokens deposited.
    /// @param bridgedTokenAmount The amount of bridged tokens deposited.
    event Deposited(
        address indexed user,
        uint16 tokenId,
        uint256 realTokenAmount,
        uint256 bridgedTokenAmount
    );


    /// @notice Event to log the successful withdrawal of tokens.
    /// @param user The address of the user who withdrew.
    /// @param tokenId The token withdrawn from.
    /// @param realTokenAmount The amount of real tokens withdrawn.
    /// @param bridgedTokenAmount The amount of bridged tokens withdrawn.
    event Withdrawn(
        address indexed user,
        uint16 tokenId,
        uint256 realTokenAmount,
        uint256 bridgedTokenAmount
    );

    /// @notice Constructs a new Gateway contract.
    constructor(
        address admin,
        address operator
    ) {
        require(admin != address(0), "Gateway: ADMIN_ADDRESS_MUST_BE_NON-ZERO");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, operator);
    }

    /// @notice Get a Token info via its real token address.
    /// @param realToken The address of the corresponding real token.
    /// @return Token info
    function getTokenViaReal(address realToken) external view returns (Token memory) {
        uint16 tokenId = tokensFromReal[realToken];
        return tokens[tokenId];
    }

    /// @notice Get a Token info via its bridged token address.
    /// @param bridgedToken The address of the bridged token.
    /// @return Token info
    function getTokenViaBridged(address bridgedToken) external view returns (Token memory) {
        uint16 tokenId = tokensFromBridged[bridgedToken];
        return tokens[tokenId];
    }

    /// @notice Add a new Token. Can only calls by an address with OPERATOR_ROLE.
    /// @param realToken The address of the corresponding real token.
    /// @param bridgedToken The address of the bridged token.
    /// @return tokenId The ID of the new added token.
    function addToken(
        address realToken,
        address bridgedToken
    ) external onlyRole(OPERATOR_ROLE) returns (uint16 tokenId) {
        require(bridgedToken != address(0), "Gateway: BRIDGED_TOKEN_ADDRESS_MUST_BE_NON-ZERO");
        require(realToken != address(0), "Gateway: REAL_TOKEN_ADDRESS_MUST_BE_NON-ZERO");
        require(tokensFromReal[realToken] == 0, "Gateway: DUPLICATE_REAL_TOKEN");
        require(tokensFromBridged[bridgedToken] == 0, "Gateway: DUPLICATE_BRIDGED_TOKEN");

        tokenId = ++lastTokenId;
        tokens[tokenId] = Token(tokenId, realToken, bridgedToken, true);
        tokensFromReal[realToken] = tokenId;
        tokensFromBridged[bridgedToken] = tokenId;
    }

    /// @notice Remove an existing Token. Can only calls by an address with OPERATOR_ROLE.
    /// @param tokenId The ID of the token to remove.
    function removeToken(
        uint16 tokenId
    ) external onlyRole(OPERATOR_ROLE) {
        require(tokenId != 0 && tokens[tokenId].id == tokenId, "Gateway: INVALID_TOKEN");

        delete tokensFromReal[tokens[tokenId].realToken];
        delete tokensFromBridged[tokens[tokenId].bridgedToken];
        delete tokens[tokenId];
    }

    /// @notice Update an existing Token activation. Can only calls by an address with OPERATOR_ROLE.
    /// @param tokenId The ID of the token to set activation.
    /// @param active The activation value.
    function setTokenActivation(
        uint16 tokenId,
        bool active
    ) external onlyRole(OPERATOR_ROLE) {
        require(tokenId != 0 && tokens[tokenId].id == tokenId, "Gateway: INVALID_TOKEN");

        tokens[tokenId].active = active;
    }

    /// @notice Swaps a specified amount of bridged tokens to real tokens.
    /// @param tokenId The token to swap.
    /// @param amount The amount of bridged tokens to swap.
    function swapToReal(
        uint16 tokenId,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        _swap(tokenId, amount, msg.sender, SwapType.TO_REAL);
    }

    /// @notice Swaps a specified amount of real tokens to bridged tokens.
    /// @param tokenId The token to swap.
    /// @param amount The amount of real tokens to swap.
    function swapToBridged(
        uint16 tokenId,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        _swap(tokenId, amount, msg.sender, SwapType.TO_BRIDGED);
    }

    /// @notice Swaps a specified amount of bridged tokens to real tokens.
    /// @param tokenId The token to swap.
    /// @param amount The amount of bridged tokens to swap.
    /// @param to The recipient address of the real tokens.
    function swapToRealTo(
        uint16 tokenId,
        uint256 amount,
        address to
    ) external nonReentrant whenNotPaused {
        _swap(tokenId, amount, to, SwapType.TO_REAL);
    }

    /// @notice Swaps a specified amount of real tokens to bridged tokens.
    /// @param tokenId The token to swap.
    /// @param amount The amount of real tokens to swap.
    /// @param to The recipient address of the bridged tokens.
    function swapToBridgedTo(
        uint16 tokenId,
        uint256 amount,
        address to
    ) external nonReentrant whenNotPaused {
        _swap(tokenId, amount, to, SwapType.TO_BRIDGED);
    }

    /// @dev Internal function to handle the token swap.
    /// @param tokenId The token to swap.
    /// @param amount The amount of tokens to swap.
    /// @param to The recipient address of the swapped tokens.
    /// @param type_ The swap type (TO_REAL or TO_BRIDGED).
    function _swap(
        uint16 tokenId,
        uint256 amount,
        address to,
        SwapType type_
    ) internal {
        require(amount > 0, "Gateway: AMOUNT_MUST_BE_GREATER_THAN_0");
        require(to != address(0), "Gateway: RECIPIENT_ADDRESS_MUST_BE_NON-ZERO");

        Token memory token = tokens[tokenId];
        require(token.active, "Gateway: INACTIVE_TOKEN");

        address fromToken;
        address toToken;
        if (type_ == SwapType.TO_BRIDGED) {
            fromToken = token.realToken;
            toToken = token.bridgedToken;
        } else {
            fromToken = token.bridgedToken;
            toToken = token.realToken;
        }

        IERC20(fromToken).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(toToken).safeTransfer(to, amount);

        emit TokenSwapped(msg.sender, to, fromToken, toToken, amount);
    }

    /// @notice Allows users to deposit both real tokens and bridged tokens.
    /// @param tokenId The token to deposit to.
    /// @param realTokenAmount The amount of real tokens to deposit.
    /// @param bridgedTokenAmount The amount of bridged tokens to deposit.
    function deposit(
        uint16 tokenId,
        uint256 realTokenAmount,
        uint256 bridgedTokenAmount
    ) external nonReentrant whenNotPaused {
        require(realTokenAmount + bridgedTokenAmount > 0, "Gateway: TOTAL_DEPOSIT_MUST_BE_GREATER_THAN_0");

        Token memory token = tokens[tokenId];
        require(token.active, "Gateway: INACTIVE_TOKEN");

        if (realTokenAmount > 0) {
            IERC20(token.realToken).safeTransferFrom(msg.sender, address(this), realTokenAmount);
        }
        if (bridgedTokenAmount > 0) {
            IERC20(token.bridgedToken).safeTransferFrom(msg.sender, address(this), bridgedTokenAmount);
        }

        deposits[tokenId][msg.sender] += realTokenAmount + bridgedTokenAmount;

        emit Deposited(msg.sender, tokenId, realTokenAmount, bridgedTokenAmount);
    }

    /// @notice Allows users to withdraw both real tokens and bridged tokens.
    /// @param tokenId The token to withdraw from.
    /// @param realTokenAmount The amount of real tokens to withdraw.
    /// @param bridgedTokenAmount The amount of bridged tokens to withdraw.
    function withdraw(
        uint16 tokenId,
        uint256 realTokenAmount,
        uint256 bridgedTokenAmount
    ) external nonReentrant whenNotPaused {
        uint256 totalWithdrawal = realTokenAmount + bridgedTokenAmount;
        require(totalWithdrawal > 0, "Gateway: TOTAL_WITHDRAWAL_MUST_BE_GREATER_THAN_0");
        require(deposits[tokenId][msg.sender] >= totalWithdrawal, "Gateway: INSUFFICIENT_USER_BALANCE");

        Token memory token = tokens[tokenId];
        require(token.active, "Gateway: INACTIVE_TOKEN");

        deposits[tokenId][msg.sender] -= totalWithdrawal;
        if (realTokenAmount > 0) {
            IERC20(token.realToken).safeTransfer(msg.sender, realTokenAmount);
        }
        if (bridgedTokenAmount > 0) {
            IERC20(token.bridgedToken).safeTransfer(msg.sender, bridgedTokenAmount);
        }

        emit Withdrawn(msg.sender, tokenId, realTokenAmount, bridgedTokenAmount);
    }

    /// @notice Pauses the contract.
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /// @notice Unpauses the contract.
    function unpause() external onlyRole(UNPAUSER_ROLE) {
        _unpause();
    }
}
