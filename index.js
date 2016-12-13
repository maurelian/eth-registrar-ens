var interfaces = require('./interfaces.js');

var CryptoJS = require('crypto-js');
var ENS = require('ethereum-ens');
var StringPrep = require('node-stringprep').StringPrep;
var NamePrep = new StringPrep('nameprep');
var _ = require('underscore');

// var registrarInterface = [{"constant":false,"inputs":[{"name":"_hash","type":"bytes32"}],"name":"releaseDeed","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"unhashedName","type":"string"}],"name":"invalidateName","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"hash","type":"bytes32"},{"name":"owner","type":"address"},{"name":"value","type":"uint256"},{"name":"salt","type":"bytes32"}],"name":"shaBid","outputs":[{"name":"sealedBid","type":"bytes32"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"","type":"bytes32"}],"name":"entries","outputs":[{"name":"status","type":"uint8"},{"name":"deed","type":"address"},{"name":"registrationDate","type":"uint256"},{"name":"value","type":"uint256"},{"name":"highestBid","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"ens","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"","type":"bytes32"}],"name":"sealedBids","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_hash","type":"bytes32"},{"name":"newOwner","type":"address"}],"name":"transfer","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_hash","type":"bytes32"}],"name":"finalizeAuction","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_hash","type":"bytes32"},{"name":"_owner","type":"address"},{"name":"_value","type":"uint256"},{"name":"_salt","type":"bytes32"}],"name":"unsealBid","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"registryCreated","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"sealedBid","type":"bytes32"}],"name":"newBid","outputs":[],"payable":true,"type":"function"},{"constant":false,"inputs":[{"name":"seal","type":"bytes32"}],"name":"cancelBid","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_hashes","type":"bytes32[]"}],"name":"startAuctions","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_hash","type":"bytes32"}],"name":"startAuction","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"rootNode","outputs":[{"name":"","type":"bytes32"}],"payable":false,"type":"function"},{"inputs":[{"name":"_ens","type":"address"},{"name":"_rootNode","type":"bytes32"}],"payable":false,"type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"name":"hash","type":"bytes32"},{"indexed":false,"name":"auctionExpiryDate","type":"uint256"}],"name":"AuctionStarted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"hash","type":"bytes32"},{"indexed":false,"name":"deposit","type":"uint256"}],"name":"NewBid","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"hash","type":"bytes32"},{"indexed":true,"name":"owner","type":"address"},{"indexed":false,"name":"value","type":"uint256"},{"indexed":false,"name":"status","type":"uint8"}],"name":"BidRevealed","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"hash","type":"bytes32"},{"indexed":true,"name":"owner","type":"address"},{"indexed":false,"name":"value","type":"uint256"},{"indexed":false,"name":"now","type":"uint256"}],"name":"HashRegistered","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"hash","type":"bytes32"},{"indexed":false,"name":"value","type":"uint256"}],"name":"HashReleased","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"hash","type":"bytes32"},{"indexed":true,"name":"name","type":"string"},{"indexed":false,"name":"value","type":"uint256"},{"indexed":false,"name":"now","type":"uint256"}],"name":"HashInvalidated","type":"event"}];
// var registryInterface = [{"constant":true,"inputs":[{"name":"node","type":"bytes32"}],"name":"resolver","outputs":[{"name":"","type":"address"}],"type":"function"},{"constant":true,"inputs":[{"name":"node","type":"bytes32"}],"name":"owner","outputs":[{"name":"","type":"address"}],"type":"function"},{"constant":false,"inputs":[{"name":"node","type":"bytes32"},{"name":"resolver","type":"address"}],"name":"setResolver","outputs":[],"type":"function"},{"constant":false,"inputs":[{"name":"node","type":"bytes32"},{"name":"label","type":"bytes32"},{"name":"owner","type":"address"}],"name":"setSubnodeOwner","outputs":[],"type":"function"},{"constant":false,"inputs":[{"name":"node","type":"bytes32"},{"name":"owner","type":"address"}],"name":"setOwner","outputs":[],"type":"function"}];

var namehash = ENS.prototype.namehash;


/** 
 * Constructs a new Registrar instance, provides an easy-to-use interface to the 
 * [Initial Registrar][wiki], which governs the `.eth` namespace.  
 * [wiki]: https://github.com/ethereum/ens/wiki
 * 
 * Todo: Make all constructor params (excluding `web3` optional, and default to those corresponding to the 
 * `eth` registrar in the public ENS registry. 
 *
 * @class
 * @param {object} web3 A web3 instance to use to communicate with the blockchain.
 * @param {address} address The address of the registrar.
 * @param {integer} min_length The minimum length of a name require by the registrar.
 * @param {string} tld The top level domain
 * @param {string} ens The address of the ENS instance in which 
 * Example usage:
 *
 *     var Registrar = require('dot-eth-js');
 *     var Web3 = require('web3');
 *
 *     var web3 = new Web3();
 *     registrar = new Registrar(web3, registrarAddress, min_length, tld, ensRoot);
 *
 *     var name = 'foobarbaz';
 *     registrar.startAuction(name);
 *
 *     var owner = web3.eth.accounts[0]
 *     var value = web3.toWei(1, 'ether');
 *     
 *     // generate a sealed bid
 *     var bid = registrar.shaBid(name, owner, value, 'secret');
 *       
 *     // submit a bid, and a deposit value. The parameters of your true bid are secret. 
 *     var deposit = web3.toWei(2, 'ether');
 *     registrar.newBid(bid, {value: deposit});
 *     
 *     // reveal your bid during the reveal period
 *     registrar.unsealBid(name, owner, value, 'secret');
 *
 *     // After the registration date has passed, assign ownership of the name
 *     // in the ENS. In this case, the highest bidder would now own 'foobarbaz.eth'
 *     registrar.finalizeAuction(name);
 *
 *
 *
 *
 *
 * Throughout this module, the same optionally-asynchronous pattern as web3 is
 * used: all functions that call web3 take a callback as an optional last
 * argument; if supplied, the function returns nothing, but instead calls the
 * callback with (err, result) when the operation completes.
 *
 * Functions that create transactions also take an optional 'options' argument;
 * this has the same parameters as web3.
 *
 * @author J Maurelian 
 * @date 2016
 * @license LGPL
 *
 * 
 *
 */
function Registrar(web3, address, min_length, tld, ens){
    this.web3 = web3;
    this.contract = web3.eth.contract(interfaces.registrarInterface).at(address);
    this.min_length = min_length;
    this.tld = tld;
    this.ens = ens;
    // this isn't used yet, but I expect it will be handy
    this.rootNode = namehash(tld);
}

Registrar.TooShort = Error("Name is too short");

function sha3(input) {
    return CryptoJS.SHA3(input, {outputLength: 256});
}


/**
 * Constructs a new Entry instance corresponding to a name.
 *
 * @param {string} name The unhashed name 
 * @param {string} hash
 * @param {number} status
 * @param {address} deed
 * @param {number} registrationDate
 * @param {number} value
 * @param {number} highestBid
 */
function Entry(name, hash, status, deed, registrationDate, value, highestBid){
    this.name = name;
    this.hash = hash;
    this.status = status;
    this.deed = deed;
    this.registrationDate = registrationDate;
    this.value = value;
    this.highestBid = highestBid;
}

/**
 * Returns the properties of the entry for a given a name
 * 
 * @method getEntry
 * @alias Registrar.getEntry
 * @memberOf Registrar.prototype
 * @param {string} name The name to get the entry for
 * @param {function} callback An optional callback; if specified, the
 *        function executes asynchronously.
 *
 * @returns An Entry object
 */
Registrar.prototype.getEntry = function(name, callback){
    var name = NamePrep.prepare(name);
    var hash = this.web3.sha3(name);

    var e = this.contract.entries(hash);
    var entry = new Entry(name, hash, e[0].toNumber(), e[1], e[2].toNumber(), e[3].toNumber(), e[4].toNumber());

    if (callback){
        callback(null, entry);
    } else {
        return entry;
    }
};

/**
 * Converts a name to a hash string, and opens an auction on that hash.
 *
 * @param {string} name The name to start an auction on
 * @param {object} params An optional transaction object to pass to web3.
 * @param {function} callback An optional callback; if specified, the
 *        function executes asynchronously.
 *
 * @returns The txid if callback is not supplied.
 */
Registrar.prototype.startAuction = function(name){
    var name = NamePrep.prepare(name);
    var hash = this.web3.sha3(name);
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
            throw Registrar.TooShort;
        }
        // the async version reports an invalid opcode
        return this.contract.startAuction(hash, params);
    } else {
        if (name.length < this.min_length) {
            callback(Registrar.TooShort, null);
        } else {
            this.contract.startAuction(hash, params, callback);
        }
    }
};

/**
 * Opens auctions for multiple names at once. Since names are registered as hashes,
 * this helps to prevent other bidders from guessing which names you are interested in.
 * 
 * @param {array} names An array of names to start auctions on
 * @param {object} params An optional transaction object to pass to web3.
 * @param {function} callback An optional callback; if specified, the
 *        function executes asynchronously.
 *
 * @returns The txid if callback is not supplied.
 */
Registrar.prototype.startAuctions = function(names){
    var hashes = names.map(this.web3.sha3);
    var invalidNames = names.filter(
        function(name){ return name.length < this.min_length;}, this
    );
    
    var callback = undefined;

    if (typeof(arguments[arguments.length - 1]) == 'function'){
        callback = arguments[arguments.length - 1];
    }

    var params = {};
    if (callback && arguments.length == 3){
        params = arguments[arguments.length - 2];
    } else if (!callback && arguments.length == 2){
        params = arguments[arguments.length - 1];
    }

    if (!callback) {
        if (invalidNames.length > 0)
            throw Registrar.TooShort;
        return this.contract.startAuctions(hashes, params);
    } else {
        if (invalidNames.length > 0)
            callback(Registrar.TooShort, null);
        else
            this.contract.startAuctions(hashes, params, callback);
    }
};


/**
 * Generates the "bid string" (hash) which representing a sealed bid. This does not 
 * submit the bid to the registrar, it only calls on the registrar's corresponding
 * method. 
 *
 * ToDo: Make `owner` default to sender if not specified. 
 * 
 * @param {string} name The name to be bid on
 * @param {string} address An optional owner address
 * @param {number} value The value of your bid in wei
 * @param {secret} secret An optional random value
 *
 * @returns the sealed bid hash string
 */
// How should we better handle secret generation and storage?
// it could be abstracted away and handle generation, storage agnd retrieval. 
// var bid = ethRegistrar.shaBid(web3.sha3('name'), eth.accounts[0], web3.toWei(1, 'ether'), web3.sha3('secret'));
Registrar.prototype.shaBid = function(name, owner, value, secret, callback){
    var name = NamePrep.prepare(name);
    var hash = this.web3.sha3(name);
    var hexSecret = this.web3.sha3(secret);

    if (!callback){
        return this.contract.shaBid(hash, owner, value, hexSecret);
    } else {
        this.contract.shaBid(hash, owner, value, hexSecret, callback);
    }
};

Registrar.NoDeposit = Error("You must specify a deposit amount greater than the value of your bid");

/**
 * Submits a bid string to the registrar, creating a new sealed bid entry.
 * The value 
 * 
 * @param {string} bid 
 * @param {object} params A dict of parameters to pass to web3. An amount must be included.
 * @param {function} callback An optional callback; if specified, the
 *        function executes asynchronously.
 *
 * @returns The transaction ID if callback is not supplied.
 */
/* At present this provides very little utility, aside from putting the method where you would expect it to be.
 * More value would be in: 
    * creating the bid hash string
    * accepting the value as a "deposit" variable 
    * accepting a bid object:
    { 
        name: "name",
        owner: "0xaddress",
        value: 1, 
        deposit: 2, 
        secret: "secret"
    }
*/

Registrar.prototype.newBid = function(bid, params, callback){
    // Unlike the previous methods, params are necessary here in order to make the deposit
    if (!callback){
        if(!params.value){
           throw Registrar.NoDeposit;
        }
        return this.contract.newBid(bid, params);
    } else {
        if(!params.value){
            callback(Registrar.NoDeposit, null);
        } else {
            this.contract.newBid(bid, params, callback);
        }
    }
};

/**
 * Submits the parameters of a bid. The registrar will then generate
 * the bid string, and associate them with the previously submitted bid string and
 * deposit. If you have not already submitted a bid string, the registrar will throw.
 * If your bid is revealed as the current highest; the difference between your deposit
 * and bid value will be returned to you, and the previous highest bidder will have 
 * their funds returned. If you are not the highest bidder, all your funds will be 
 * returned. Returns are sent to the owner address on the bid. 
 * 
 * @param {string} name 
 * @param {address} owner An optional owner address; defaults to sender
 * @param {number} value The value of your bid
 * @param {secret} secret The secret used to create the bid string 
 * @param {object} options An optional transaction object to pass to web3.
 * @param {function} callback An optional callback; if specified, the
 *        function executes asynchronously.
 *
 * @returns The transaction ID if callback is not supplied.
 */
Registrar.prototype.unsealBid = function(name, owner, value, secret){
    var name = NamePrep.prepare(name);
    var hash = this.web3.sha3(name);
    var hexSecret = this.web3.sha3(secret);

    var callback = undefined;
    if (typeof(arguments[arguments.length - 1]) == 'function'){
        callback = arguments[arguments.length - 1];
    }

    var params = {};
    if (callback && arguments.length == 6){
        params = arguments[arguments.length - 2];
    } else if (!callback && arguments.length == 5){
        params = arguments[arguments.length - 1];
    }
    
    if (!callback){
        return this.contract.unsealBid(hash, owner, value, hexSecret, params);
    } else {
        this.contract.unsealBid(hash, owner, value, hexSecret, params, callback);
    }
};

/**
 * __Not yet implemented__
 * After the registration date has passed, calling finalizeAuction
 * will set the winner as the owner of the corresponding ENS subnode. 
 * 
 * @param {string} name 
 * @param {object} options An optional transaction object to pass to web3.
 * @param {function} callback An optional callback; if specified, the
 *        function executes asynchronously.
 *
 * @returns The transaction ID if callback is not supplied.
 */
Registrar.prototype.finalizeAuction = function(name){

}; 

/**
 * __Not yet implemented__
 * The owner of a domain may transfer it, and the associated deed,
 * to someone else at any time.
 * 
 * @param {string} name The node to transfer
 * @param {string} newOwner The address to transfer ownership to
 * @param {object} options An optional transaction object to pass to web3.
 * @param {function} callback An optional callback; if specified, the
 *        function executes asynchronously.
 *
 * @returns The transaction ID if callback is not supplied.
 */
Registrar.prototype.transfer = function(name, newOwner){
    
} 

/**
 * __Not yet implemented__
 * After one year, the owner can release the property and get their ether back
 *
 * @param {string} name The name to release
 * @param {object} options An optional transaction object to pass to web3.
 * @param {function} callback An optional callback; if specified, the
 *        function executes asynchronously.
 *
 * @returns The transaction ID if callback is not supplied. 
 */
Registrar.prototype.releaseDeed = function(name){
    
}

/**
 * __Not yet implemented__
 * Submit a name 6 characters long or less. If it has been registered, 
 * the submitter will earn a portion of the deed value, and the name will be updated 
 *
 * @param {string} name An invalid name to search for in the registry.
 * @param {object} options An optional transaction object to pass to web3.
 * @param {function} callback An optional callback; if specified, the
 *        function executes asynchronously.
 *
 * @returns The transaction ID if callback is not supplied. 
 */
Registrar.prototype.invalidateName = function(name){

};

    
/**
 * __Not yet implemented__
 * Transfers the deed to the current registrar, if different from this one.
 * Used during the upgrade process to a permanent registrar.
 *
 * @param name The name to transfer. 
 * @param {object} options An optional transaction object to pass to web3.
 * @param {function} callback An optional callback; if specified, the
 *        function executes asynchronously.
 *
 * @returns The transaction ID if callback is not supplied. 
 */
Registrar.prototype.transferRegistrars = function(name){

}; 

module.exports = Registrar;

