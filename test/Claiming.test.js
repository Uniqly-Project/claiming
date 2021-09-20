const UniqlyClaiming = artifacts.require("UniqlyClaiming");
const MyToken = artifacts.require("MyToken");
const NFTToken =  artifacts.require("NFTToken")

const { soliditySha3, BN } = require("web3-utils");
const  { account_private_keys }  = require("../keys.json");

contract("Claiming", (accounts) => {
    var mytoken_contract;
    var nfttoken_contract;
    var uniqlyclaiming_contract;

    before(async () => {
        nfttoken_contract =  await NFTToken.new(
            { from: accounts[0] }
        );

        mytoken_contract = await MyToken.new({ from: accounts[0] });

        uniqlyclaiming_contract = await UniqlyClaiming.new(
            1500,
            1600,
            1700,
            mytoken_contract.address,
            { from: accounts[0] }
        );

        for(let i = 0; i < 5; i++) {
            await nfttoken_contract.safeMint(accounts[0]); 
        }
    })

    describe("claim", () => {
        it("not working if contract address is not authorized", async() => {
            let thrownError;

            const contractAddressTokenIdSha = soliditySha3(
                nfttoken_contract.address,
                accounts[0],
                0,
                "testClaiming0",
                true
            );

            //sign we do in the backend.
            const {signature} = web3.eth.accounts.sign(
                contractAddressTokenIdSha,
                account_private_keys[0]
            );

            await nfttoken_contract.setApprovalForAll(
                uniqlyclaiming_contract.address,
                true,
                { from: accounts[0] }
            );
            
            await mytoken_contract.approve(uniqlyclaiming_contract.address, 5000)

            try {
                await uniqlyclaiming_contract.claim(
                    nfttoken_contract.address,
                    0,
                    "testClaiming0",
                    true,
                    signature,
                    {from : accounts[0]}
                );
            } catch (error) {
                thrownError = error;
            }
            assert.include(thrownError.message, "Contract address is not authorized");
        })

        it("not working if claimed before", async() => {
            let thrownError;

            const contractAddressTokenIdSha = soliditySha3(
                nfttoken_contract.address,
                accounts[0],
                1,
                "testClaiming0",
                true
            );
            //sign we do in the backend.
            const {signature} = web3.eth.accounts.sign(
                contractAddressTokenIdSha,
                account_private_keys[0]
            );

            await nfttoken_contract.setApprovalForAll(
                uniqlyclaiming_contract.address,
                true,
                { from: accounts[0] }
            );
            await mytoken_contract.approve(uniqlyclaiming_contract.address, 5000)

            await uniqlyclaiming_contract.setContractAtributes(nfttoken_contract.address, true, 1234, 4567, true, false);

            await uniqlyclaiming_contract.claim(
                nfttoken_contract.address,
                1,
                "testClaiming0",
                true,
                signature,
                {from : accounts[0]}
            );

            try {
                await uniqlyclaiming_contract.claim(
                    nfttoken_contract.address,
                    1,
                    "testClaiming0",
                    true,
                    signature,
                    {from : accounts[0]}
                );
            } catch (error) {
                thrownError = error;
            }
            assert.include(thrownError.message, "Can't be claimed again");
        })

        it("not working if not owner of token", async() => {
            let thrownError;

            const contractAddressTokenIdSha = soliditySha3(
                nfttoken_contract.address,
                accounts[0],
                0,
                "testClaiming0",
                true
            );
            //sign we do in the backend.
            const {signature} = web3.eth.accounts.sign(
                contractAddressTokenIdSha,
                account_private_keys[0]
            );

            await nfttoken_contract.setApprovalForAll(
                uniqlyclaiming_contract.address,
                true,
                { from: accounts[0] }
            );
            await mytoken_contract.approve(uniqlyclaiming_contract.address, 5000)

            await uniqlyclaiming_contract.setContractAtributes(nfttoken_contract.address, true, 1234, 4567, true, false);

            try {
                await uniqlyclaiming_contract.claim(
                    nfttoken_contract.address,
                    0,
                    "testClaiming1",
                    true,
                    signature,
                    {from : accounts[1]}
                );
            } catch (error) {
                thrownError = error;
            }
            assert.include(thrownError.message, "You need to own this token");
        })

        it("not working if signature is not valid", async() => {
            let thrownError;

            await nfttoken_contract.setApprovalForAll(
                uniqlyclaiming_contract.address,
                true,
                { from: accounts[0] }
            );
            await mytoken_contract.approve(uniqlyclaiming_contract.address, 5000)

            await uniqlyclaiming_contract.setContractAtributes(nfttoken_contract.address, true, 1234, 4567, true, false);
            
            try {
                await uniqlyclaiming_contract.claim(
                    nfttoken_contract.address,
                    0,
                    "testClaiming0",
                    true,
                    "0x1111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111",
                    {from : accounts[0]}
                );
            } catch (error) {
                thrownError = error;
            }
            assert.include(thrownError.message, "Signature is not valid");
        })

        it("not working if name mismatch for already used address", async() => {
            let thrownError;

            const contractAddressTokenIdSha = soliditySha3(
                nfttoken_contract.address,
                accounts[0],
                0,
                "testClaiming1",
                true
            );
            //sign we do in the backend.
            const {signature} = web3.eth.accounts.sign(
                contractAddressTokenIdSha,
                account_private_keys[0]
            );

            await nfttoken_contract.setApprovalForAll(
                uniqlyclaiming_contract.address,
                true,
                { from: accounts[0] }
            );
            await mytoken_contract.approve(uniqlyclaiming_contract.address, 5000)

            await uniqlyclaiming_contract.setContractAtributes(nfttoken_contract.address, true, 1234, 4567, false, false);

            try {
                await uniqlyclaiming_contract.claim(
                    nfttoken_contract.address,
                    0,
                    "testClaiming1",
                    true,
                    signature,
                    {from : accounts[0]}
                );
            } catch (error) {
                thrownError = error;
            }

            assert.include(thrownError.message, "Name mismatch for already used address");
        })


        it("Works fine with normal flow for not-burnable tokens", async() => {
            const contractAddressTokenIdSha = soliditySha3(
                nfttoken_contract.address,
                accounts[0],
                0,
                "testClaiming0",
                true
            );
            //sign we do in the backend.
            const {signature} = web3.eth.accounts.sign(
                contractAddressTokenIdSha,
                account_private_keys[0]
            );

            await nfttoken_contract.setApprovalForAll(
                uniqlyclaiming_contract.address,
                true,
                { from: accounts[0] }
            );
            await mytoken_contract.approve(uniqlyclaiming_contract.address, 5000)

            await uniqlyclaiming_contract.setContractAtributes(nfttoken_contract.address, true, 1234, 4567, false, false);

            await uniqlyclaiming_contract.claim(
                nfttoken_contract.address,
                0,
                "testClaiming0",
                true,
                signature,
                {from : accounts[0]}
            );

            assert.equal(
                await nfttoken_contract.ownerOf(
                    0
                ),
                uniqlyclaiming_contract.address
            );

        })

        it("Works fine with normal flow for burnable tokens", async() => {
            let thrownError;
            
            const contractAddressTokenIdSha = soliditySha3(
                nfttoken_contract.address,
                accounts[0],
                2,
                "testClaiming0",
                true
            );
            //sign we do in the backend.
            const {signature} = web3.eth.accounts.sign(
                contractAddressTokenIdSha,
                account_private_keys[0]
            );

            await nfttoken_contract.setApprovalForAll(
                uniqlyclaiming_contract.address,
                true,
                { from: accounts[0] }
            );
            await mytoken_contract.approve(uniqlyclaiming_contract.address, 5000)

            await uniqlyclaiming_contract.setContractAtributes(nfttoken_contract.address, true, 1234, 4567, true, false);

            await uniqlyclaiming_contract.claim(
                nfttoken_contract.address,
                2,
                "testClaiming0",
                true,
                signature,
                {from : accounts[0]}
            );

            try{
                await nfttoken_contract.ownerOf(2)
            } catch(error){
                thrownError = error;
            }

            assert.include(thrownError.message, "revert ERC721: owner query for nonexistent token");

        })
    });

    describe("changeOwner", () => {
        it("not working if token was not claimed yet", async() => {
            let thrownError;

            await nfttoken_contract.setApprovalForAll(
                uniqlyclaiming_contract.address,
                true,
                { from: accounts[0] }
            );
            await mytoken_contract.approve(uniqlyclaiming_contract.address, 5000)

            try {
                await uniqlyclaiming_contract.changeOwner(
                    nfttoken_contract.address,
                    3,
                    "testClaiming1",
                    accounts[1],
                    {from : accounts[0]}
                );
            } catch (error) {
                thrownError = error;
            }
            assert.include(thrownError.message, "Not claimed yet");
        })

        it("not working if not owner", async() => {
            let thrownError;

            await nfttoken_contract.setApprovalForAll(
                uniqlyclaiming_contract.address,
                true,
                { from: accounts[1] }
            );
            await mytoken_contract.approve(uniqlyclaiming_contract.address, 5000)

            try {
                await uniqlyclaiming_contract.changeOwner(
                    nfttoken_contract.address,
                    0,
                    "testClaiming1",
                    accounts[2],
                    {from : accounts[1]}
                );
            } catch (error) {
                thrownError = error;
            }
            assert.include(thrownError.message, "Not owner");
        })

        it("Works fine with normal flow", async() => {
            await nfttoken_contract.setApprovalForAll(
                uniqlyclaiming_contract.address,
                true,
                { from: accounts[0] }
            );
            await mytoken_contract.approve(uniqlyclaiming_contract.address, 5000)

            await uniqlyclaiming_contract.changeOwner(
                nfttoken_contract.address,
                0,
                "testClaiming1",
                accounts[1],
                {from : accounts[0]}
            );
            const ownerAddress= await uniqlyclaiming_contract.getLastOwnerOf(nfttoken_contract.address, 0)
            assert.equal(ownerAddress['0'], accounts[1])
        })
    })

    describe("verifyOwner", () => {
        it("not working if Signature is not valid", async() => {
            let thrownError;

            await nfttoken_contract.setApprovalForAll(
                uniqlyclaiming_contract.address,
                true,
                { from: accounts[0] }
            );
            await mytoken_contract.approve(uniqlyclaiming_contract.address, 5000)

            try {
                await uniqlyclaiming_contract.verifyOwner(
                    "testClaiming0",
                    123,
                    "0x2222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222",
                    {from : accounts[0]}
                );
            } catch (error) {
                thrownError = error;
            }
            assert.include(thrownError.message, "Signature is not valid");
        })

        it("not working if Nonce redeemed", async() => {
            let thrownError;

            const contractAddressTokenIdSha = soliditySha3(
                accounts[0],
                "testClaiming0",
                123
            );
            //sign we do in the backend.
            const {signature} = web3.eth.accounts.sign(
                contractAddressTokenIdSha,
                account_private_keys[0]
            );

            await nfttoken_contract.setApprovalForAll(
                uniqlyclaiming_contract.address,
                true,
                { from: accounts[0] }
            );
            await mytoken_contract.approve(uniqlyclaiming_contract.address, 5000)

            await uniqlyclaiming_contract.verifyOwner(
                "testClaiming0",
                123,
                signature,
                {from : accounts[0]}
            );

            try {
                await uniqlyclaiming_contract.verifyOwner(
                    "testClaiming0",
                    123,
                    signature,
                    {from : accounts[0]}
                );
            } catch (error) {
                thrownError = error;
            }
            assert.include(thrownError.message, "Nonce redeemed");
        })

        it("Works fine with normal flow", async() => {
            const contractAddressTokenIdSha = soliditySha3(
                accounts[0],
                "testClaiming0",
                234
            );
            //sign we do in the backend.
            const {signature} = web3.eth.accounts.sign(
                contractAddressTokenIdSha,
                account_private_keys[0]
            );

            await nfttoken_contract.setApprovalForAll(
                uniqlyclaiming_contract.address,
                true,
                { from: accounts[0] }
            );
            await mytoken_contract.approve(uniqlyclaiming_contract.address, 5000)

            await uniqlyclaiming_contract.verifyOwner(
                "testClaiming0",
                234,
                signature,
                {from : accounts[0]}
            );
            let ownerinfo = await uniqlyclaiming_contract.getAddressOwnerInfo(accounts[0])
            assert.equal(await ownerinfo['0'], "testClaiming0")
            assert.equal(await ownerinfo['1'], true)
        })
    })

    describe("withdrawERC20", () => {
        it("Works fine with normal flow", async() => {
            await mytoken_contract.approve(uniqlyclaiming_contract.address, 5000)
            await uniqlyclaiming_contract.withdrawERC20(mytoken_contract.address)
            assert.equal(await mytoken_contract.balanceOf(uniqlyclaiming_contract.address), 0)
        })
    })
    
    describe("changeOwnerByAdmin", () => {
        it("not working if token was not claimed yet", async() => {
            let thrownError;

            try {
                await uniqlyclaiming_contract.changeOwnerByAdmin(
                    nfttoken_contract.address,
                    3,
                    accounts[1],
                    "testClaiming1",
                    1,
                    {from : accounts[0]}
                );
            } catch (error) {
                thrownError = error;
            }
            assert.include(thrownError.message, "Not claimed yet");
        })

        it("Works fine with normal flow", async() => {
            await uniqlyclaiming_contract.changeOwnerByAdmin(
                nfttoken_contract.address,
                0,
                accounts[1],
                "testClaiming1",
                1,
                {from : accounts[0]}
            );
            const ownerAddress= await uniqlyclaiming_contract.getLastOwnerOf(nfttoken_contract.address, 0)
            assert.equal(ownerAddress['0'], accounts[1])
        })
    })

    describe("isTokenClaimed", () => {
        it("Works fine with normal flow", async() => {
            const contractAddressTokenIdSha = soliditySha3(
                nfttoken_contract.address,
                accounts[0],
                3,
                "testClaiming0",
                true
            );
            //sign we do in the backend.
            const {signature} = web3.eth.accounts.sign(
                contractAddressTokenIdSha,
                account_private_keys[0]
            );

            await nfttoken_contract.setApprovalForAll(
                uniqlyclaiming_contract.address,
                true,
                { from: accounts[0] }
            );
            await mytoken_contract.approve(uniqlyclaiming_contract.address, 5000)

            await uniqlyclaiming_contract.setContractAtributes(nfttoken_contract.address, true, 1234, 4567, false, false);

            await uniqlyclaiming_contract.claim(
                nfttoken_contract.address,
                3,
                "testClaiming0",
                true,
                signature,
                {from : accounts[0]}
            );
            assert.equal(await uniqlyclaiming_contract.isTokenClaimed(nfttoken_contract.address, 3), true);
        })
    })

    describe("isContractAuthorized", () => {
        it("Works fine with normal flow", async() => {
            await uniqlyclaiming_contract.setContractAtributes(nfttoken_contract.address, false, 1234, 4567, false, false);
            assert.equal(await uniqlyclaiming_contract.isContractAuthorized(nfttoken_contract.address), false);

            await uniqlyclaiming_contract.setContractAtributes(nfttoken_contract.address, true, 1234, 4567, false, false);
            assert.equal(await uniqlyclaiming_contract.isContractAuthorized(nfttoken_contract.address), true);
        })
    })

    describe("isNonceRedeemed", () => {
        it("Works fine with normal flow", async() => {
            const contractAddressTokenIdSha = soliditySha3(
                accounts[0],
                "testClaiming0",
                345
            );
            //sign we do in the backend.
            const {signature} = web3.eth.accounts.sign(
                contractAddressTokenIdSha,
                account_private_keys[0]
            );

            await nfttoken_contract.setApprovalForAll(
                uniqlyclaiming_contract.address,
                true,
                { from: accounts[0] }
            );
            await mytoken_contract.approve(uniqlyclaiming_contract.address, 5000)

            await uniqlyclaiming_contract.verifyOwner(
                "testClaiming0",
                345,
                signature,
                {from : accounts[0]}
            );
            assert.equal(await uniqlyclaiming_contract.isNonceRedeemed(345), true);
        })
    })

    describe("getOwnersCountOfToken", () => {
        it("Works fine with normal flow", async() => {
            const prevCount = await uniqlyclaiming_contract.getOwnersCountOfToken(nfttoken_contract.address, 3)

            await nfttoken_contract.setApprovalForAll(
                uniqlyclaiming_contract.address,
                true,
                { from: accounts[0] }
            );
            await mytoken_contract.approve(uniqlyclaiming_contract.address, 5000)

            await uniqlyclaiming_contract.changeOwner(
                nfttoken_contract.address,
                3,
                "testClaiming1",
                accounts[1],
                {from : accounts[0]}
            );
            const curCount = await uniqlyclaiming_contract.getOwnersCountOfToken(nfttoken_contract.address, 3);
            assert.equal(parseInt(curCount), parseInt(prevCount) + 1);
        })
    })

    describe("getOwnerOfTokenByPosition", () => {
        it("Works fine with normal flow", async() => {
            const owner1 = await uniqlyclaiming_contract.getOwnerOfTokenByPosition(nfttoken_contract.address, 3, 0);
            const owner2 = await uniqlyclaiming_contract.getOwnerOfTokenByPosition(nfttoken_contract.address, 3, 1);
            assert.equal(owner1['0'], accounts[0]);
            assert.equal(owner2['0'], accounts[1]);
        })
    })

    describe("getAllTokenHoldersNamesHistory", () => {
        it("Works fine with normal flow", async() => {
            const holdersNameHistory = await uniqlyclaiming_contract.getAllTokenHoldersNamesHistory(nfttoken_contract.address, 3);
            assert.equal(holdersNameHistory[0], "testClaiming0");
            assert.equal(holdersNameHistory[1], "testClaiming1");
        })
    })

    describe("getAllTokenHoldersAddressesHistory", () => {
        it("Works fine with normal flow", async() => {
            const holdersAddressHistory = await uniqlyclaiming_contract.getAllTokenHoldersAddressesHistory(nfttoken_contract.address, 3);
            assert.equal(holdersAddressHistory[0], accounts[0]);
            assert.equal(holdersAddressHistory[1], accounts[1]);
        })
    })

    describe("getClaimedIdsOfCollection", () => {
        it("Works fine with normal flow", async() => {
            const claimedIds = await uniqlyclaiming_contract.getClaimedIdsOfCollection(nfttoken_contract.address);
            assert.equal(claimedIds[0], 1);
            assert.equal(claimedIds[1], 0);
            assert.equal(claimedIds[2], 2);
            assert.equal(claimedIds[3], 3);
        })
    })

    describe("getClaimedCountOf", () => {
        it("Works fine with normal flow", async() => {
            const claimedCount = await uniqlyclaiming_contract.getClaimedCountOf(nfttoken_contract.address);
            assert.equal(claimedCount, 4);
        })
    })

    describe("getStandardClaimingPrice", () => {
        it("Works fine with normal flow", async() => {
            const standardClaimingPrice = await uniqlyclaiming_contract.getStandardClaimingPrice();
            assert.equal(standardClaimingPrice, 1500);
        })
    })

    describe("getClaimingPriceForContract", () => {
        it("Works fine with normal flow", async() => {
            const claimingPrice = await uniqlyclaiming_contract.getClaimingPriceForContract(nfttoken_contract.address);
            assert.equal(parseInt(claimingPrice), 1234);
        })
    })

    describe("getChangeOwnerPriceForContract", () => {
        it("Works fine with normal flow", async() => {
            const changeOwnerPrice = await uniqlyclaiming_contract.getChangeOwnerPriceForContract(nfttoken_contract.address);
            assert.equal(parseInt(changeOwnerPrice), 4567);
        })
    })

    describe("getPriceForVerification", () => {
        it("Works fine with normal flow", async() => {
            const priceForVerification = await uniqlyclaiming_contract.getPriceForVerification();
            assert.equal(parseInt(priceForVerification), 1600);
        })
    })

    describe("isBurnable", () => {
        it("Works fine with normal flow", async() => {
            const isburnable = await uniqlyclaiming_contract.isBurnable(nfttoken_contract.address);
            assert.equal(isburnable, false);
        })
    })

    describe("isFreeClaimForVerified", () => {
        it("Works fine with normal flow", async() => {
            await uniqlyclaiming_contract.setContractAtributes(nfttoken_contract.address, true, 1234, 4567, false, false);
            assert.equal(await uniqlyclaiming_contract.isFreeClaimForVerified(nfttoken_contract.address), false);

            await uniqlyclaiming_contract.setContractAtributes(nfttoken_contract.address, true, 1234, 4567, false, true);
            assert.equal(await uniqlyclaiming_contract.isFreeClaimForVerified(nfttoken_contract.address), true);
        })
    })

    describe("requestVerification", () => {
        it("not working if name mismatch for already used address", async() => {
            let thrownError;
            await mytoken_contract.approve(uniqlyclaiming_contract.address, 5000)
            try {
                await uniqlyclaiming_contract.requestVerification("testClaiming00",{from: accounts[0]});
            } catch (error) {
                thrownError = error;
            }
            assert.include(thrownError.message, "Name mismatch for already used address");
        })

        it("Works fine with normal flow", async() => {
            await mytoken_contract.approve(uniqlyclaiming_contract.address, 5000)
            await uniqlyclaiming_contract.requestVerification("testClaiming0",{from: accounts[0]});
            const addressOwner = await uniqlyclaiming_contract.getAddressOwnerInfo(accounts[0]);
            assert.equal(addressOwner['0'], "testClaiming0");
        })
    })

    describe("editStandardClaimingPrice", () => {
        it("Works fine with normal flow", async() => {
            await uniqlyclaiming_contract.editStandardClaimingPrice(2500);
            assert.equal(await uniqlyclaiming_contract.getStandardClaimingPrice(), 2500);
        })
    })
});