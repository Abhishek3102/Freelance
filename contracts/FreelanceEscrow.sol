// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title FreelanceEscrow
 * @dev Manages payment escrow for a single freelance job, including dispute handling.
 * NOTE: For simplicity, this assumes a single payment milestone and uses ETH (wei).
 */
contract FreelanceEscrow {
    enum Status {
        CREATED, // Job created, waiting for client deposit
        ACTIVE, // Funds locked in escrow, work in progress
        DISPUTE, // Dispute raised, funds locked until resolution
        COMPLETE, // Work approved, payment released
        CANCELED // Escrow canceled, funds refunded
    }

    struct Job {
        address payable client;
        address payable freelancer;
        uint256 amount;
        Status status;
        uint256 contractId; // ID linked to the API/DB job
    }

    address public immutable ARBITER; // Trusted address for dispute resolution
    uint256 public nextJobId = 1;
    mapping(uint256 => Job) public jobs;
    mapping(uint256 => uint256) public jobDeposit;

    event JobCreated(
        uint256 indexed jobId,
        address client,
        address freelancer,
        uint256 amount,
        uint256 contractId
    );
    event JobFunded(uint256 indexed jobId, uint256 depositedAmount);
    event PaymentReleased(uint256 indexed jobId);
    event DisputeRaised(uint256 indexed jobId);
    event DisputeResolved(
        uint256 indexed jobId,
        address winner,
        uint256 winnerShare
    );

    constructor(address _arbiter) {
        require(_arbiter != address(0), "Arbiter address invalid.");
        ARBITER = _arbiter;
    }

    modifier onlyClient(uint256 _jobId) {
        require(
            msg.sender == jobs[_jobId].client,
            "Only the client can perform this action."
        );
        _;
    }

    modifier onlyFreelancer(uint256 _jobId) {
        require(
            msg.sender == jobs[_jobId].freelancer,
            "Only the freelancer can perform this action."
        );
        _;
    }

    modifier onlyArbiter() {
        require(
            msg.sender == ARBITER,
            "Only the arbiter can perform this action."
        );
        _;
    }

    /**
     * @dev Creates a new job record, called by the platform API/client.
     * @param _freelancer Address of the freelancer.
     * @param _amount Agreed payment amount in Wei.
     * @param _contractId ID from the centralized DB/API.
     */
    function createJob(
        address payable _client,
        address payable _freelancer,
        uint256 _amount,
        uint256 _contractId
    ) external {
        uint256 jobId = nextJobId++;
        jobs[jobId] = Job(
            _client,
            _freelancer,
            _amount,
            Status.CREATED,
            _contractId
        );
        emit JobCreated(jobId, _client, _freelancer, _amount, _contractId);
    }

    /**
     * @dev Client deposits the agreed funds into escrow.
     * @param _jobId The on-chain job ID.
     */
    function deposit(uint256 _jobId) external payable onlyClient(_jobId) {
        Job storage job = jobs[_jobId];
        require(job.status == Status.CREATED, "Job must be in CREATED status.");
        require(msg.value == job.amount, "Deposit must match agreed amount.");

        job.status = Status.ACTIVE;
        jobDeposit[_jobId] = msg.value;
        emit JobFunded(_jobId, msg.value);
    }

    /**
     * @dev Client approves the work and releases the payment to the freelancer.
     * @param _jobId The on-chain job ID.
     */
    function releasePayment(uint256 _jobId) external onlyClient(_jobId) {
        Job storage job = jobs[_jobId];
        require(
            job.status == Status.ACTIVE,
            "Job must be ACTIVE to release payment."
        );

        uint256 amountToPay = jobDeposit[_jobId];

        // Transfer funds from the contract to the freelancer
        (bool success, ) = job.freelancer.call{value: amountToPay}("");
        require(success, "Payment transfer failed.");

        job.status = Status.COMPLETE;
        delete jobDeposit[_jobId]; // Clear deposit
        emit PaymentReleased(_jobId);
    }

    /**
     * @dev Either party can raise a dispute, locking the funds.
     * @param _jobId The on-chain job ID.
     */
    function raiseDispute(uint256 _jobId) external {
        Job storage job = jobs[_jobId];
        require(
            job.status == Status.ACTIVE,
            "Dispute can only be raised on ACTIVE jobs."
        );
        require(
            msg.sender == job.client || msg.sender == job.freelancer,
            "Only parties can raise a dispute."
        );

        job.status = Status.DISPUTE;
        emit DisputeRaised(_jobId);
    }

    /**
     * @dev Arbiter resolves the dispute by splitting the funds (e.g., 50/50).
     * @param _jobId The on-chain job ID.
     * @param _clientShare The percentage of funds (0-100) to refund to the client.
     */
    function resolveDispute(
        uint256 _jobId,
        uint256 _clientShare
    ) external onlyArbiter {
        Job storage job = jobs[_jobId];
        require(job.status == Status.DISPUTE, "Job must be in DISPUTE status.");
        require(_clientShare <= 100, "Share must be <= 100.");

        uint256 totalAmount = jobDeposit[_jobId];
        uint256 clientRefund = (totalAmount * _clientShare) / 100;
        uint256 freelancerPayment = totalAmount - clientRefund;

        // Refund client
        (bool successClient, ) = job.client.call{value: clientRefund}("");
        require(successClient, "Client refund failed.");

        // Pay freelancer
        (bool successFreelancer, ) = job.freelancer.call{
            value: freelancerPayment
        }("");
        require(successFreelancer, "Freelancer payment failed.");

        job.status = Status.COMPLETE;
        delete jobDeposit[_jobId]; // Clear deposit

        emit DisputeResolved(_jobId, job.freelancer, freelancerPayment);
    }

    // Fallback function to prevent accidental ETH transfers without calling deposit
    receive() external payable {
        revert("Use the deposit function to fund a job.");
    }
}
