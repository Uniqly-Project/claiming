// SPDX-License-Identifier: MIT
pragma solidity 0.8.5;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract UniqlyClaiming is Ownable{
    
    /// ----- VARIABLES ----- ///
    
    /// Settings
    
    /// @dev Claiming Price
    uint internal _standardClaimingPrice;
    
    /// @dev Owner Changing price
    uint internal _standardOwnerChangingPrice;
    
    /// @dev Verification price
    uint internal _standardPriceForVerification;
    
    /// @dev address of ERC20 token 
    address internal _ERC20tokenAddress;
    
    /// NFT Contracts
    
    /// @dev Contract Addresses Accepted By Uniqly
    mapping(address => bool) internal _acceptedContracts;
    
    /// @dev Price for claiming in Native ERC20 token
    mapping(address => uint) internal _pricesForClaiming;

    /// @dev Change Onwer
    mapping(address => uint) internal _pricesForOwnerChanging;

    /// @dev isBurable
    mapping(address => bool) internal _isBurnable;
    
    /// Token 

    /// @dev Returns true if token was claimed
    mapping(address => mapping(uint => bool)) internal _isTokenClaimed;
    
    /// @dev Claimed ids of contract
    mapping(address => uint[]) internal _claimedIds;
    
    /// @dev Owners addresses Array
    mapping(address => mapping(uint => mapping(uint => address))) internal _ownersAddresses;
    
    /// @dev Owners array count
    mapping(address => mapping(uint => uint)) internal _ownersCount;
    
    /// Name verification
    
    /// @dev Nonce for verification
    mapping(uint => bool) internal _isNonceRedeemed;

    /// @dev Addresses owners 
    mapping(address => string) internal _addressesOwners;
    
    /// @dev Is onwer verified
    mapping(address => bool) internal _isAddressesOwnerVerified;
    
    /// @dev Is address was used 
    mapping(address => bool) internal _isAddressUsed; 

    /// @dev Is free claiming for verified users
    mapping(address => bool ) internal _isFreeClaimingForVerifiedUsers; 
 
    /// ----- EVENTS ----- ///

    event Claim(
        address indexed _contractAddress,
        address indexed _claimer,
        uint256 indexed _tokenId,
        string _claimersName
    );

    event ChangeOwner(
        address indexed _contractAddress,
        uint indexed _id,
        address _newOwner,
        address indexed _prevOwner,
        string _newOwnersName
    );
    
    /// ----- VIEWS ----- ///

    /// @notice Returns true if token was claimed
    function isTokenClaimed(address _address, uint _tokenId) external view returns(bool){
        return _isTokenClaimed[_address][_tokenId];
    }

    /// @notice Returns true for authorized contract addresses
    function isContractAuthorized(address _address) external view returns(bool){
        return _acceptedContracts[_address];
    }

    /// @notice Returns last owners address, name and verification status
    /// @dev this functions is tested by other functions' test
    function getLastOwnerOf(address _address, uint _id) external view returns(address, string memory, bool){
        uint len = _ownersCount[_address][_id] - 1;
        address ownerAddress = _ownersAddresses[_address][_id][len];
        return(ownerAddress, _addressesOwners[ownerAddress], _isAddressesOwnerVerified[ownerAddress]);
    }
    
    /// @notice Returns true when nonce was redeemed
    function isNonceRedeemed(uint _nonce) external view returns(bool){
        return _isNonceRedeemed[_nonce];
    }

    /// @notice Returns owners count of token
    function getOwnersCountOfToken(address _address, uint _id) external view returns(uint){
        return(_ownersCount[_address][_id]);
    }

    /// @notice Returns owners name and verification status
    /// @dev this functions is tested by other functions' test
    function getAddressOwnerInfo(address _address) external view returns(string memory, bool){
        require(_isAddressUsed[_address],"Address not used yet");
        return (_addressesOwners[_address], _isAddressesOwnerVerified[_address]);
    }

    /// @notice Returns address and name of token owner by position in array
    function getOwnerOfTokenByPosition(address _address, uint _id, uint _position) external view returns(address, string memory){
        address ownerAddress = _ownersAddresses[_address][_id][_position];
        return(ownerAddress, _addressesOwners[ownerAddress] );
    }

    /// @notice Returns all token holders names
    function getAllTokenHoldersNamesHistory(address _address, uint _id) external view returns(string[] memory){
        uint len = _ownersCount[_address][_id];
        if (len == 0){
            return new string[](0);
        }
        string[] memory res = new string[](len);
        uint index;
        for(index=0; index < len; index++){
            res[index] = _addressesOwners[_ownersAddresses[_address][_id][index]];
        }
        return res;
    }

    /// @notice Returns all token holders addresses
    function getAllTokenHoldersAddressesHistory(address _address, uint _id) external view returns(address[] memory){
        uint len = _ownersCount[_address][_id];
        if (len == 0){
            return new address[](0);
        }
        address[] memory res = new address[](len);
        uint index;
        for(index=0; index < len; index++){
            res[index] = _ownersAddresses[_address][_id][index];
        }
        return res;
    }

    /// @notice Returns all claimed ids of selected collection
    function getClaimedIdsOfCollection(address _address) external view returns(uint[] memory){
        uint len = _claimedIds[_address].length;
        if (len == 0){
            return new uint[](0);
        }
        uint[] memory res = new uint[](len);
        uint index;
        for(index=0; index < len; index++){
            res[index] = _claimedIds[_address][index];
        }
        return res;
    }

    /// @notice Returns how many items of collection was claimed
    function getClaimedCountOf(address _address) external view returns(uint){
        return _claimedIds[_address].length;
    } 
    
    /// @notice Returns Claiming Standard price
    function getStandardClaimingPrice() external view returns(uint){
        return _standardClaimingPrice;
    }
    
    /// @notice Returns Claiming Price For selected contract
    function getClaimingPriceForContract(address _address) external view returns(uint){
        return _getCorrectPrice(_pricesForClaiming[_address], _standardClaimingPrice);
    }

    /// @notice Returns Holders Change Rate For selected contract
    function getChangeOwnerPriceForContract(address _address) external view returns(uint){
        return _getCorrectPrice(_pricesForOwnerChanging[_address], _standardOwnerChangingPrice);
    }

    /// @notice Returns Standard Price For Verification
    function getPriceForVerification() external view returns(uint){
        return _standardPriceForVerification;
    }

    /// @notice Returns true for burnable tokens in contract 
    function isBurnable(address _address) external view returns(bool){
        return _isBurnable[_address];
    }

    /// @notice Is free claim for verified users
    function isFreeClaimForVerified(address _address) external view returns(bool){
        return _isFreeClaimingForVerifiedUsers[_address];
    }

    /// ----- PUBLIC METHODS ----- ///

    //TODO Change to internal
    /// @notice Used for claiming
    /// @dev not test about functions related signature
    function getMessageHashForClaim(
        address _contractAddress,
        address _tokenOwner,
        uint256 _tokenId,
        string memory _claimersName,
        bool _isVerified
    ) public pure returns (bytes32) {
        return
            keccak256(abi.encodePacked(_contractAddress, _tokenOwner, _tokenId, _claimersName, _isVerified));
    }
    
    //TODO Change to internal
    /// @notice Used for verification
    /// @dev not test about functions related signature
    function getMessageHashForOwnerChange(
        address _address,
        string memory _claimersName,
        uint _nonce
    ) public pure returns (bytes32) {
        return
            keccak256(abi.encodePacked(_address, _claimersName, _nonce));
    }

    /// @notice Claim Function 
    function claim(
        address _contractAddress,
        uint256 _tokenId,
        string memory _claimersName,
        bool _isVerified,
        bytes memory _signature
    ) external {
        require(_acceptedContracts[_contractAddress], "Contract address is not authorized");
        require(!_isTokenClaimed[_contractAddress][_tokenId], "Can't be claimed again");
        IERC721 token = IERC721(_contractAddress);
        require(token.ownerOf(_tokenId) == msg.sender, "You need to own this token");

        if(_isBurnable[_contractAddress]){
            IERC721Burnable(_contractAddress).burn(_tokenId);
        }
        else{
            token.transferFrom(msg.sender, address(this), _tokenId);
        }

        require(
            verifySignature(_contractAddress, msg.sender, _tokenId, _claimersName, _isVerified, _signature),
            "Signature is not valid"
        );

        if(!(_isFreeClaimingForVerifiedUsers[_contractAddress] && _isAddressesOwnerVerified[msg.sender])){
            uint claimingPrice = _getCorrectPrice(_pricesForClaiming[_contractAddress], _standardClaimingPrice);
            if(claimingPrice != 0){
                IERC20 nativeToken = IERC20(_ERC20tokenAddress);
                require(nativeToken.transferFrom(msg.sender, address(this), claimingPrice));
            }
        }

        _isTokenClaimed[_contractAddress][_tokenId] = true;
        _claimedIds[_contractAddress].push(_tokenId);
        _ownersAddresses[_contractAddress][_tokenId][0] = msg.sender;

        require(_tryToSetNewName(msg.sender, _claimersName));
        _isAddressesOwnerVerified[msg.sender] = _isVerified;

        _ownersCount[_contractAddress][_tokenId]++;
        emit Claim(_contractAddress, msg.sender, _tokenId, _claimersName);
    }

    /// @notice Change Onwer 
    function changeOwner(address _contractAddress, uint _tokenId, string memory _newOwnersName, address _newOwnerAddress ) external{
        require(_isTokenClaimed[_contractAddress][_tokenId], "Not claimed yet");

        uint len = _ownersCount[_contractAddress][_tokenId];
        address ownerAddress = _ownersAddresses[_contractAddress][_tokenId][len - 1];

        require(ownerAddress == msg.sender, "Not owner");

        uint changingPrice = _getCorrectPrice(_pricesForOwnerChanging[_contractAddress], _standardOwnerChangingPrice);
        if(changingPrice != 0){
            IERC20 nativeToken = IERC20(_ERC20tokenAddress);
            require(nativeToken.transferFrom(msg.sender, address(this), changingPrice));
        }
        _ownersAddresses[_contractAddress][_tokenId][len] = _newOwnerAddress;

        require(_tryToSetNewName(_newOwnerAddress, _newOwnersName));

        _ownersCount[_contractAddress][_tokenId]++;
        emit ChangeOwner(_contractAddress, _tokenId, _newOwnerAddress, msg.sender, _newOwnersName);
    }
    
    /// @notice Verify Owner
    function verifyOwner(string memory _claimersName, uint _nonce, bytes memory _signature) external{
        require(
            verifySignForAuthOwner(msg.sender, _claimersName, _nonce, _signature),
            "Signature is not valid"
        );
        // require(!_isAddressesOwnerVerified[msg.sender], "Already verified");
        require(!_isNonceRedeemed[_nonce], "Nonce redeemed");
        _addressesOwners[msg.sender] = _claimersName;
        _isAddressesOwnerVerified[msg.sender] = true;
        _isAddressUsed[msg.sender] = true;
        _isNonceRedeemed[_nonce] = true;
    }

    /// @notice Takes a fee for verification 
    function requestVerification(string memory _nameToVerify) external{
        IERC20 nativeToken = IERC20(_ERC20tokenAddress);
        require(nativeToken.transferFrom(msg.sender, address(this), _standardPriceForVerification));
        require(_tryToSetNewName(msg.sender, _nameToVerify));
    }

    /// ----- OWNER METHODS ----- ///
        
    constructor(uint _standardPriceForClaiming, uint _standardVerificationPrice, uint _standardPriceForOwnerChanging, address _nativeTokenAddress){
        _standardClaimingPrice = _standardPriceForClaiming;
        _standardPriceForVerification = _standardVerificationPrice;
        _standardOwnerChangingPrice = _standardPriceForOwnerChanging;
        _ERC20tokenAddress = _nativeTokenAddress;
    }

    /// @notice Change verification price
    function setVerificationPrice(uint _newPrice) external onlyOwner{
        _standardPriceForVerification = _newPrice;
    }
    
    /// @notice Verify owner by admin 
    function verifyByAdmin(address _userAddress, string memory _newName, bool _isVerifyed, bool _isUsed) external onlyOwner{
        _addressesOwners[_userAddress] = _newName;
        _isAddressesOwnerVerified[_userAddress] = _isVerifyed;
        _isAddressUsed[msg.sender] = _isUsed;
    }

    /// @notice Change erc20 token using for payments
    function setErc20Token(address _contractAddress) external onlyOwner{
        _ERC20tokenAddress = _contractAddress;
    }

    /// @notice Contract settings
    /// @param _claimingPrice Set to 1 if you want to use Standard Claiming Price
    /// @param _changeOwnerPrice Set to 1 if you want to use Stanrad Owner Changing Price
    function setContractAtributes(address _address, bool _enable, uint _claimingPrice, uint _changeOwnerPrice, bool _isBurnble, bool _isFreeClaimForVerifiedUsers) external onlyOwner{
        _acceptedContracts[_address] = _enable;
        _pricesForClaiming[_address] = _claimingPrice;
        _pricesForOwnerChanging[_address] = _changeOwnerPrice;
        _isBurnable[_address] = _isBurnble;
        _isFreeClaimingForVerifiedUsers[_address] = _isFreeClaimForVerifiedUsers;
    }
    
    /// @notice Edit standard price for claiming
    function editStandardClaimingPrice(uint _price) external onlyOwner{
        _standardClaimingPrice = _price;
    }

    /// @notice Edit standard price for claiming
    function editStandardChangeOwnerPrice(uint _price) external onlyOwner{
        _standardOwnerChangingPrice = _price;
    }
    
    /// @notice Withdraw/rescue erc20 tokens to owners address
    function withdrawERC20(address _address) external onlyOwner{
       uint val = IERC20(_address).balanceOf(address(this));
       Ierc20(_address).transfer(msg.sender, val);
    }

    /// @notice Owner change by admin
    function changeOwnerByAdmin(address _address, uint _id, address _newOwnerAddress, string memory _newOwnersName, bool _verificationStatus) external onlyOwner{
        require(_isTokenClaimed[_address][_id], "Not claimed yet");
        uint len = _ownersCount[_address][_id];
        _ownersAddresses[_address][_id][len] = _newOwnerAddress;
        _addressesOwners[_newOwnerAddress] = _newOwnersName;
        _isAddressUsed[_newOwnerAddress] = true;
        _isAddressesOwnerVerified[_newOwnerAddress] = _verificationStatus;
        emit ChangeOwner(_address, _id, _newOwnerAddress, address(0), _newOwnersName);
    }
    
    /// ----- PRIVATE METHODS ----- ///

    /// @dev Return true when owner names equals
    function _tryToSetNewName(address _addressToSet, string memory _claimersName) internal returns(bool){
        if(_isAddressUsed[_addressToSet] == true){
            require (keccak256(abi.encodePacked(_addressesOwners[_addressToSet])) == keccak256(abi.encodePacked(_claimersName)), "Name mismatch for already used address");
            return true;
        }
        else {
            _addressesOwners[_addressToSet] = _claimersName;
            _isAddressUsed[_addressToSet] = true;
            return true;
        }
    }
    
    /// @dev Return second argument when first equals 1
    function _getCorrectPrice(uint _priceForContract, uint _standardPrice) internal pure returns(uint){
       if(_priceForContract == 1){
           return _standardPrice;
       } 
       else return _priceForContract;
    }
    
    function getEthSignedMessageHash(bytes32 _messageHash)
        internal
        pure
        returns (bytes32)
    {
        return
            keccak256(
                abi.encodePacked(
                    "\x19Ethereum Signed Message:\n32",
                    _messageHash
                )
            );
    }

    function verifySignature(
        address _contractAddress,
        address _tokenOwner,
        uint256 _tokenId,
        string memory _claimersName,
        bool _isVerified,
        bytes memory _signature
    ) internal view returns (bool) {
        bytes32 messageHash =
            getMessageHashForClaim(_contractAddress, _tokenOwner, _tokenId, _claimersName, _isVerified);
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);
        return recoverSigner(ethSignedMessageHash, _signature) == owner();
    }
    
    function verifySignForAuthOwner(
        address _address,
        string memory _claimersName,
        uint _nonce,
        bytes memory _signature
    ) internal view returns (bool) {
        bytes32 messageHash =
            getMessageHashForOwnerChange(_address, _claimersName, _nonce);
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);
        return recoverSigner(ethSignedMessageHash, _signature) == owner();
    }

    function recoverSigner(
        bytes32 _ethSignedMessageHash,
        bytes memory _signature
    ) internal pure returns (address) {
        require(_signature.length == 65, "invalid signature length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(_signature, 32))
            s := mload(add(_signature, 64))
            v := byte(0, mload(add(_signature, 96)))
        }
        return ecrecover(_ethSignedMessageHash, v, r, s);
    }
}

interface Ierc20 {
    function transfer(address, uint256) external;
}

interface IERC721Burnable{
    function burn(uint) external;
}