// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract NetraMarketplace is ReentrancyGuard {

    struct Listing {
        address seller;
        uint256 price;
        bool active;
    }

    IERC721 public netraNFT;

    mapping(uint256 => Listing) public listings;

    event NFTListed(uint256 tokenId, address seller, uint256 price);
    event NFTSold(uint256 tokenId, address buyer, uint256 price);
    event ListingCancelled(uint256 tokenId);

    constructor(address nftAddress) {
        netraNFT = IERC721(nftAddress);
    }

    function listNFT(uint256 tokenId, uint256 price) external {

        require(netraNFT.ownerOf(tokenId) == msg.sender, "Not owner");

        netraNFT.transferFrom(msg.sender, address(this), tokenId);

        listings[tokenId] = Listing({
            seller: msg.sender,
            price: price,
            active: true
        });

        emit NFTListed(tokenId, msg.sender, price);
    }

    function buyNFT(uint256 tokenId) external payable nonReentrant {

        Listing storage item = listings[tokenId];

        require(item.active, "Not listed");
        require(msg.value >= item.price, "Insufficient payment");

        address seller = item.seller;

        item.active = false;

        payable(seller).transfer(msg.value);

        netraNFT.transferFrom(address(this), msg.sender, tokenId);

        emit NFTSold(tokenId, msg.sender, msg.value);
    }

    function cancelListing(uint256 tokenId) external {

        Listing storage item = listings[tokenId];

        require(item.seller == msg.sender, "Not seller");
        require(item.active, "Listing inactive");

        item.active = false;

        netraNFT.transferFrom(address(this), msg.sender, tokenId);

        emit ListingCancelled(tokenId);
    }
}