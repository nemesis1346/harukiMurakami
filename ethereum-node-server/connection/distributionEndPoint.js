const contractTruffle = require("truffle-contract");
const Web3 = require("web3");
const web3Provider = new Web3(
    new Web3.providers.HttpProvider("http://localhost:7545")
);
const trackEndpoint = require("./trackEndpoint");
const traderEndpoint = require("./traderEndpoint");
const agreementEndpoint = require("./agreementEndpoint");
const tokenAccountEndpoint = require('./tokenAccountEndpoint');
const receiptEndpoint = require('./receiptEndpoint');
//Artifacts
const trader_artifact = require("../build/contracts/Traders.json");
const track_artifact = require("../build/contracts/Tracks.json");
//Contract
const TradersContract = contractTruffle(trader_artifact);
const TracksContract = contractTruffle(track_artifact);
//Setting Providers
TradersContract.setProvider(web3Provider.currentProvider);
TracksContract.setProvider(web3Provider.currentProvider);
//models
const ReceiverShareModel = require("../models/receiverShareModel.js");
const DataModel = require('../models/dataModel.js');
const OnHoldDistributionRequest = require('../models/onHoldDistributionRequest.js');
const DistributionProcessRequest = require('../models/distributionProcessRequest.js');
const EvaluateReceiptRequest = require('../models/evaluateReceiptRequest.js');
const DistributionLastNodeRequest = require('../models/distributionLastNodeRequest.js');
const EvaluateReceiversRequest = require('../models/evaluateReceiversRequest.js');
const GetTraderRequest = require('../models/getTraderRequest.js');

async function distribution(requestDistribution) {
    console.log('****************************');
    console.log('Request Distribution in Distribution EndPoint');
    console.log(requestDistribution);
    try {
        let trackId = requestDistribution.trackId;
        let uploaderId = requestDistribution.uploaderId;
        let datetime = requestDistribution.datetime;
        let fromAddress = requestDistribution.fromAddress;
        let gasLimit = requestDistribution.gasLimit;

        let track = await trackEndpoint.getTrack(trackId, fromAddress, gasLimit);

        let evaluateReceiversFirstTimeRequest = new EvaluateReceiversRequest(
            trackId,
            uploaderId,
            track.revenue,
            datetime,
            "none",
            "none",
            uploaderId,
            fromAddress,
            gasLimit
        );

        let receiverShareFirstTimeList = await this.evaluateReceivers(evaluateReceiversFirstTimeRequest);
        console.log('RESULT RECEIVERS SHARE FIRST TIME');
        console.log(receiverShareFirstTimeList);

        // if (receiverShareFirstTimeList.length == 0) {
        //     await this.onHoldDistribution(
        //         trackId,
        //         uploaderId,
        //         datetime,
        //         track.revenueTotal
        //     );

        // } else if (receiverShareFirstTimeList.length >= 1) {
        //     for (const element of receiverShareFirstTimeList) {
        //         await this.distributionProcess(
        //             trackId,
        //             element.agreementId,
        //             element.traderReceiverId,
        //             datetime,
        //             track.revenueTotal,
        //             uploaderId,
        //             uploaderId,
        //             element.percentageReceiver,
        //             fromAddress,
        //             gasLimit,
        //         );
        //     }
        // }
        console.log('PROCESS FINISHED');
    } catch (error) {
        console.log('ERROR IN TRANSACTION CHAINCODE');
        console.log(error);
        throw new Error(error);
    }
}
module.exports.distribution = distribution;


async function distributionProcess(
    trackId,
    previousAgreementId,
    emitterId,
    datetime,
    ammount,
    previousEmitterId,
    uploaderId,
    percentageReceiver,
    fromAddress,
    gasLimit
) {
    console.log('*****************************************');
    console.log('Request Distribution Process in Distribution Endpoint');

    try {
        console.log('PREVIOUS EMITTERS');
        console.log(previousEmitterId);
        //assuming there is just one previous emitter
        let receiverList = await this.evaluateReceivers(
            trackId,
            emitterId,
            ammount,
            datetime,
            previousEmitterId,
            previousAgreementId,
            uploaderId,
            fromAddress,
            gasLimit
        );
        console.log('EVALUATE RECEIVERS SHARE IN DISTRIBUTION PROCESS');
        console.log(receiverList);

        //Continue
        if (receiverList.length == 0) {
            await this.distributionLastNode(
                previousEmitterId,
                emitterId,
                trackId,
                percentageReceiver,
                ammount,
                datetime,
                uploaderId,
                fromAddress, //TODO: Mention how we had to use constantly address and gas
                gasLimit
            );
        } else if (receiverList == 1) {
            let uniqueShare = receiverList[0];
            let receiptsBackwards = this.evaluateReceipts(
                uniqueShare.agreementId,
                uniqueShare.traderEmitterId,
                uniqueShare.traderReceiverId,
                trackId,
                datetime
            );

            let receiptsForwards = this.evaluateReceipts(
                uniqueShare.agreementId,
                uniqueShare.traderEmitterId,
                uniqueShare.traderReceiverId
            );
            if (!(receiptsBackwards + receiptsForwards) > 1) {
                this.distributionProcess(
                    trackId,
                    uniqueShare.previousAgreementId,
                    uniqueShare.traderReceiverId,
                    datetime,
                    uniqueShare.ammount,
                    uniqueShare.traderEmitterId,
                    uploaderId,
                    uniqueShare.percentageReceiver,
                    fromAddress,
                    gasLimit
                );
            } else {
                console.log('NODE FINISHED**********************************');
            }
        } else if (receiverList.length > 1) {
            let uniqueShare = receiverShareList[0];
            for (const element of receiverShareList) {
                this.distributionProcess(
                    trackId,
                    element.agreementId,
                    element.traderReceiverId,
                    datetime,
                    element.ammount,
                    uniqueShare.traderEmitterId,
                    uploaderId,
                    element.percentageReceiver,
                    fromAddress,
                    gasLimit
                );
            }
        }
    } catch (error) {
        console.log('ERROR IN TRANSACTION DISTRIBUTION PROCESS');
        console.log(error);
        throw new Error(error);
    }

}
module.exports.distributionProcess = distributionProcess;

/**
 *All the parameters must come from a result from the blockchain call   
 */
async function distributionLastNode(
    emitterId,
    receiverId,
    trackId,
    percentageReceiver,
    ammount,
    datetime,
    uploaderId,
    fromAddress,
    gasLimit
) {
    console.log('*************************************');
    console.log('Distribution Last Node in Composer.js');
    console.log('Emitter: ' + emitterId);
    //TODO: Improve logs
    try {
        //validate last time emitter and receiver 
        //TODO:
        //We get the receiver token account
        let tokenAccountReceiver = await tokenAccountEndpoint.getTokenAccount(
            receiverId,
            fromAddress,
            gasLimit
        );
        console.log(tokenAccountReceiver);
        console.log('PREVIOUS STATE***********************************');
        console.log("Trader Receiver Balance Enabled: ");

        //let ammountToAddReceiver =parseFloat()+parseFloat(ammount);
        // await tokenAccountEndpoint.addEnabledBalance(
        //     receiverId,
        //     Math.round(ammountToAddReceiver),
        //     fromAddress,
        //     gasLimit
        // );
    } catch (error) {
        console.log('ERROR IN TRANSACTION EVALUATE RECEIPT');
        console.log(error);
        throw new Error(error);
    }
}
module.exports.distributionLastNode = distributionLastNode;

async function evaluateReceipt(
    agreementId,
    traderEmitterId,
    traderReceiverId,
    trackId,
    datetime,
    agreementCtrAddr,
    fromAddress,
    gasLimit
) {
    try {
        let result = await receiptEndpoint.validateReceipt(
            agreementId,
            traderEmitterId,
            traderReceiverId,
            trackId,
            datetime,
            agreementCtrAddr,
            fromAddress,
            gasLimit
        );
        return result;
    } catch (error) {
        console.log('ERROR IN TRANSACTION EVALUATE RECEIPT');
        console.log(error);
        throw new Error(error);
    }
}
module.exports.evaluateReceipt = evaluateReceipt;

async function onHoldDistribution(
    trackId,
    uploaderId,
    datetime,
    revenueTotal,
    fromAddress,
    agreementId
) {
    try {
        await tokenAccountEndpoint.addDisabledBalance(
            uploaderId,
            revenueTotal,
            fromAddress,
            gasLimit
        );

        //We create the receipt
        let receiptUniqueId = new Date().getUTCMilliseconds();

        await receiptEndpoint.createReceipt(
            receiptUniqueId,
            trackId,
            revenueTotal,
            agreementId,
            datetime,
            fromAddress,
            gasLimit
        );
    } catch (error) {
        console.log('ERROR IN TRANSACTION ON HOLD DISTRIBUTION');
        console.log(error);
        throw new Error(error);
    }
}
module.exports.onHoldDistribution = onHoldDistribution;

async function evaluateReceivers(request) {
    console.log('*************************************');
    console.log('Request Evaluate Receivers in Distribution Endpoint.js');
    console.log(request);
    try {
        let shareTotal = 1;
        let previousReceiverId = request.previousReceiverId;
        let previousReceiverModel;
        let fromAddress = request.fromAddress;
        let gasLimit = request.gasLimit;
        let emitterId = request.emitterId;
        let datetime = request.datetime;
        let previousAgreementId = request.previousAgreementId;
        let revenueTotalInput = request.revenue;
        let getTraderRequest;

        getTraderRequest = new GetTraderRequest(emitterId, fromAddress, gasLimit);
        let emitter = await traderEndpoint.getTrader(
            getTraderRequest
        );

        if (previousReceiverId && previousReceiverId != "none") {
            getTraderRequest = new GetTraderRequest(previousReceiverId, fromAddress, gasLimit);
            previousReceiverModel = await traderEndpoint.getTrader(
                getTraderRequest
            );
            previousReceiverId = previousReceiverModel.traderId;

        } else {
            previousReceiverId = fromAddress;
        }
        //Get all agreements between emitter and receiver
        let agreements = await agreementEndpoint.getAgreementsByEmitter(
            emitter.traderId,
            fromAddress,
            gasLimit
        );
        //TODO: For each agremeent get the entire structure
        console.log("LIST OF AGREEMENTS**************************");
        console.log(agreements);

        let receiverShareListResult = [];
        if (agreements && agreements.length > 0) {
            for (const element of agreements) {
                let currentAgreement = await agreementEndpoint.getAgreement(
                    element,
                    fromAddress,
                    gasLimit
                );
                shareTotal =
                    parseFloat(shareTotal) - parseFloat(currentAgreement.percentage);
                if (shareTotal < 0) {
                    throw "Total percentage exceded permited share";
                }

                let receiverShareAmmount =
                    parseFloat(revenueTotalInput) * parseFloat(currentAgreement.percentage);

                let currentShareModel = new ReceiverShareModel(
                    currentAgreement.agreementId,
                    currentAgreement.traderEmitterId,
                    currentAgreement.traderReceiverId,
                    Math.round(receiverShareAmmount),
                    currentAgreement.percentage,
                    datetime
                );
                receiverShareListResult.push(currentShareModel);
            }

            //Now we distribute the emitter its share
            let ammountToAddEmitter =
                parseFloat(shareTotal) * parseFloat(revenueTotalInput);

            await tokenAccountEndpoint.addEnabledBalance(
                emitterId,
                Math.round(ammountToAddEmitter),
                fromAddress,
                gasLimit
            );
            let receiptUniqueId = new Date().getUTCMilliseconds();

            //Now we create the receipt
            await receiptEndpoint.createReceipt(
                receiptUniqueId,
                tracKId,
                Math.round(ammountToAddEmitter),
                previousAgreementId, //lets test this
                String(datetime),
                fromAddress,
                gasLimit
            );
        } else {
            console.log("No receivers for this trader: " + emitter.name);
        }
        return receiverShareListResult;
    } catch (error) {
        console.log('ERROR IN TRANSACTION EVALUATE RECEIVERS');
        console.log(error);
        throw new Error(error);
    }
}
module.exports.evaluateReceivers = evaluateReceivers;
