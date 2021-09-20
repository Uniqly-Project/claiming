const MyToken = artifacts.require("MyToken");
const NFTToken =  artifacts.require("NFTToken")
const UniqlyClaiming = artifacts.require("UniqlyClaiming");

module.exports = async(deployer, network) => {
    await deployer.deploy(MyToken);
    await deployer.deploy(NFTToken);

    if (network == "mainnet") {

        await deployer.deploy(
            UniqlyClaiming, 
            40 * Math.pow(10, 18), 
            60 * Math.pow(10, 18), 
            60 * Math.pow(10, 18), 
            0x3758e00b100876c854636ef8db61988931bb8025
        );
    }
    else {
        const mytoken_contract = await MyToken.deployed();
        await deployer.deploy(UniqlyClaiming,1500, 1600, 1700, mytoken_contract.address);
    }
};
