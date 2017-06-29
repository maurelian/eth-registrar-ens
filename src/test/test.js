const Registrar = require('../index.js');
const ENS = require('ethereum-ens');

const assert = require('assert');
const fs = require('fs');
const solc = require('solc'); // eslint-disable-line
const TestRPC = require('ethereumjs-testrpc'); // eslint-disable-line
const Web3 = require('web3');

const web3 = new Web3();

// run TestRPC with higher gas limit. The DeployENS contract is pretty expensive.
web3.setProvider(TestRPC.provider({ gasLimit: '0x5b8d80' }));

let accounts = null;
let ens = null;
let ensRoot = null;
let registrar = null;
let highBid = null;
// TODO: test submitting and revealing low bid
let lowBid = null;   // eslint-disable-line
let shortBid = null;   // eslint-disable-line

let timeDiff = null; // for tracking the cumulative evm_increaseTime amount


describe('Registrar', () => {
  before(function (done) { // eslint-disable-line
    this.timeout(20000);
    // Deploy the ENS registry and registrar
    web3.eth.getAccounts((err, accts) => {
      if (err) {
        throw err;
      }
      accounts = accts;

      const sources = fs.readFileSync('src/test/dotEthRegistrar.sol').toString();
      const output = solc.compile({ sources: { sources } }, 0);
      const compiled = {};
      for (const contract in output.contracts) { // eslint-disable-line
        console.log("Compiling ", contract); // eslint-disable-line
        const contractName = contract.split(':')[1];
        compiled[contractName] = {};
        compiled[contractName].bytecode = output.contracts[contract].bytecode;
        compiled[contractName].interface = JSON.parse(output.contracts[contract].interface);
      }
      const deployer = compiled['DeployENS']; // eslint-disable-line
      const deployensContract = web3.eth.contract(deployer.interface);
      deployensContract.new({
        from: accts[0],
        data: deployer.bytecode,
        gas: 6000000
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
              registrar = new Registrar(web3, ens, 'eth', 7,
                (constructRegistrarErr, constructRegistrarResult) => {
                  assert.equal(constructRegistrarErr, null, constructRegistrarErr);
                  assert.equal(typeof constructRegistrarResult, 'string');
                  done();
                }
              );
            });
          });
        }
      });
    });
  });

  before((done) => {
    // Declare various bids for testing in advance
    registrar.bidFactory(
        'foobarbaz',
        // just a randomly generated ethereum address
        accounts[0],
        web3.toWei(2, 'ether'), // value
        'secret',
        (highBidErr, highBidObject) => {
          assert.equal(highBidErr, null);
          assert.equal(typeof highBidObject, 'object');
          highBid = highBidObject;
          registrar.bidFactory(
            'foobarbaz',
            accounts[0],
            web3.toWei(1, 'ether'), // value
            'secret',
            (lowBidErr, lowBidObject) => {
              assert.equal(lowBidErr, null);
              assert.equal(typeof lowBidObject, 'object');
              lowBid = lowBidObject;
              // we can't use bidFactory for short names because it checks length.
              shortBid = {
                name: 'foo',
                hash: registrar.sha3('foo'),
                value: '1000000000000000000',
                owner: accounts[0],
                secret: 'secret',
                hexSecret: '0x65462b0520ef7d3df61b9992ed3bea0c56ead753be7c8b3614e0ce01e4cac41b',
              };
              registrar.contract.shaBid(shortBid.hash, shortBid.owner, shortBid.value,
                shortBid.hexSecret,
                (shortBidErr, shortBidResult) => {
                  assert.equal(shortBidErr, null);
                  shortBid.shaBid = shortBidResult;
                  done();
                }
              );
            }
          );
        }
    );

    // capitalizedBid = registrar.bidFactory(
    //     'FOObarBAZ',
    //     // just a randomly generated ethereum address
    //     accounts[0],
    //     web3.toWei(2, 'ether'), // value
    //     'secret'
    // );
  });

  let foobarbazAllowedTime = 0;
  describe('#getAllowedTime', () => {
    it('Any given name should be allowed within the next 8 weeks', (done) => {
      registrar.getAllowedTime('foobarbaz', (allowedTimeError, allowedTimeResult) => {
        assert.equal(allowedTimeError, null);
        foobarbazAllowedTime = allowedTimeResult.toNumber();
        const eightWeeksFromNow = (Date.now() / 1000) + (8 * 7 * 86400);
        assert.ok(foobarbazAllowedTime < eightWeeksFromNow);
        done();
      });
    });
  });

  describe('#getEntry()', () => {
    it('Should show foobarbaz as "not-yet-available" initially', (done) => {
      registrar.getEntry('foobarbaz', (entryErr1, entryResult1) => {
        assert.equal(entryErr1, null);
        assert.equal(entryResult1.name, 'foobarbaz');
        assert.equal(entryResult1.status, 5);
        assert.equal(entryResult1.mode, 'not-yet-available');
        done();
      });
    });

    it('Should show foobarbaz as "open" after time has passed.', (done) => {
        // Jump ahead 8 weeks, so that all names should be available.
      web3.currentProvider.sendAsync({
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [8 * 7 * 86400],  // 86400 seconds in a day
        id: Date.now()
      }, () => {
        timeDiff += 8 * 7 * 86400;
        web3.currentProvider.sendAsync({
          jsonrpc: '2.0',
          method: 'evm_mine',
          id: Date.now()
        }, () => {
          web3.eth.getBlock('latest', false,
            (getBlockErr, getBlockResult) => {
              assert.ok(getBlockResult.timestamp > foobarbazAllowedTime);
              registrar.getEntry('foobarbaz', (entryErr1, entryResult1) => {
                assert.equal(entryErr1, null);
                assert.equal(entryResult1.name, 'foobarbaz');
                assert.equal(entryResult1.status, 0);
                assert.equal(entryResult1.mode, 'open');
                done();
              });
            });
        });
      });
    });
  });


  describe('#bidFactory()', () => {
    it('should produce valid hashes', () => {
      assert.ok(typeof highBid.shaBid, 'string');
      assert.ok(highBid.shaBid.indexOf('0x') !== -1, highBid.shaBid);
    });
  });

  describe('#openAuction()', () => {
    it('Should return an error when the name is too short', (done) => {
      registrar.openAuction('foo', [], { from: accounts[0], gas: 4700000 }, (err, txid) => {
        assert.equal(err, Registrar.TooShort);
        assert.equal(txid, null);
        done();
      });
    });

    it('Should return an error when the name contains special characters', (done) => {
      registrar.openAuction('fooøø*/.ôôóOOOo', [], { from: accounts[0], gas: 4700000 }, (err, txid) => {
        assert.ok(err.toString().indexOf('Illegal char') !== -1, err);
        assert.equal(txid, null);
        done();
      });
    });


    it('Should set an `Open` node to status `Auction`', (done) => {
      registrar.openAuction('foobarbaz', [], { from: accounts[0], gas: 4700000 }, (err, txid) => {
        assert.equal(err, null);
        assert.equal(typeof txid, 'string');

        // TODO: also test to ensure that randomly generated decoy names are open
        const hash = registrar.sha3('foobarbaz');
        registrar.contract.entries.call(hash, (entryErr, entryResult) => {
          assert.equal(entryErr, null);
          const status = entryResult[0].toNumber();
          assert.equal(status, 1);
          done();
        });
      });
    });
  });

  describe('#getEntry()', () => {
    it('Should return the correct properties of a name', (done) => {
      // a name being auctioned
      registrar.getEntry('foobarbaz', (entryErr1, entryResult1) => {
        assert.equal(entryErr1, null);
        assert.equal(entryResult1.name, 'foobarbaz');
        assert.equal(entryResult1.status, 1);
        assert.equal(entryResult1.deed.address, '0x0000000000000000000000000000000000000000');
        assert.ok((entryResult1.registrationDate * 1000) - new Date() > 0,
          entryResult1.registrationDate);
        assert.equal(entryResult1.value, 0);
        assert.equal(entryResult1.highestBid, 0);
        // a name NOT being auctioned
        registrar.getEntry('thisnameisopen', (entryErr2, entryResult2) => {
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

    it('Normalisation should ensure the same entry is returned regardless of capitalization', (done) => {
      registrar.getEntry('foobarbaz', (entryErr1, entryResult1) => {
        assert.equal(entryErr1, null);
        registrar.getEntry('FOOBarbaz', (entryErr2, entryResult2) => {
          assert.equal(entryErr2, null);
          assert.equal(entryResult1.name, entryResult2.name);
          assert.equal(entryResult1.hash, entryResult2.hash);
          done();
        });
      });
    });
  });

  describe('#submitBid()', () => {
    it('Should throw an error if a deposit amount is not equal or greater than the value', (done) => {
      registrar.submitBid(
        highBid, [],
        { from: accounts[0], value: web3.toWei(1, 'ether'), gas: 4700000 },
        (submitBidErr, submitBidResult) => {
          assert.equal(submitBidErr, Registrar.NoDeposit);
          assert.equal(submitBidResult, null);
          done();
        });
    });

    it('Should create a new sealedBid Deed holding the value of deposit', (done) => {
      registrar.submitBid(highBid, [],
        { from: accounts[0], value: web3.toWei(3, 'ether'), gas: 4700000 },
        (submitBidErr, submitBidResult) => {
          assert.equal(submitBidErr, null);
          assert.ok(submitBidResult != null);
          registrar.contract.sealedBids.call(accounts[0], highBid.shaBid,
            (sealedBidError, sealedBidResult) => {
              assert.equal(sealedBidError, null);
              assert.ok(
                sealedBidResult !== '0x0000000000000000000000000000000000000000',
                sealedBidResult
              );
              web3.eth.getBalance(
                sealedBidResult,
                (sealedBidBalanceErr, sealedBidBalanceResult) => {
                  assert.equal(sealedBidBalanceErr, null);
                  assert.equal(sealedBidBalanceResult, web3.toWei(3, 'ether'));
                  done();
                }
              );
            });
        });
    });
  });

  describe('#isBidRevealed()', () => {
    it('Should return the bid as not revealed yet', (done) => {
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
        // 86400 seconds per day, the auction period end after 3 days.
        // The reveal period is the last 24 hours of the auction.
        params: [86400 * 3],
        id: new Date().getTime()
      }, () => {
        timeDiff += 86400 * 3;
        registrar.unsealBid(highBid, { from: accounts[0], gas: 4700000 }, (err, result) => {
          assert.equal(err, null);
          assert.ok(result !== null);
          registrar.contract.sealedBids.call(accounts[0], highBid.shaBid,
            (sealedBidErr, sealedBidResult) => {
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
        const now = new Date();
        assert.ok(+now + (timeDiff * 1000) > (result.deed.creationDate * 1000));
        assert.equal(Number(result.highestBid), highBid.value);
        done();
      });
    });
  });

  describe('#isBidRevealed()', () => {
    it('Should return the bid as revealed', (done) => {
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
          assert.ok(finalizeAuctionErr.toString().indexOf('invalid opcode') !== -1, finalizeAuctionErr);
          assert.equal(finalizeAuctionResult, null);
          done();
        });
    });


    it('Should update the deed to hold the value of the winning bid', (done) => {
      web3.currentProvider.sendAsync({
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        // 86400 seconds per day, first auctions end 4 weeks after registrar contract is deployed
        params: [86400 * 7 * 4],
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

  describe('#transfer()', () => {
    it('Should throw an error if the sender is not the owner', (done) => {
      registrar.transfer('foobarbaz', accounts[9], { from: accounts[8], gas: 4700000 },
        (transferNameErr, transferNameResult) => {
          assert.ok(transferNameErr.toString().indexOf('Only the owner' !== -1));
          assert.equal(transferNameResult, null);
          done();
        }
      );
    });

    it('Should update the owner of the deed after a successful transfer', (done) => {
      registrar.transfer('foobarbaz', accounts[9], { from: accounts[0], gas: 4700000 },
        (transferNameErr, transferNameResult) => {
          assert.equal(transferNameErr, null);
          assert.ok(typeof transferNameResult === 'string');
          registrar.getEntry('foobarbaz', (getEntryErr, getEntryResult) => {
            assert.equal(getEntryErr, null);
            assert.equal(getEntryResult.deed.owner, accounts[9]);
            done();
          });
        }
      );
    });
  });

  describe.skip('#releaseDeed()', () => {
    it('Should do something specific', (done) => {
      done();
    });
  });

  describe.skip('#cancelBid()', () => {
    it('Should do something specific', (done) => {
      done();
    });
  });

  describe('#invalidateName()', () => {
    it('Should invalidate a name', (done) => {
      const hash = registrar.sha3('foo');
      registrar.contract.startAuctionsAndBid([hash], shortBid.shaBid,
        { from: accounts[0], gas: 4700000, value: web3.toWei(1, 'ether') },
        (startAndBidErr, startAndBidResult) => {
          assert.equal(startAndBidErr, null);
          assert.ok(startAndBidResult != null);
          // fast forward to reveal period
          web3.currentProvider.sendAsync({
            jsonrpc: '2.0',
            method: 'evm_increaseTime',
            params: [3 * 86400],  // 86400 seconds in a day
            id: Date.now()
          }, () => {
            timeDiff += 3 * 86400;
            // unseal the bid
            registrar.unsealBid(shortBid, { from: accounts[0], gas: 4700000 },
              (unsealErr, unsealResult) => {
                assert.equal(unsealErr, null);
                assert.ok(unsealResult != null);
                // fast forward to registration date
                web3.currentProvider.sendAsync({
                  jsonrpc: '2.0',
                  method: 'evm_increaseTime',
                  params: [2 * 86400],  // 86400 seconds in a day
                  id: Date.now()
                }, () => {
                  timeDiff += 8 * 7 * 86400;
                  registrar.finalizeAuction('foo', { from: accounts[0], gas: 4700000 }, (finalizeErr, finalizeResult) => {
                    assert.equal(finalizeErr, null);
                    assert.ok(finalizeResult != null);
                    registrar.getEntry('foo', (entryErr1, entryResult1) => {
                      assert.equal(entryErr1, null);
                      assert.equal(entryResult1.name, 'foo');
                      assert.ok(entryResult1.deed.owner.slice(0, 2) === '0x');
                      // the `forbidden-can-invalidate` mode does not exist in the registrar
                      // but is useful in this context where we know the plain text name
                      assert.equal(entryResult1.mode, 'forbidden-can-invalidate');
                      assert.equal(entryResult1.status, 2);
                      registrar.invalidateName('foo', { from: accounts[1], gas: 4700000 }, (invalidateErr, invalidateResult) => {
                        assert.equal(invalidateErr, null);
                        assert.ok(invalidateResult != null);
                        registrar.getEntry('foo', (entryErr2, entryResult2) => {
                          assert.equal(entryErr2, null);
                          assert.equal(entryResult2.name, 'foo');
                          assert.equal(entryResult2.mode, 'forbidden');
                          done();
                        });
                      });
                    });
                  });
                });
              }
            );
          });
        });
    });
  });
});
