/*
* Import solidity (Registar code, ENS)
* Connect to a node
* Compile and deploy solidity code. 
* Instantiate contracts in web3
* Run tests
*/


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
        
        it('Should return an error when the name is too short', function(done) {            //  'function (name){\n    var hash = sha3(name);\n\n    var callback = undefined;\n    \n... (length: 835)'
            registrar.startAuction('foo', {from: accounts[0]}, function (err, txid) {
                    assert.equal(err, InitialRegistrar.TooShort);
                    done();
                }
            );
        });

        it('Should set an `Open` node to status `Auction`', function(done) {
            registrar.startAuction('foobarbaz', {from: accounts[0]}, 
                function (err, result) {
                    hash = sha3('foobarbaz');
                    registrar.contract.entries.call(hash, function (err, result) {
                        var status = result[0].toString();
                        assert.equal(status, 1);
                        done();
                    });
                }
            );
        });
        it('Should return an error if a node has any status other than `Open`', function(done) {
            registrar.startAuction('foobarbaz', {from: accounts[0]}, 
                function (err, result) {
                    assert.ok(err.toString().indexOf('invalid JUMP') != -1, err);
                    done();
                }
            );
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
