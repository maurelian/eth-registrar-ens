const Registrar = require('../../src/index.js');
const ENS = require('ethereum-ens');

const assert = require('assert');
const fs = require('fs');
const solc = require('solc'); // eslint-disable-line
const TestRPC = require('ethereumjs-testrpc'); // eslint-disable-line
const Web3 = require('web3');

const web3 = new Web3();
// Unfortunately invoking TestRPC here doesn't support synchronous calls
// so we need to run it in a terminal
// web3.setProvider(TestRPC.provider());
web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'));

let accounts = null;
let ens = null;
let ensRoot = null;
let registrar = null;
let highBid = null;
// TODO: test submitting and revealing low bid
let lowBid = null;   // eslint-disable-line
let capitalizedBid = null;


describe('Registrar', () => {
  before(function (done) { // eslint-disable-line
    this.timeout(30000);
    // Deploy the ENS registry and registrar
    web3.eth.getAccounts((err, accts) => {
      if (err) {
        throw err;
      }
      accounts = accts;

      let deployer; // this will hold the deployENS contract code and interface
      // Check if compiled contracts are available, if not, recompile and save
      const compiledFile = fs.existsSync('src/test/contracts.json');

      if (!compiledFile) {
        const sources = {};
        sources['interface.sol'] = fs.readFileSync('node_modules/ens/interface.sol').toString();
        sources['ENS.sol'] = fs.readFileSync('node_modules/ens/ENS.sol').toString();
        sources['hashRegistrarSimplified.sol'] = fs.readFileSync('node_modules/ens/hashRegistrarSimplified.sol').toString();
        sources['dotEthRegistrar.sol'] = fs.readFileSync('src/test/dotEthRegistrar.sol').toString();

        const compiled = solc.compile({ sources }, 1);
        deployer = {
          interface: JSON.parse(compiled.contracts.DeployENS.interface),
          bytecode: compiled.contracts.DeployENS.bytecode
        };
        // save the compiled code for next time
        fs.writeFileSync('src/test/contracts.json', JSON.stringify(deployer));
      } else {
        deployer = JSON.parse(fs.readFileSync('src/test/contracts.json').toString());
      }

      const deployensContract = web3.eth.contract(deployer.interface);
      deployensContract.new({
        from: accts[0],
        data: deployer.bytecode,
        gas: 4700000
      }, (deploymentErr, contract) => {
        assert.equal(deploymentErr, null);
        if (contract.address !== undefined) {
          contract.ens.call((contractErr, value) => {
            assert.equal(contractErr, null, contractErr);
            ensRoot = value;
            // The ethereum-ens module has a default address built in, but we can't
            // use that on testnet, so we get the ensRoot value from our deployment contract
            ens = new ENS(web3, ensRoot);
            contract.registrarInfo.call((registrarInfoErr, registrarInfoValue) => {
              assert.equal(registrarInfoErr, null, registrarInfoErr);
              assert.ok(registrarInfoValue !== null);
              registrar = new Registrar(web3, ens);
              done();
            });
          });
        }
      });
    });
  });

  before(() => {
    // Declare various bids for testing in advance
    highBid = registrar.bidFactory(
        'foobarbaz',
        // just a randomly generated ethereum address
        accounts[0],
        web3.toWei(2, 'ether'), // value
        'secret'
    );
    lowBid = registrar.bidFactory(
        'foobarbaz',
        // just a randomly generated ethereum address
        accounts[0],
        web3.toWei(2, 'ether'), // value
        'secret'
    );

    capitalizedBid = registrar.bidFactory(
        'FOObarBAZ',
        // just a randomly generated ethereum address
        accounts[0],
        web3.toWei(2, 'ether'), // value
        'secret'
    );
  });

  describe('#bidFactory()', () => {
    it('Should return the same bid string for the same bid on an identically normalised name', () => {
      assert.equal(highBid.shaBid, capitalizedBid.shaBid);
    });
  });

  describe('#openAuction()', () => {
    it('Should return an error when the name is too short', (done) => {
      registrar.openAuction('foo', { from: accounts[0] }, (err, txid) => {
        assert.equal(err, Registrar.TooShort);
        assert.equal(txid, null);
        done();
      });
    });

    it('Should return an error when the name contains special characters', (done) => {
      registrar.openAuction('foo{}øøôôóOOOo', { from: accounts[0] }, (err, txid) => {
        assert.equal(err, ENS.InvalidName);
        // assert.equal(err, Registrar.SpecialCharacters);
        assert.equal(txid, null);
        done();
      });
    });


    it('Should set an `Open` node to status `Auction`', (done) => {
      registrar.openAuction('foobarbaz', { from: accounts[0], gas: 4700000 }, (err, txid) => {
        assert.equal(err, null);
        assert.equal(typeof txid, 'string');

        // TODO: also test to ensure that randomly generated decoy names are open
        const hash = registrar.sha3('foobarbaz');
        registrar.contract.entries.call(hash, (entryErr, entryResult) => {
          assert.equal(entryErr, null);
          const status = entryResult[0].toString();
          assert.equal(status, 1);
          done();
        });
      });
    });

    it('Should return an error if given a nameprepped-name with any status other than `Open`', (done) => {
      registrar.openAuction('foobarbaz', { from: accounts[0], gas: 4700000 }, (err, result) => {
        assert.ok(err.toString().indexOf('invalid JUMP') !== -1, err);
        assert.equal(result, null);
        done();
      });
    });
  });

  describe('#getEntry()', () => {
    it('Should return the correct properties of a name', (done) => {
      // a name being auctioned
      assert.equal(registrar.getEntry('foobarbaz').status, 1);
      // a name NOT being auctioned
      assert.equal(registrar.getEntry('thisnameisopen').status, 0);
      // test async too
      registrar.getEntry('foobarbaz', (err, result) => {
        assert.equal(result.name, 'foobarbaz');
        assert.equal(result.status, 1);
        assert.equal(result.deed.address, '0x0000000000000000000000000000000000000000');
        assert.ok(result.registrationDate - new Date(), result.registrationDate);
        assert.equal(result.value, 0);
        assert.equal(result.highestBid, 0);
      });
      registrar.getEntry('thisnameisopen', (err, result) => {
        assert.equal(result.name, 'thisnameisopen');
        assert.equal(result.status, 0);
        assert.equal(result.deed.address, '0x0000000000000000000000000000000000000000');
        assert.equal(result.registrationDate, 0);
        assert.equal(result.value, 0);
        assert.equal(result.highestBid, 0);
        done();
      });
    });
    it('Nameprep should ensure the same entry is returned regardless of capitalization', () => {
      assert.equal(registrar.getEntry('foobarbaz').hash, registrar.getEntry('FOOBarbaz').hash);
    });
  });

  describe('#submitBid()', () => {
    it('Should throw an error if a deposit amount is not equal or greater than the value', (done) => {
      registrar.submitBid(highBid,
        { from: accounts[0], value: web3.toWei(1, 'ether'), gas: 4700000 },
        (submitBidErr, submitBidResult) => {
          assert.equal(submitBidErr, Registrar.NoDeposit);
          assert.equal(submitBidResult, null);
          done();
        });
    });

    it('Should create a new sealedBid Deed holding the value of deposit', (done) => {
      registrar.submitBid(highBid,
        { from: accounts[0], value: web3.toWei(3, 'ether'), gas: 4700000 },
        (submitBidErr, submitBidResult) => {
          assert.equal(submitBidErr, null);
          assert.ok(submitBidResult != null);
          registrar.contract.sealedBids.call(
            highBid.shaBid, (sealedBidError, sealedBidResult) => {
              assert.equal(sealedBidError, null);
              assert.ok(sealedBidResult !== '0x0000000000000000000000000000000000000000',
                sealedBidResult);
              assert.equal(web3.eth.getBalance(sealedBidResult), web3.toWei(3, 'ether'));
              done();
            });
        });
    });
  });

  describe('#isBidRevealed()', () => {
    it('Should return the bid as not revealed yet', (done) => {
      // synchronous
      assert.equal(registrar.isBidRevealed(highBid), false);
      // asynchronous
      registrar.isBidRevealed(highBid, (err, isRevealed) => {
        assert.equal(err, null);
        assert.equal(isRevealed, false);
        done();
      });
    });
  });

  describe('#unsealBid()', () => {
    it('Should delete the sealedBid Deed', (done) => {
      web3.currentProvider.sendAsync({
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        // 86400 seconds per day, first auctions end 2 weeks after registrar contract is deployed
        // The reveal period is the last 24 hours of the auction.
        params: [86400 * ((7 * 2) - 1)],
        id: new Date().getTime()
      }, () => {
        registrar.unsealBid(highBid, { from: accounts[1], gas: 4700000 }, (err, result) => {
          assert.equal(err, null);
          assert.ok(result !== null);
          registrar.contract.sealedBids.call(highBid.shaBid, (sealedBidErr, sealedBidResult) => {
            assert.equal(sealedBidErr, null);
            assert.equal(sealedBidResult, '0x0000000000000000000000000000000000000000');
            done();
          });
        });
      });
    });
    it('Should create a new Entry if it is the current highest bid', (done) => {
      registrar.getEntry('foobarbaz', (err, result) => {
        assert.equal(result.name, 'foobarbaz');
        assert.ok(result.deed.address !== '0x0000000000000000000000000000000000000000');
        assert.equal(Number(result.highestBid), highBid.value);
        done();
      });
    });
  });

  describe('#isBidRevealed()', () => {
    it('Should return the bid as revealed', (done) => {
      // synchronous
      assert.equal(registrar.isBidRevealed(highBid), true);
      // asynchronous
      registrar.isBidRevealed(highBid, (err, isRevealed) => {
        assert.equal(err, null);
        assert.equal(isRevealed, true);
        done();
      });
    });
  });

  describe('#finalizeAuction()', () => {
    it('Should throw an error if called too soon', (done) => {
      registrar.finalizeAuction('foobarbaz', { from: accounts[0], gas: 4700000 },
        (finalizeAuctionErr, finalizeAuctionResult) => {
          assert.ok(finalizeAuctionErr.toString().indexOf('invalid JUMP') !== -1, finalizeAuctionErr);
          assert.equal(finalizeAuctionResult, null);
          done();
        });
    });


    it('Should update the deed to hold the value of the winning bid', (done) => {
      web3.currentProvider.sendAsync({
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        // 86400 seconds per day, first auctions end 4 weeks after registrar contract is deployed
        // In the last test we jumped ahead to the final day of the contract, so one more day
        params: [86400],
        id: new Date().getTime()
      }, () => {
        registrar.finalizeAuction('foobarbaz', { from: accounts[0], gas: 4700000 },
          (finalizeAuctionErr, finalizeAuctionResult) => {
            assert.equal(finalizeAuctionErr, null);
            assert.ok(finalizeAuctionResult != null);
            registrar.getEntry('foobarbaz', (getEntryErr, getEntryResult) => {
              assert.equal(getEntryErr, null);
              assert.equal(getEntryResult.status, 2);
              assert.equal(getEntryResult.mode, 'owned');
              done();
            });
          });
      });
    });
  });

  describe.skip('#invalidateName()', () => {
  });

  describe.skip('#releaseDeed()', () => {
  });

  describe.skip('#cancelBid()', () => {
  });
  describe.skip('#transfer()', () => {
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
