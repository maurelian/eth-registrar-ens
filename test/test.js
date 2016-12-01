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
            // Too slow for dev purposes, 
            // var input = fs.readFileSync('test/dotEthRegistrar.sol').toString();
            // var output = solc.compile(input, 1);
            
            // speeds up the testing process during development: 
            var output = JSON.parse(fs.readFileSync('test/contracts.json').toString());
            var deployer = output.contracts['DeployENS'];
            var deployensContract = web3.eth.contract(JSON.parse(deployer.interface));
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

    
    describe('#startAuction()', function(){
        
        it('Should return an error when the name is too short', function(done) {
            var registrar = new InitialRegistrar(web3, registrarAddress, min_length, tld, ensRoot);
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
                    // why is this undefined?
                    registrar.entries.call(hash, function (err, result) {
                        var status = result[0];
                        assert.equal(status, 1);
                        done();
                    });
                }
            );
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
2. #shaBid()
    * should create valid bids
*/

/*
3. #newBid()
    * should...
*/

/*
4. #unsealBid()
    * should...
*/

/*
5. #cancelBid()
    * should...
*/

/*
6. #finalizeAuction()
    * should...
*/

/*
7. #transfer()
    * should...
*/

/*
8. #releaseDeed()
    * should...
*/

/*
9. #invalidateName()
    * should...
*/


// console.log("end");
