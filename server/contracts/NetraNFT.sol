// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
    Netra NFT Contract
    - ERC-721
    - ERC-2981
    - OpenZeppelin v5 Compatible
*/

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract NetraNFT is ERC721URIStorage, ERC2981, Ownable, ReentrancyGuard {

    uint256 private _tokenIds;

    mapping(uint256 => bytes32) public contentHash;
    mapping(uint256 => address) public creator;

    event NFTMinted(
        uint256 indexed tokenId,
        address indexed creator,
        string metadataURI,
        bytes32 contentHash,
        uint96 royaltyFee
    );

    constructor()
        ERC721("NetraNFT", "NETRA")
        Ownable(msg.sender)   // ✅ FIXED HERE
    {}

    function mintNFT(
        string memory metadataURI,
        bytes32 _contentHash,
        uint96 royaltyFee
    ) external nonReentrant returns (uint256) {

        require(bytes(metadataURI).length > 0, "Invalid metadata URI");
        require(_contentHash != bytes32(0), "Invalid content hash");
        require(royaltyFee <= 1000, "Royalty too high (max 10%)");

        _tokenIds++;
        uint256 newTokenId = _tokenIds;

        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, metadataURI);

        contentHash[newTokenId] = _contentHash;
        creator[newTokenId] = msg.sender;

        if (royaltyFee > 0) {
            _setTokenRoyalty(newTokenId, msg.sender, royaltyFee);
        }

        emit NFTMinted(
            newTokenId,
            msg.sender,
            metadataURI,
            _contentHash,
            royaltyFee
        );

        return newTokenId;
    }

    function setDefaultRoyalty(
        address receiver,
        uint96 feeNumerator
    ) external onlyOwner {
        require(feeNumerator <= 1000, "Royalty too high (max 10%)");
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    function resetTokenRoyalty(uint256 tokenId)
        external
        onlyOwner
    {
        _resetTokenRoyalty(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}