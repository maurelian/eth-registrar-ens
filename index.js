var interfaces = require('./interfaces.js');

var CryptoJS = require('crypto-js');
var ENS = require('ethereum-ens');
var _ = require('underscore');

// var registrarInterface = [{"constant":false,"inputs":[{"name":"_hash","type":"bytes32"}],"name":"releaseDeed","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"unhashedName","type":"string"}],"name":"invalidateName","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"hash","type":"bytes32"},{"name":"owner","type":"address"},{"name":"value","type":"uint256"},{"name":"salt","type":"bytes32"}],"name":"shaBid","outputs":[{"name":"sealedBid","type":"bytes32"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"","type":"bytes32"}],"name":"entries","outputs":[{"name":"status","type":"uint8"},{"name":"deed","type":"address"},{"name":"registrationDate","type":"uint256"},{"name":"value","type":"uint256"},{"name":"highestBid","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"ens","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"","type":"bytes32"}],"name":"sealedBids","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_hash","type":"bytes32"},{"name":"newOwner","type":"address"}],"name":"transfer","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_hash","type":"bytes32"}],"name":"finalizeAuction","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_hash","type":"bytes32"},{"name":"_owner","type":"address"},{"name":"_value","type":"uint256"},{"name":"_salt","type":"bytes32"}],"name":"unsealBid","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"registryCreated","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"sealedBid","type":"bytes32"}],"name":"newBid","outputs":[],"payable":true,"type":"function"},{"constant":false,"inputs":[{"name":"seal","type":"bytes32"}],"name":"cancelBid","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_hashes","type":"bytes32[]"}],"name":"startAuctions","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_hash","type":"bytes32"}],"name":"startAuction","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"rootNode","outputs":[{"name":"","type":"bytes32"}],"payable":false,"type":"function"},{"inputs":[{"name":"_ens","type":"address"},{"name":"_rootNode","type":"bytes32"}],"payable":false,"type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"name":"hash","type":"bytes32"},{"indexed":false,"name":"auctionExpiryDate","type":"uint256"}],"name":"AuctionStarted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"hash","type":"bytes32"},{"indexed":false,"name":"deposit","type":"uint256"}],"name":"NewBid","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"hash","type":"bytes32"},{"indexed":true,"name":"owner","type":"address"},{"indexed":false,"name":"value","type":"uint256"},{"indexed":false,"name":"status","type":"uint8"}],"name":"BidRevealed","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"hash","type":"bytes32"},{"indexed":true,"name":"owner","type":"address"},{"indexed":false,"name":"value","type":"uint256"},{"indexed":false,"name":"now","type":"uint256"}],"name":"HashRegistered","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"hash","type":"bytes32"},{"indexed":false,"name":"value","type":"uint256"}],"name":"HashReleased","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"hash","type":"bytes32"},{"indexed":true,"name":"name","type":"string"},{"indexed":false,"name":"value","type":"uint256"},{"indexed":false,"name":"now","type":"uint256"}],"name":"HashInvalidated","type":"event"}];
// var registryInterface = [{"constant":true,"inputs":[{"name":"node","type":"bytes32"}],"name":"resolver","outputs":[{"name":"","type":"address"}],"type":"function"},{"constant":true,"inputs":[{"name":"node","type":"bytes32"}],"name":"owner","outputs":[{"name":"","type":"address"}],"type":"function"},{"constant":false,"inputs":[{"name":"node","type":"bytes32"},{"name":"resolver","type":"address"}],"name":"setResolver","outputs":[],"type":"function"},{"constant":false,"inputs":[{"name":"node","type":"bytes32"},{"name":"label","type":"bytes32"},{"name":"owner","type":"address"}],"name":"setSubnodeOwner","outputs":[],"type":"function"},{"constant":false,"inputs":[{"name":"node","type":"bytes32"},{"name":"owner","type":"address"}],"name":"setOwner","outputs":[],"type":"function"}];

var namehash = ENS.prototype.namehash;

/**
 * Constructs a new InitialRegistrar instance.
 * @class
 * @param {object} web3 A web3 instance to use to communicate with the blockchain.
 * @param {address} address The address of the registrar.
 * @param {min_length} integer The minimum length of a name require by the registrar.
 * @param {tld} string The top level domain
 * @param {ens} string The top level domain
 */
function InitialRegistrar(web3, address, min_length, tld, ens){
    this.web3 = web3;
    this.contract = web3.eth.contract(interfaces.registrarInterface).at(address);
    this.min_length = min_length;
    this.tld = tld;
    this.ens = ens;
    // this isn't used yet, but I expect it will be handy
    this.rootNode = namehash(tld);
}

InitialRegistrar.TooShort = Error("Name is too short");

function sha3(input) {
    return CryptoJS.SHA3(input, {outputLength: 256});
}

/* define namePrep to be added to startAuction
function namePrep (name) {
    // body...
}
*/

InitialRegistrar.prototype.startAuction = function(name){
    var hash = sha3(name);

    var callback = undefined;
    
    if(typeof arguments[arguments.length - 1] == 'function') {
        callback = arguments[arguments.length - 1];
    }

    var params = {};
    // test to see if we have parameters for the web3 request:
    if(callback && arguments.length == 3) {
        params = arguments[arguments.length - 2];
    } else if(!callback && arguments.length == 2) {
        params = arguments[arguments.length - 1];
    }

    if(!callback) {
        if (name.length < this.min_length) {
            throw InitialRegistrar.TooShort;
        }
        return this.contract.startAuction(hash, params);
    } else {
        if (name.length < this.min_length) {
            callback(InitialRegistrar.TooShort, null);
        } else {
            this.contract.startAuction(hash, params, callback);
        }
    }
};

/**
 * startAuctions opens multiple auctions at once
 * @param {array} names An array of names to start auctions on
 * @param {object} options An optional dict of parameters to pass to web3.
 * @param {function} callback An optional callback; if specified, the
 *        function executes asynchronously.
 * @returns The resolved address if callback is not supplied.
 */
InitialRegistrar.prototype.startAuctions = function(names){
    var hashes = names.map(sha3);
    var invalidNames = names.filter(
        function(name){ return name.length < this.min_length;}, this);
    
    var callback = undefined;

    if (typeof(arguments[arguments.length-1])=='function'){
        callback = arguments[arguments.length-1];
    }

    var params = {};
    if (callback && arguments.length==3){
        params = arguments[arguments.length-2];
    } else if (!callback && arguments.length==2){
        params = arguments[arguments.length-1];
    }

    if (!callback) {
        if (invalidNames.length > 0)
            throw InitialRegistrar.TooShort;
        return this.contract.startAuctions(hashes, params);
    } else {
        if (invalidNames.length > 0)
            callback(InitialRegistrar.TooShort, null);
        else
            this.contract.startAuctions(hashes, params, callback);
    }

};


module.exports = InitialRegistrar;

