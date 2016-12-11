var InitialRegistrar = require('../index.js');
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


describe('InitialRegistrar', function(){
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
                                registrar = new InitialRegistrar(web3, value[0], min_length, tld, ensRoot);
                                done();
                            });
                        });
                    } 
                }
            );
        });
    });

    var registrar = new InitialRegistrar(web3, registrarAddress, min_length, tld, ensRoot);

    
    describe('#startAuction()', function(){
        accounts = web3.eth.accounts;
        it('Should return an error when the name is too short', function(done) {            
            registrar.startAuction('foo', {from: accounts[0]}, function (err, txid) {
                    assert.equal(err, InitialRegistrar.TooShort);
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

        it('Should return an error if given a name with any status other than `Open`', function(done) {
            registrar.startAuction('foobarbaz', {from: accounts[0]}, 
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
    });

    describe('#startAuctions()', function(){
        it('Should return an error when any name is too short', function(done) {
            var names = ["abcdefghij", "abcdefghi", "abcdefgh", "abcd"];
            registrar.startAuctions(names, {from:accounts[0] , gas: 4700000}, function(err, results){
                assert.equal(err, InitialRegistrar.TooShort);
                done();
            });  
        });

        it('V1: Should set multiple valid nodes to status Auction', function(done){
            var names = ["aaa1111", "bbb2221", "ccc3331", "ddd4441"];
            var hashes = names.map(web3.sha3);
            // this test currently only checks one node
            registrar.startAuctions(names, {from:accounts[0]}, function(err, result) {
                registrar.contract.entries.call(hashes[0], function (err, result) {
                    var status = result[0].toNumber();
                    assert.equal(status, 1);
                    done();
                });
            });
        }); 

        it('V2: Should set multiple valid nodes to status Auction', function(done){
            var names = ["bbb1111", "bbb2222", "bbb3333", "bbb4444"];
            registrar.startAuctions(names, {from:accounts[0]}, function(err, result) {
                names.forEach(function(name){
                    assert.equal(registrar.getEntry(name).status, 1);
                })
                done()
            });
        });
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
    #getStatus
    * request from @ferni to create a status check method for a given name
    * 
*/

/* 
    #normalize
    * should normalize the name via nameprep 

*/


/*
    #shaBid()
    * should create valid bids
*/

/*
    #newBid()
    * should...
*/

/*
    #unsealBid()
    * should...
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
