'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var Registrar = require('../index.js');
var ENS = require('ethereum-ens');

var assert = require('assert');
var fs = require('fs');
var solc = require('solc'); // eslint-disable-line
var TestRPC = require('ethereumjs-testrpc'); // eslint-disable-line
var Web3 = require('web3');

var web3 = new Web3();

web3.setProvider(TestRPC.provider());
// web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'));

var accounts = null;
var ens = null;
var ensRoot = null;
var registrar = null;
var highBid = null;
// TODO: test submitting and revealing low bid
var lowBid = null; // eslint-disable-line


describe('Registrar', function () {
  before(function (done) {
    // eslint-disable-line
    this.timeout(20000);
    // Deploy the ENS registry and registrar
    web3.eth.getAccounts(function (err, accts) {
      if (err) {
        throw err;
      }
      accounts = accts;
      /*
      // Use this block to recompile and save
      // Otherwise it's too slow for dev purposes
      const input = fs.readFileSync('test/dotEthRegistrar.sol').toString();
      const output = solc.compile(input, 1);
      const compiled = {};
      for (const contractName in output.contracts) {
        // code and ABI that are needed by web3
        compiled[contractName] = {};
        compiled[contractName].bytecode = output.contracts[contractName].bytecode;
        compiled[contractName].interface = JSON.parse(output.contracts[contractName].interface);
      }
      fs.writeFileSync('test/contracts.json', JSON.stringify(compiled));
      */
      // Use to speed up the testing process during development:
      var compiled = JSON.parse(fs.readFileSync('src/test/contracts.json').toString());
      var deployer = compiled['DeployENS']; // eslint-disable-line
      var deployensContract = web3.eth.contract(deployer.interface);
      deployensContract.new({
        from: accts[0],
        data: deployer.bytecode,
        gas: 4700000
      }, function (deploymentErr, contract) {
        assert.equal(deploymentErr, null);
        if (contract.address !== undefined) {
          contract.ens.call(function (contractErr, value) {
            assert.equal(contractErr, null, contractErr);
            ensRoot = value;
            // The ethereum-ens module has a default address built in, but we can't
            // use that on testnet, so we get the ensRoot value from our deployment contract
            ens = new ENS(web3, ensRoot);
            contract.registrarInfo.call(function (registrarInfoErr, registrarInfoValue) {
              assert.equal(registrarInfoErr, null, registrarInfoErr);
              assert.ok(registrarInfoValue !== null);
              registrar = new Registrar(web3, ens, 'eth', 7, function (constructRegistrarErr, constructRegistrarResult) {
                assert.equal(constructRegistrarErr, null, constructRegistrarErr);
                assert.equal(typeof constructRegistrarResult === 'undefined' ? 'undefined' : _typeof(constructRegistrarResult), 'string');
                done();
              });
            });
          });
        }
      });
    });
  });

  before(function (done) {
    // Declare various bids for testing in advance
    registrar.bidFactory('foobarbaz',
    // just a randomly generated ethereum address
    accounts[0], web3.toWei(2, 'ether'), // value
    'secret', function (highBidErr, highBidObject) {
      assert.equal(highBidErr, null);
      assert.equal(typeof highBidObject === 'undefined' ? 'undefined' : _typeof(highBidObject), 'object');
      highBid = highBidObject;
      registrar.bidFactory('foobarbaz', accounts[0], web3.toWei(1, 'ether'), // value
      'secret', function (lowBidErr, lowBidObject) {
        assert.equal(lowBidErr, null);
        assert.equal(typeof lowBidObject === 'undefined' ? 'undefined' : _typeof(lowBidObject), 'object');
        lowBid = lowBidObject;
        done();
      });
    });

    // capitalizedBid = registrar.bidFactory(
    //     'FOObarBAZ',
    //     // just a randomly generated ethereum address
    //     accounts[0],
    //     web3.toWei(2, 'ether'), // value
    //     'secret'
    // );
  });

  describe('#bidFactory()', function () {
    it('should produce valid hashes', function () {
      assert.ok(_typeof(highBid.shaBid), 'string');
      assert.ok(highBid.shaBid.indexOf('0x') !== -1, highBid.shaBid);
    });
  });

  describe('#openAuction()', function () {
    it('Should return an error when the name is too short', function (done) {
      registrar.openAuction('foo', { from: accounts[0], gas: 4700000 }, function (err, txid) {
        assert.equal(err, Registrar.TooShort);
        assert.equal(txid, null);
        done();
      });
    });

    it('Should return an error when the name contains special characters', function (done) {
      registrar.openAuction('fooøø*/.ôôóOOOo', { from: accounts[0], gas: 4700000 }, function (err, txid) {
        assert.ok(err.toString().indexOf('Illegal char') !== -1, err);
        assert.equal(txid, null);
        done();
      });
    });

    it('Should set an `Open` node to status `Auction`', function (done) {
      registrar.openAuction('foobarbaz', { from: accounts[0], gas: 4700000 }, function (err, txid) {
        assert.equal(err, null);
        assert.equal(typeof txid === 'undefined' ? 'undefined' : _typeof(txid), 'string');

        // TODO: also test to ensure that randomly generated decoy names are open
        var hash = registrar.sha3('foobarbaz');
        registrar.contract.entries.call(hash, function (entryErr, entryResult) {
          assert.equal(entryErr, null);
          var status = entryResult[0].toNumber();
          assert.equal(status, 1);
          done();
        });
      });
    });

    it('Should return an error if given a nameprepped-name with any status other than `Open`', function (done) {
      registrar.openAuction('foobarbaz', { from: accounts[0], gas: 4700000 }, function (err, result) {
        assert.ok(err.toString().indexOf('invalid JUMP') !== -1, err);
        assert.equal(result, null);
        done();
      });
    });
  });

  describe('#getEntry()', function () {
    it('Should return the correct properties of a name', function (done) {
      // a name being auctioned
      registrar.getEntry('foobarbaz', function (entryErr1, entryResult1) {
        assert.equal(entryErr1, null);
        assert.equal(entryResult1.name, 'foobarbaz');
        assert.equal(entryResult1.status, 1);
        assert.equal(entryResult1.deed.address, '0x0000000000000000000000000000000000000000');
        assert.ok(entryResult1.registrationDate * 1000 - new Date() > 0, entryResult1.registrationDate);
        assert.equal(entryResult1.value, 0);
        assert.equal(entryResult1.highestBid, 0);
        // a name NOT being auctioned
        registrar.getEntry('thisnameisopen', function (entryErr2, entryResult2) {
          assert.equal(entryErr2, null);
          assert.equal(entryResult2.name, 'thisnameisopen');
          assert.equal(entryResult2.status, 0);
          assert.equal(entryResult2.deed.address, '0x0000000000000000000000000000000000000000');
          assert.equal(entryResult2.registrationDate, 0);
          assert.equal(entryResult2.value, 0);
          assert.equal(entryResult2.highestBid, 0);
          done();
        });
      });
    });

    it('Normalisation should ensure the same entry is returned regardless of capitalization', function (done) {
      registrar.getEntry('foobarbaz', function (entryErr1, entryResult1) {
        assert.equal(entryErr1, null);
        registrar.getEntry('FOOBarbaz', function (entryErr2, entryResult2) {
          assert.equal(entryErr2, null);
          assert.equal(entryResult1.name, entryResult2.name);
          assert.equal(entryResult1.hash, entryResult2.hash);
          done();
        });
      });
    });
  });

  describe('#submitBid()', function () {
    it('Should throw an error if a deposit amount is not equal or greater than the value', function (done) {
      registrar.submitBid(highBid, { from: accounts[0], value: web3.toWei(1, 'ether'), gas: 4700000 }, function (submitBidErr, submitBidResult) {
        assert.equal(submitBidErr, Registrar.NoDeposit);
        assert.equal(submitBidResult, null);
        done();
      });
    });

    it('Should create a new sealedBid Deed holding the value of deposit', function (done) {
      registrar.submitBid(highBid, { from: accounts[0], value: web3.toWei(3, 'ether'), gas: 4700000 }, function (submitBidErr, submitBidResult) {
        assert.equal(submitBidErr, null);
        assert.ok(submitBidResult != null);
        registrar.contract.sealedBids(highBid.shaBid, function (sealedBidError, sealedBidResult) {
          assert.equal(sealedBidError, null);
          assert.ok(sealedBidResult !== '0x0000000000000000000000000000000000000000', sealedBidResult);
          web3.eth.getBalance(sealedBidResult, function (sealedBidBalanceErr, sealedBidBalanceResult) {
            assert.equal(sealedBidBalanceErr, null);
            assert.equal(sealedBidBalanceResult, web3.toWei(3, 'ether'));
            done();
          });
        });
      });
    });
  });

  describe('#isBidRevealed()', function () {
    it('Should return the bid as not revealed yet', function (done) {
      registrar.isBidRevealed(highBid, function (err, isRevealed) {
        assert.equal(err, null);
        assert.equal(isRevealed, false);
        done();
      });
    });
  });

  describe('#unsealBid()', function () {
    it('Should delete the sealedBid Deed', function (done) {
      web3.currentProvider.sendAsync({
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        // 86400 seconds per day, first auctions end 2 weeks after registrar contract is deployed
        // The reveal period is the last 24 hours of the auction.
        params: [86400 * (7 * 2 - 1)],
        id: new Date().getTime()
      }, function () {
        registrar.unsealBid(highBid, { from: accounts[0], gas: 4700000 }, function (err, result) {
          assert.equal(err, null);
          assert.ok(result !== null);
          registrar.contract.sealedBids.call(highBid.shaBid, function (sealedBidErr, sealedBidResult) {
            assert.equal(sealedBidErr, null);
            assert.equal(sealedBidResult, '0x0000000000000000000000000000000000000000');
            done();
          });
        });
      });
    });
    it('Should create a new Entry if it is the current highest bid', function (done) {
      registrar.getEntry('foobarbaz', function (err, result) {
        assert.equal(result.name, 'foobarbaz');
        assert.ok(result.deed.address !== '0x0000000000000000000000000000000000000000');
        var now = new Date();
        assert.ok(+now - result.deed.creationDate * 1000 > 0, result.deed.creationDate);
        assert.equal(Number(result.highestBid), highBid.value);
        done();
      });
    });
  });

  describe('#isBidRevealed()', function () {
    it('Should return the bid as revealed', function (done) {
      registrar.isBidRevealed(highBid, function (err, isRevealed) {
        assert.equal(err, null);
        assert.equal(isRevealed, true);
        done();
      });
    });
  });

  describe('#finalizeAuction()', function () {
    it('Should throw an error if called too soon', function (done) {
      registrar.finalizeAuction('foobarbaz', { from: accounts[0], gas: 4700000 }, function (finalizeAuctionErr, finalizeAuctionResult) {
        assert.ok(finalizeAuctionErr.toString().indexOf('invalid JUMP') !== -1, finalizeAuctionErr);
        assert.equal(finalizeAuctionResult, null);
        done();
      });
    });

    it('Should update the deed to hold the value of the winning bid', function (done) {
      web3.currentProvider.sendAsync({
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        // 86400 seconds per day, first auctions end 4 weeks after registrar contract is deployed
        params: [86400 * 7 * 4],
        id: new Date().getTime()
      }, function () {
        registrar.finalizeAuction('foobarbaz', { from: accounts[0], gas: 4700000 }, function (finalizeAuctionErr, finalizeAuctionResult) {
          assert.equal(finalizeAuctionErr, null);
          assert.ok(finalizeAuctionResult != null);
          registrar.getEntry('foobarbaz', function (getEntryErr, getEntryResult) {
            assert.equal(getEntryErr, null);
            assert.equal(getEntryResult.status, 2);
            assert.equal(getEntryResult.mode, 'owned');
            done();
          });
        });
      });
    });
  });

  describe('#transfer()', function () {
    it('Should throw an error if the sender is not the owner', function (done) {
      registrar.transfer('foobarbaz', accounts[9], { from: accounts[8], gas: 4700000 }, function (transferNameErr, transferNameResult) {
        assert.ok(transferNameErr.toString().indexOf('Only the owner' !== -1));
        assert.equal(transferNameResult, null);
        done();
      });
    });

    it('Should update the owner of the deed after a successful transfer', function (done) {
      registrar.transfer('foobarbaz', accounts[9], { from: accounts[0], gas: 4700000 }, function (transferNameErr, transferNameResult) {
        assert.equal(transferNameErr, null);
        assert.ok(typeof transferNameResult === 'string');
        registrar.getEntry('foobarbaz', function (getEntryErr, getEntryResult) {
          assert.equal(getEntryErr, null);
          assert.equal(getEntryResult.deed.owner, accounts[9]);
          done();
        });
      });
    });
  });

  describe.skip('#releaseDeed()', function () {
    it('Should do something specific', function (done) {
      done();
    });
  });

  describe.skip('#cancelBid()', function () {
    it('Should do something specific', function (done) {
      done();
    });
  });

  describe.skip('#invalidateName()', function () {
    it('Should do something specific', function (done) {
      done();
    });
  });
});

/* Snippet for creating new unit tests
  describe('...', () => {
    it('...', (done) =>  {
      // test body
      done();
    });
  });
*/