var Registrar = require('../index.js');
var ENS = require('ethereum-ens');
var CryptoJS = require('crypto-js');

var assert = require('assert');
var fs = require('fs');
var solc = require('solc');
var TestRPC = require("ethereumjs-testrpc");
var Web3 = require("web3");

var web3 = new Web3();

var accounts = null;
var ens = null;
var ensRoot = null;
var registrar = null;
var registrarAddress = null;
var rootNode = null;

var tld = "eth";
var min_length = 7;

function sha3(input) {
    return CryptoJS.SHA3(input, {outputLength: 256});
}

// Tests:
// web3.setProvider(TestRPC.provider());
web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'));


describe('Registrar', function(){
        before(function(done){
            this.timeout(20000);
            // Deploy the ENS registry and registrar
            web3.eth.getAccounts(function(err, accts){
                accounts = accts;
                /*
                // Use this block for a fresh compile and save, or for testing a fresh install
                // Otherwise it's too slow for dev processes.
                var input = fs.readFileSync('test/dotEthRegistrar.sol').toString();
                var output = solc.compile(input, 1);
                var compiled = {};
                for (var contractName in output.contracts) {
                    // code and ABI that are needed by web3 
                    compiled[contractName] = {};
                    compiled[contractName].bytecode = output.contracts[contractName].bytecode;
                    compiled[contractName].interface = JSON.parse(output.contracts[contractName].interface);
                }
                fs.writeFileSync('test/contracts.json', JSON.stringify(compiled));
                */
                // Use to speed up the testing process during development: 
                var compiled = JSON.parse(fs.readFileSync('test/contracts.json').toString());
                var deployer = compiled['DeployENS'];
                var deployensContract = web3.eth.contract(deployer.interface);
// /*       
            deployensContract.new(
                {
                 from: accts[0],
                 data: deployer.bytecode,
                 gas: 4700000
                }, function(err, contract) {
                    if(contract.address !== undefined) {
                        contract.ens.call(function(err, value) {
                            assert.equal(err, null, err);
                            ensRoot = value;
                            ens = new ENS(web3, ensRoot);
                            contract.registrarInfo.call(function(err, value) {
                                assert.equal(err, null, err);
                                registrarAddress = value[0];
                                registrar = new Registrar(web3, value[0], min_length, tld, ensRoot);
                                done();
                            });
                        });
                    } 
                }
            );
        });
    });

    registrar = new Registrar(web3, registrarAddress, min_length, tld, ensRoot);
    accounts = web3.eth.accounts;

    
    describe('#startAuction()', function(){
        it('Should return an error when the name is too short', function(done) {            
            registrar.startAuction('foo', {from: accounts[0]}, function (err, txid) {
                    assert.equal(err, Registrar.TooShort);
                    done();
                }
            );
        });

        it('Should set an `Open` node to status `Auction`', function(done) {
            registrar.startAuction('foobarbaz', {from: accounts[0]}, 
                function (err, txid) {
                    hash = web3.sha3('foobarbaz');
                    registrar.contract.entries.call(hash, function (err, result) {
                        var status = result[0].toString();
                        assert.equal(status, 1);
                        done();
                    });
                }
            );
        });

        it('Should return an error if given a nameprepped-name with any status other than `Open`', function(done) {
            registrar.startAuction('FOOBarbaz', {from: accounts[0]}, 
                function (err, result) {
                    assert.ok(err.toString().indexOf('invalid JUMP') != -1, err);
                    done();
                }
            );
        });
    }); 

    describe('#getEntry()', function(){
        it('Should return the correct properties of a name', function(done){
            // a name being auctioned
            assert.equal(registrar.getEntry("foobarbaz").status, 1); 
            // a name NOT being auctioned
            assert.equal(registrar.getEntry("thisnameisopen").status, 0); 
            // test async too
            registrar.getEntry("foobarbaz", function(err, result) {
                assert.equal(result.name, "foobarbaz"); 
                assert.equal(result.status, 1); 
                assert.equal(result.deed, '0x0000000000000000000000000000000000000000')
                assert.ok(result.registrationDate - new Date(), result.registrationDate);
                assert.equal(result.value, 0);
                assert.equal(result.highestBid, 0);
            });     
            debugger;
            registrar.getEntry("thisnameisopen", function(err, result) {
                assert.equal(result.name, "thisnameisopen"); 
                assert.equal(result.status, 0); 
                assert.equal(result.deed, '0x0000000000000000000000000000000000000000')
                assert.equal(result.registrationDate, 0);
                assert.equal(result.value, 0);
                assert.equal(result.highestBid, 0);
                done();
            });     
        });
        it('Nameprep should ensure the same entry is returned regardless of capitalization', function(){
            assert.equal(registrar.getEntry("foobarbaz").hash, registrar.getEntry("FOOBarbaz").hash)
        })
    });

    describe('#startAuctions()', function(){
        it('Should return an error when any name is too short', function(done) {
            var names = ["abcdefghij", "abcdefghi", "abcdefgh", "abcd"];
            registrar.startAuctions(names, {from:accounts[0] , gas: 4700000}, function(err, results){
                assert.equal(err, Registrar.TooShort);
                done();
            });  
        });

        it('Should set multiple valid nodes to status Auction', function(done){
            var names = ["bbb1111", "bbb2222", "bbb3333", "bbb4444"];
            registrar.startAuctions(names, {from:accounts[0]}, function(err, result) {
                names.forEach(function(name){
                    assert.equal(registrar.getEntry(name).status, 1);
                })
                done()
            });
        });
    });
    
    describe('#shaBid()', function(){
        var foobarbazBidHash = null;
        it('Should return a valid 32 byte hashed bid', function(done) {
            // This is just a randomly generated address from TestRPC, the owner does not need to be your address
            // but presumably you want it to be.
            var testOwner = "0x5834eb6b2acac5b0bfff8413622704d890f80e9e"
            // var secret = web3.sha3('secret');
            var secret = 'secret';
            var bid = "0xe686eacb824a48d85d81232df929536d630a0d0d225f8ce7ce68ba9f824a2606"
            var value = web3.toWei(1, 'ether'); 
            registrar.shaBid('foobarbaz', testOwner, value, secret, function(err,result){
                if (err) done(err);
                assert.equal(result, bid);
                foobarbazBidHash = result; 
                done(err);
            });
        });
        it('Should return the same hash for identical Nameprep names', function(done){
            // This is just a randomly generated address from TestRPC, the owner does not need to be your address
            // but presumably you want it to be.
            var testOwner = "0x5834eb6b2acac5b0bfff8413622704d890f80e9e"
            var secret = 'secret';
            var bid = "0xe686eacb824a48d85d81232df929536d630a0d0d225f8ce7ce68ba9f824a2606"
            var value = web3.toWei(1, 'ether'); 
            registrar.shaBid('FOOBARBAZ', testOwner, value, secret, function(err,result){
                if (err) done(err);
                assert.equal(result, foobarbazBidHash);
                done(err);
            }); 
        });



        it('Should save the bid params to a local JSON file');
        /*it('Should save the bid params to a local file', function (done) {
            fs.readFile('/.bids', function(err, result) {
                if (err) done(err);
                var bids = JSON.parse(result);
                var bid = bids['foobarbaz'];
                var secret = bid.secret;
                assert.ok(bid != null);
                assert.ok(secret != null);
                done();
            });
        });
        */
    });    

    describe('#newBid()', function(){
        var bid = "0xe686eacb824a48d85d81232df929536d630a0d0d225f8ce7ce68ba9f824a2606";
        var deposit = web3.toWei(2, 'ether');
        it('Should throw an error if a deposit amount is not specified', function(done){
            registrar.newBid(bid, {from: accounts[0]}, function(err, result){
                assert.equal(err, Registrar.NoDeposit);
                done();
            });   
        });
        it('Should create a new sealedBid Deed holding the value of deposit', function(done){
            registrar.newBid(bid, {from: accounts[0], value: deposit }, function(err, result){
                registrar.contract.sealedBids.call(bid, function(err, result){
                    assert.ok(result != "0x0000000000000000000000000000000000000000", result);
                    assert.equal(web3.eth.getBalance(result), deposit);
                    done();
                });
            });
        });
        
    });

    describe('#submitShaBid()' , function(){
        it('Should combine shaBid and newBid'); //pending
        function placeholder(done){
            var bid_params = { 
                name: "foobarbaz",
                owner: accounts[0],
                value: web3.toWei(1, 'ether'), 
                deposit: web3.toWei(2, 'ether'), 
                secret: "secret"
            }
            registrar.newShaBid(bid_params, function(err, result){
            });
        };
    });

    describe('#unsealBid()', function(){
        // The sealed bid created to test #newBid()
        var bid = "0xe686eacb824a48d85d81232df929536d630a0d0d225f8ce7ce68ba9f824a2606"
        var testOwner = "0x5834eb6b2acac5b0bfff8413622704d890f80e9e"
        var secret = 'secret';
        var value = web3.toWei(1, 'ether'); 
        it('Should delete the sealedBid Deed', function(done){

            registrar.unsealBid('foobarbaz', testOwner, value, secret, {from: accounts[1]}, function(err, result){
                console.log(1, err);
                console.log(2, result);
                registrar.contract.sealedBids.call(bid, function(err, result){
                    console.log(3, err);
                    console.log(4, result);
                    assert.equal(result, "0x0000000000000000000000000000000000000000");
                    done();
                });
            });
        });
        it('Should create a new Entry if it is the current highest bid');
    });
}); 




/* Snippet for creating new unit tests
    describe('...', function(){
        it('...', function(done) {
            // test body
            done();
        });
    });
*/


/*
    #cancelBid()
    * should...
*/

/*
    #finalizeAuction()
    * should...
*/

/*
    #transfer()
    * should...
*/

/*
    #releaseDeed()
    * should...
*/

/*
    #invalidateName()
    * should...
*/
