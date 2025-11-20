// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title FreelancerRating
 * @dev Stores immutable rating data and IPFS hash for review text.
 */
contract FreelancerRating {
    struct Rating {
        uint256 totalScore;
        uint256 numRatings;
        bytes32[] reviewHashes; // IPFS hashes of the actual text reviews
    }

    mapping(address => Rating) public ratings;

    // Events for off-chain indexing
    event RatingSubmitted(
        address indexed freelancer,
        uint256 score,
        bytes32 ipfsHash
    );

    // Only the platform or an authorized contract should call this
    address public immutable PLATFORM_API_ADDRESS;

    constructor(address _platformApiAddress) {
        PLATFORM_API_ADDRESS = _platformApiAddress;
    }

    modifier onlyPlatform() {
        require(
            msg.sender == PLATFORM_API_ADDRESS,
            "Only the Platform API address can submit ratings."
        );
        _;
    }

    /**
     * @dev Submits a new rating for a freelancer.
     * @param _freelancer The address of the freelancer being rated.
     * @param _score The score (e.g., 1-5).
     * @param _ipfsHash The IPFS hash of the text review.
     */
    function submitRating(
        address _freelancer,
        uint256 _score,
        bytes32 _ipfsHash
    ) external onlyPlatform {
        Rating storage rating = ratings[_freelancer];

        rating.totalScore += _score;
        rating.numRatings += 1;
        rating.reviewHashes.push(_ipfsHash);

        emit RatingSubmitted(_freelancer, _score, _ipfsHash);
    }

    /**
     * @dev Helper view function to get the current average score.
     * @param _freelancer The address of the freelancer.
     * @return avgScore The average score (multiplied by 100 for precision, e.g., 450 = 4.5/5).
     */
    function getAverageScore(
        address _freelancer
    ) public view returns (uint256 avgScore) {
        Rating storage rating = ratings[_freelancer];
        if (rating.numRatings == 0) {
            return 0;
        }
        // Multiply by 100 before division for better precision in integer math
        return (rating.totalScore * 100) / rating.numRatings;
    }
}
