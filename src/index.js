const interfaces = require('./interfaces.js');
const ENS = require('ethereum-ens');

const namehash = ENS.prototype.namehash;
const normalise = ENS.prototype.normalise;

/**
 * Constructs a new Registrar instance, providing an easy-to-use interface
 * to the [Auction Registrar][docs], which governs the `.eth` namespace.
 *
 * @example
 * var registrar = new Registrar(web3, ens, 'eth', 7,
 *   function (err, txid) {
 *     console.log(txid);
 *   }
 * );
 *
 * @author Maurelian
 * @date 2016
 * @license LGPL
 *
 * @param {object} web3 A web3 instance to use to communicate with the blockchain.
 * @param {address} address The address of the registrar.
 * @param {integer} minLength The minimum length of a name require by the registrar.
 * @param {string} tld The top level domain
 * @param {string} ens The address of the ENS instance
 *
 * @returns {string} The registrar address
 */
function Registrar(web3, ens = new ENS(web3), tld = 'eth', minLength = 7, callback) {
  this.web3 = web3;

  // prior to version 0.16, web3.sha3 didn't prepend '0x', to support both options
  // here we attach a sha3 method to the registrar object, and ensure that it
  // always prepends '0x'
  this.sha3 = function sha3withZeroX(...args) {
    const result = web3.sha3.apply(this, args);
    if (result[1] !== 'x') {
      return `0x${result}`;
    }
    return result;
  };

  this.ens = ens;
  this.tld = tld;
  this.minLength = minLength;
  this.rootNode = namehash(this.tld);

  const thisRegistrar = this;

  ens.owner(this.tld, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      this.address = result;
      this.contract = this.web3.eth.contract(interfaces.registrarInterface).at(result);
      this.contract.registryStarted((startingErr, startingDate) => {
        thisRegistrar.registryStarted = startingDate;
        callback(null, result);
      });
    }
  });
}

Registrar.TooShort = Error('Name is too short');

Registrar.prototype.checkLength = function checkLength(name) {
  if (name.length < this.minLength) {
    throw Registrar.TooShort;
  }
};

/**
 * **Get the "mode" of a name**
 *
 * For the registrar contract deployed to Ropsten a given name can be in
 * one of 4 modes: Open, Auction, Owned, Forbidden
 *
 * The mainnet registrar as currently designed can be in one of 5 modes:
 * Open, Auction, Reveal, Owned, Forbidden.
 *
 * @example
 * var name = 'foobarbaz';
 * registrar.openAuction(name, { from: accounts[0], gas: 4700000 },
 *   function (err, result) {
 *     console.log(result);
 *   }
 * );
 *
 * @param {string} name The name to start an auction on
 * @param {object} params An optional transaction object to pass to web3.
 * @param {function} callback An optional callback; if specified, the
 *        function executes asynchronously.
 *
 * @returns {string} The transaction ID if callback is not supplied.
 */
Registrar.prototype.getMode = function getMode(name, status, registrationDate, deed) {
  // Check the auction mode
  let mode = '';

  if (name.length < this.minLength) {
    if (deed === '0x0000000000000000000000000000000000000000') {
      // name is too short
      mode = 'forbidden';
    } else {
      // can be invalidated
      mode = 'forbidden-can-invalidate';
    }
  } else {
    // If name is of valid length
    const modeNames = ['open', 'auction', 'owned', 'forbidden', 'reveal', 'not-yet-available'];
    mode = modeNames[status];
  }

  return mode;
};

/**
 * Constructs a new Entry object corresponding to a name.
 *
 * @ignore
 *
 * @param {string} name The unhashed name
 * @param {string} hash
 * @param {number} status
 * @param {address} deed
 * @param {number} registrationDate
 * @param {number} value
 * @param {number} highestBid
 */
function Entry(name, hash, status, mode, deed, registrationDate, value, highestBid) {
  // TODO: improve Entry constructor so that unknown names can be handled via getEntry
  this.name = name;
  this.hash = hash;
  this.status = status;
  this.mode = mode;
  this.deed = deed;
  this.registrationDate = registrationDate;
  this.value = value;
  this.highestBid = highestBid;
}

/**
 * @ignore
 * Construct a deed object.
 */
function Deed(address, balance, creationDate, owner) {
  this.address = address;
  this.balance = balance;
  this.creationDate = creationDate;
  this.owner = owner;
}

/**
 * **Get the properties of a Deed at a given address.**
 *
 * This method is used in the getEntry method, but also available on its own.
 *
 * @memberOf Registrar
 *
 * @param {string} address The address of the deed
 * @return {object} A deed object
 */
Registrar.prototype.getDeed = function getDeed(address, callback) {
  const deedContract = this.web3.eth.contract(interfaces.deedInterface).at(address);
  this.web3.eth.getBalance(address, (err, balance) => {
    deedContract.creationDate((creationDateErr, creationDateResult) => {
      deedContract.owner((ownerErr, ownerResult) => {
        const deed = new Deed(
          deedContract.address,
          balance.toNumber(),
          creationDateResult.toNumber(),
          ownerResult
        );
        if (callback) {
          callback(null, deed);
        } else {
          return deed;
        }
      });
    });
  });
};

/**
 * **Get the properties of the entry for a given a name.**
 *
 * @example
 * registrar.getEntry('insurance', function (err, result) {
 *   console.log(result);
 * });
 * // { name: 'insurance',
 * //   hash: '0x73079a5cb4c7d259f40c6d0841629e689d2a95b85883b371e075ffb2f329c3e1',
 * //   status: 2,
 * //   deed:
 * //    { address: '0x268e06911ba1ddc9138b355f9b42711abbc6eaec',
 * //      balance: { s: 1, e: 18, c: [Object] },
 * //      creationDate: { s: 1, e: 9, c: [Object] },
 * //      owner: '0x8394a052eb6c32fb9defcaabc12fcbd8fea0b8a8' },
 * //   registrationDate: 1481108206,
 * //   value: 5000000000000000000,
 * //   highestBid: 11100000000000000000,
 * //   mode: 'owned' }
 *
 * @memberOf Registrar.prototype
 * @param {string} input The name or hash to get the entry for
 * @param {function} callback An optional callback; if specified, the
 *        function executes asynchronously.
 *
 * @returns {object} An Entry object
 */
Registrar.prototype.getEntry = function getEntry(input, callback) {
  // Accept either a name or a hash
  let hash = input;
  // if the input is a hash, we'll use that for the name in the entry object
  let name = input;
  // if the input is a name
  if (input.substring(0, 2) !== '0x') {
    name = normalise(input);
    hash = this.sha3(name);
  }

  const registrarContract = this.contract;

  registrarContract.entries(hash, (entryErr, entry) => {
    const entryObject = new Entry(
      name,
      hash,
      entry[0].toNumber(), // status
      this.getMode(name, entry[0].toNumber(), entry[2].toNumber(), entry[1]), // Mode
      null, // deed
      entry[2].toNumber(), // date
      entry[3].toNumber(), // value
      entry[4].toNumber() // highestBid
    );
    if (entry[1] !== '0x0000000000000000000000000000000000000000') {
      // the entry has a deed address, get the details and add to the entry object
      this.getDeed(entry[1], (err, deed) => {
        if (err) {
          return callback(err);
        }
        entryObject.deed = deed;
        if (callback) {
          callback(null, entryObject);
        } else {
          return entryObject;
        }
      });
    } else {
      // there is no deed address.
      entryObject.deed = new Deed(entry[1], null, null, null);
      if (callback) {
        callback(null, entryObject);
      } else {
        // FIX: this sync call does not seem to be working in the src/ropsten.js repl
        return entryObject;
      }
    }
  });
};


Registrar.prototype.getAllowedTime = function getAllowedTime(input, callback) {
  // Accept either a name or a hash
  let hash = input;
  // if the input is a hash, we'll use that for the name in the entry object
  let name = input;
  // if the input is a name
  if (input.substring(0, 2) !== '0x') {
    name = normalise(input);
    hash = this.sha3(name);
  }

  const registrarContract = this.contract;
  registrarContract.getAllowedTime(hash, (timeErr, timeResult) => {
    if (callback) {
      callback(null, timeResult);
    } else {
      return timeResult;
    }
  });
};

/**
 * Shuffles array in place. ES6 version
 * @param {Array} a items The array containing the items.
 */
function shuffle(a) {
  for (let i = a.length; i; i--) {
    const j = Math.floor(Math.random() * i);
    [a[i - 1], a[j]] = [a[j], a[i - 1]]; // eslint-disable-line
  }
}


/**
 * **Open an auction for the desired name**
 *
 * This method uses the registrar's startAuctions function to opens an auction for the
 * given name, and several other randomly generated hashes, helping to prevent other
 * bidders from guessing which of the hashes you are interested in.
 *
 * @example
 * var name = 'foobarbaz';
 * registrar.openAuction(name, { from: accounts[0], gas: 4700000 },
 *   function (err, result) {
 *     console.log(result);
 * });
 *
 * @param {string} name The name to start an auction on
 * @param {array} randomHashes An array of hashes to obscure the desired hash.
 * @param {object} params An optional transaction object to pass to web3.
 * @param {function} callback An optional callback; if specified, the
 *        function executes asynchronously.
 *
 * @returns {string} The transaction ID if callback is not supplied.
 */
// eslint-disable-next-line max-len
Registrar.prototype.openAuction = function openAuction(name, randomHashes, params = {}, callback = null) {
  if (typeof randomHashes === 'undefined') randomHashes = []; // eslint-disable-line no-param-reassign

  if (callback) {
    try {
      const normalisedName = normalise(name);
      this.checkLength(normalisedName);
      const hash = this.sha3(normalisedName);

      // Insert the hash we want
      randomHashes.push(hash);
      shuffle(randomHashes);

      // this won't be called if either normalise or checkLength throw an error
      this.contract.startAuctions(randomHashes, params, callback);
    } catch (e) {
      callback(e, null);
    }
  } else {
    const normalisedName = normalise(name);
    this.checkLength(name);

    const hash = this.sha3(normalisedName);

    // Insert the hash we want
    randomHashes.push(hash);
    shuffle(randomHashes);
    return this.contract.startAuctions(randomHashes, params);
  }
};

Registrar.NoDeposit = Error('You must specify a deposit amount greater than the value of your bid');

/**
 * **Construct a Bid object.**
 *
 * The properties of the Bid object correspond to the
 * inputs of the registrar contract's 'shaBid' function.
 * When a bid is submitted, these values should be saved so that they can be
 * used to reveal the bid params later.
 * @example
 * myBid = registrar.bidFactory(
 *   'foobarbaz',
 *   web3.eth.accounts[0],
 *   web3.toWei(2, 'ether'),
 *   'secret'
 * );
 *
 * @param {string} name The name to be bid on
 * @param {string} owner An owner address
 * @param {number} value The value of your bid in wei
 * @param {secret} secret An optional random value
 * @returns {object} A bid object containing the parameters of the bid
 * required to unseal the bid.
 */
Registrar.prototype.bidFactory = function bidFactory(name, owner, value, secret, callback) {
  this.checkLength(name);
  const sha3 = this.sha3;
  const normalisedName = normalise(name);
  const bidObject = {
    name: normalisedName,
    // TODO: consider renaming any hashes to  `this.node`
    hash: sha3(normalisedName),
    value,
    owner,
    secret,
    hexSecret: sha3(secret)
  };
  if (callback) {
    this.contract.shaBid(sha3(normalisedName), owner, value, sha3(secret),
      (err, result) => {
        if (err) {
          callback(err, null);
        } else {
          bidObject.shaBid = result;
          callback(err, bidObject);
        }
      }
    );
  } else {
    bidObject.shaBid = this.contract.shaBid(sha3(normalisedName), owner, value, sha3(secret));
    return bidObject;
  }
};

/**
 * **Submit a sealed bid and deposit.**
 *
 * Uses the registrar's newBid function to submit a bid given an object created
 * by the 'bidFactory'.
 *
 * @example
 * myBid = registrar.bidFactory(
 *   'foobarbaz',
 *   web3.eth.accounts[0],
 *   web3.toWei(2, 'ether'),
 *   'secret'
 * );
 *
 * registrar.submitBid(highBid,
 *      { from: accounts[0], value: web3.toWei(1, 'ether'), gas: 4700000 },
 *      function (err, result) { console.log(result)}
 * );
 *
 * @param {object} bid A Bid object.
 * @param {array} randomHashes An array of hashes to obscure the desired hash.
 * @param {object} params An optional transaction object to pass to web3. The
 * value sent must be at least as much as the bid value.
 * @param {function} callback An optional callback; if specified, the
 *        function executes asynchronously.
 * @return The transaction ID if callback is not supplied.
 */
// eslint-disable-next-line max-len
Registrar.prototype.submitBid = function submitBid(bid, randomHashes, params = {}, callback = null) {
  if (typeof randomHashes === 'undefined') {
    randomHashes = []; // eslint-disable-line no-param-reassign
  }
  shuffle(randomHashes);

  if (callback) {
    if (params.value < bid.value) {
      callback(Registrar.NoDeposit, null);
    } else {
      this.contract.startAuctionsAndBid(randomHashes, bid.shaBid, params, callback);
    }
  } else {
    if (params.value < bid.value) {
      throw Registrar.NoDeposit;
    }
    return this.contract.startAuctionsAndBid(randomHashes, bid.shaBid, params);
  }
};

/**
 * **Unseal your bid during the reveal period**
 *
 * During the reveal period of the auction, you must submit the parameters of a bid
 * The registrar contract will generate the bid string, and associate the bid
 * parameters with the previously submitted bid string and deposit. If you have not
 * already submitted a bid string, the registrar will throw. If your bid is
 * revealed as the current highest; the difference between your deposit and bid
 * value will be returned to you, and the previous highest bidder will have their
 * funds returned. If you are not the highest bidder, all your funds will be returned.
 * Returns are sent to the owner address listed on the bid.
 *
 *
 * @example
 * registrar.unsealBid(myBid, { from: accounts[1], gas: 4700000 }, function (err, result) {
 *   console.log(result);
 * })
 *
 * @param {string} bid A bid object
 * @param {object} params An optional transaction object to pass to web3.
 * @param {function} callback An optional callback; if specified, the
 *        function executes asynchronously.
 *
 * @returns {string} The transaction ID if callback is not supplied.
 */
Registrar.prototype.unsealBid = function unsealBid(bid, params = {}, callback = null) {
  if (callback) {
    this.contract.unsealBid(bid.hash, bid.value, bid.hexSecret, params, callback);
  } else {
    return this.contract.unsealBid(bid.hash, bid.value, bid.hexSecret, params);
  }
};

/**
 * **Verify that your bid has been successfully revealed**
 *
 * Returns a boolean indicating if a bid object, as generated by bidFactory,
 * is revealed or not.
 * // TODO: Make this example async
 *
 * @example
 * registrar.isBidRevealed(myBid);
 *
 * @param {string} bid A bid object
 * @param {function} callback An optional callback; if specified, the
 *        function executes asynchronously.
 *
 * @returns {boolean} Whether or not the bid was revealed.
 */
Registrar.prototype.isBidRevealed = function isBidRevealed(bid, callback) {
  if (callback) {
    this.contract.sealedBids.call(bid.owner, bid.shaBid, (err, result) => {
      if (err) {
        return callback(err);
      }
      // sealedBid's deed should be deleted
      callback(null, result === '0x0000000000000000000000000000000000000000');
    });
  } else {
    return this.contract.sealedBids.call(bid.owner, bid.shaBid) === '0x0000000000000000000000000000000000000000';
  }
};

/**
 * **Finalize the auction**
 *
 * After the registration date has passed, this method calls the registrar's
 * finalizeAuction function to set the winner as the owner of the corresponding
 * ENS subnode.
 *
 * @example
 * registrar.finalizeAuction('foobarbaz', { from: accounts[1], gas: 4700000 },
 *   function (err, result) {
 *     console.log(result);
 * })
 *
 * @param {string} name
 * @param {object} params An optional transaction object to pass to web3.
 * @param {function} callback An optional callback; if specified, the
 *        function executes asynchronously.
 *
 * @returns {string} The transaction ID if callback is not supplied.
 */
Registrar.prototype.finalizeAuction = function finalizeAuction(name, params = {}, callback = null) {
  const normalisedName = normalise(name);
  const hash = this.sha3(normalisedName);

  if (callback) {
    this.contract.finalizeAuction(hash, params, callback);
  } else {
    return this.contract.finalizeAuction(hash, params);
  }
};

/**
 * The owner of a domain may transfer it, and the associated deed,
 * to someone else at any time.
 *
 * @example
 * registrar.transfer('foobarbaz', accounts[2] { from: accounts[1], gas: 4700000 },
 *   function (err, result) {
 *     console.log(result);
 * })
 *
 * @param {string} name The name to transfer
 * @param {string} newOwner The address to transfer ownership to.
 * @param {object} options An optional transaction object to pass to web3.
 * @param {function} callback An optional callback; if specified, the
 *        function executes asynchronously.
 *
 * @returns {string} The transaction ID if callback is not supplied.
 */
Registrar.prototype.transfer = function transfer(name, newOwner, params = {}, callback = null) {
  const normalisedName = normalise(name);
  const hash = this.sha3(normalisedName);
  // check that the transaction sender owns the name
  let isOwner = false;
  const notOwnerErr = new Error('Only the owner of a name can transfer it.');

  const registrarContract = this.contract;
  const deed = this.web3.eth.contract(interfaces.deedInterface);

  registrarContract.entries(hash, (entryErr, entryResult) => {
    const deedContract = deed.at(entryResult[1]);
    deedContract.owner((ownerErr, ownerResult) => {
      if (ownerResult === params.from) {
        isOwner = true;
      }
      if (callback) {
        if (ownerErr) {
          callback(ownerErr);
        } else if (!isOwner) {
          callback(notOwnerErr);
        } else {
          this.contract.transfer(hash, newOwner, params, callback);
        }
      } else if (ownerErr) {
        return ownerErr;
      } else if (!isOwner) {
        return notOwnerErr;
      } else {
        return this.contract.transfer(hash, newOwner, params);
      }
    });
  });
};

/**
 * __Not yet implemented__
 * After one year, the owner can release the property and get their ether back
 *
 * @param {string} name The name to release
 * @param {object} options An optional transaction object to pass to web3.
 * @param {function} callback An optional callback; if specified, the
 *        function executes asynchronously.
 *
 * @returns {string} The transaction ID if callback is not supplied.
 */
Registrar.prototype.releaseDeed = function releaseDeed() {};

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
 * @returns {string} The transaction ID if callback is not supplied.
 */
Registrar.prototype.invalidateName = function invalidateName(name, params = {}, callback = null) {
  if (name.length >= this.minLength) {
    throw Error('The name is long enough, not invalid.');
  }
  if (callback) {
    this.contract.invalidateName(name, params, callback);
  } else {
    return this.contract.invalidateName(name, params);
  }
};

/**
 * Transfers the deed to the current registrar, if different from this one.
 * Used during the upgrade process to a permanent registrar.
 *
 * @param name The name to transfer.
 * @param {object} options An optional transaction object to pass to web3.
 * @param {function} callback An optional callback; if specified, the
 *        function executes asynchronously.
 *
 * @returns {string} The transaction ID if callback is not supplied.
 */
Registrar.prototype.transferRegistrars = function transferRegistrars() {};

module.exports = Registrar;
