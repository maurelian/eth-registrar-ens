# .ETH Registrar ENS

The ENS is a decentralized name service hosted on the Ethereum blockchain, providing censorship and DOS resistant registration of human readable names.  

This package is intended to simplify interaction, and dapp development, with the [Ethereum Name Service's](http://ens.domains/) (ENS) initial auction registrar.

## Install

`npm install eth-registrar-ens`

#### Example usage:

    var Registrar = require('eth-registrar-ens');
    var Web3 = require('web3');
    var ENS = require('ethereum-ens');

    var web3 = new Web3();
    web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'));

    var ens = new ENS(web3)

    var registrar = new Registrar(web3, ens, 'eth', 7,
      function (err, txid) {
        console.log(txid);
      }
    );

All methods in this module which use [`web3`](https://github.com/ethereum/web3.js) to communicate with an ethereum node support the same optionally-asynchronous pattern as `web3`. When a callback is provided, the function returns nothing, but instead calls the callback with (err, result) when the operation completes. 

Synchronous calls are useful for talking to a contract in the REPL, but **dapp developers should use only asynchronous calls in order to support light clients like Metamask**.

Functions that create transactions also accept an optional `options`  object.
This object has the same parameters as `web3`'s [transaction object](https://github.com/ethereum/wiki/wiki/JavaScript-API#web3ethsendtransaction).

[docs]: http://docs.ens.domains/en/latest/auctions.html

[eip162]: https://github.com/ethereum/EIPs/issues/162

[mediumpost]: https://medium.com/@_maurelian/explaining-the-ethereum-namespace-auction-241bec6ef751#.tyzb7qlfv

<!-- To update docs below this point, run `$ documentation readme -f md -s "Overview"` from the root directory. -->

# Overview

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

## Registrar

Constructs a new Registrar instance, providing an easy-to-use interface
to the [Auction Registrar][docs], which governs the `.eth` namespace.

**Parameters**

-   `web3` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** A web3 instance to use to communicate with the blockchain.
-   `address` **address** The address of the registrar.
-   `minLength` **integer?= 7** The minimum length of a name require by the registrar.
-   `tld` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)?= 'eth'** The top level domain
-   `ens` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)?= new ENS(web3)** The address of the ENS instance
-   `callback`  

**Examples**

```javascript
var registrar = new Registrar(web3, ens, 'eth', 7,
  function (err, txid) {
    console.log(txid);
  }
);
```

Returns **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** The registrar address

**Meta**

-   **author**: Maurelian
-   **license**: LGPL

### getMode

**Get the "mode" of a name**

For the registrar contract deployed to Ropsten a given name can be in
one of 4 modes: Open, Auction, Owned, Forbidden

The mainnet registrar as currently designed can be in one of 5 modes:
Open, Auction, Reveal, Owned, Forbidden.

**Parameters**

-   `name` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** The name to start an auction on
-   `params` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** An optional transaction object to pass to web3.
-   `callback` **[function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)** An optional callback; if specified, the
           function executes asynchronously.
-   `status`  
-   `registrationDate`  
-   `deed`  

**Examples**

```javascript
var name = 'foobarbaz';
registrar.openAuction(name, { from: accounts[0], gas: 4700000 },
  function (err, result) {
    console.log(result);
  }
);
```

Returns **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** The transaction ID if callback is not supplied.

### getDeed

**Get the properties of a Deed at a given address.**

This method is used in the getEntry method, but also available on its own.

**Parameters**

-   `address` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** The address of the deed
-   `callback`  

Returns **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** A deed object

### getEntry

**Get the properties of the entry for a given a name.**

**Parameters**

-   `input` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** The name or hash to get the entry for
-   `callback` **[function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)** An optional callback; if specified, the
           function executes asynchronously.

**Examples**

```javascript
registrar.getEntry('insurance', function (err, result) {
  console.log(result);
});
// { name: 'insurance',
//   hash: '0x73079a5cb4c7d259f40c6d0841629e689d2a95b85883b371e075ffb2f329c3e1',
//   status: 2,
//   deed:
//    { address: '0x268e06911ba1ddc9138b355f9b42711abbc6eaec',
//      balance: { s: 1, e: 18, c: [Object] },
//      creationDate: { s: 1, e: 9, c: [Object] },
//      owner: '0x8394a052eb6c32fb9defcaabc12fcbd8fea0b8a8' },
//   registrationDate: 1481108206,
//   value: 5000000000000000000,
//   highestBid: 11100000000000000000,
//   mode: 'owned' }
```

Returns **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** An Entry object

### openAuction

**Open an auction for the desired name**

This method uses the registrar's startAuctions function to opens an auction for the
given name, and several other randomly generated hashes, helping to prevent other
bidders from guessing which of the hashes you are interested in.

**Parameters**

-   `name` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** The name to start an auction on
-   `randomHashes` **[array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)** An array of hashes to obscure the desired hash.
-   `params` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)?= {}** An optional transaction object to pass to web3.
-   `callback` **[function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)?= null** An optional callback; if specified, the
           function executes asynchronously.

**Examples**

```javascript
var name = 'foobarbaz';
registrar.openAuction(name, { from: accounts[0], gas: 4700000 },
  function (err, result) {
    console.log(result);
});
```

Returns **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** The transaction ID if callback is not supplied.

### bidFactory

**Construct a Bid object.**

The properties of the Bid object correspond to the
inputs of the registrar contract's 'shaBid' function.
When a bid is submitted, these values should be saved so that they can be
used to reveal the bid params later.

**Parameters**

-   `name` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** The name to be bid on
-   `owner` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** An owner address
-   `value` **[number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)** The value of your bid in wei
-   `secret` **secret** An optional random value
-   `callback`  

**Examples**

```javascript
myBid = registrar.bidFactory(
  'foobarbaz',
  web3.eth.accounts[0],
  web3.toWei(2, 'ether'),
  'secret'
);
```

Returns **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** A bid object containing the parameters of the bid
required to unseal the bid.

### submitBid

**Submit a sealed bid and deposit.**

Uses the registrar's newBid function to submit a bid given an object created
by the 'bidFactory'.

**Parameters**

-   `bid` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** A Bid object.
-   `randomHashes` **[array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)** An array of hashes to obscure the desired hash.
-   `params` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)?= {}** An optional transaction object to pass to web3. The
    value sent must be at least as much as the bid value.
-   `callback` **[function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)?= null** An optional callback; if specified, the
           function executes asynchronously.

**Examples**

```javascript
myBid = registrar.bidFactory(
  'foobarbaz',
  web3.eth.accounts[0],
  web3.toWei(2, 'ether'),
  'secret'
);

registrar.submitBid(highBid,
     { from: accounts[0], value: web3.toWei(1, 'ether'), gas: 4700000 },
     function (err, result) { console.log(result)}
);
```

Returns **any** The transaction ID if callback is not supplied.

### unsealBid

**Unseal your bid during the reveal period**

During the reveal period of the auction, you must submit the parameters of a bid
The registrar contract will generate the bid string, and associate the bid
parameters with the previously submitted bid string and deposit. If you have not
already submitted a bid string, the registrar will throw. If your bid is
revealed as the current highest; the difference between your deposit and bid
value will be returned to you, and the previous highest bidder will have their
funds returned. If you are not the highest bidder, all your funds will be returned.
Returns are sent to the owner address listed on the bid.

**Parameters**

-   `bid` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** A bid object
-   `params` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)?= {}** An optional transaction object to pass to web3.
-   `callback` **[function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)?= null** An optional callback; if specified, the
           function executes asynchronously.

**Examples**

```javascript
registrar.unsealBid(myBid, { from: accounts[1], gas: 4700000 }, function (err, result) {
  console.log(result);
})
```

Returns **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** The transaction ID if callback is not supplied.

### isBidRevealed

**Verify that your bid has been successfully revealed**

Returns a boolean indicating if a bid object, as generated by bidFactory,
is revealed or not.
// TODO: Make this example async

**Parameters**

-   `bid` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** A bid object
-   `callback` **[function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)** An optional callback; if specified, the
           function executes asynchronously.

**Examples**

```javascript
registrar.isBidRevealed(myBid);
```

Returns **[boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean)** Whether or not the bid was revealed.

### finalizeAuction

**Finalize the auction**

After the registration date has passed, this method calls the registrar's
finalizeAuction function to set the winner as the owner of the corresponding
ENS subnode.

**Parameters**

-   `name` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** 
-   `params` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)?= {}** An optional transaction object to pass to web3.
-   `callback` **[function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)?= null** An optional callback; if specified, the
           function executes asynchronously.

**Examples**

```javascript
registrar.finalizeAuction('foobarbaz', { from: accounts[1], gas: 4700000 },
  function (err, result) {
    console.log(result);
})
```

Returns **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** The transaction ID if callback is not supplied.

### transfer

The owner of a domain may transfer it, and the associated deed,
to someone else at any time.

**Parameters**

-   `name` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** The name to transfer
-   `newOwner` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** The address to transfer ownership to.
-   `options` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** An optional transaction object to pass to web3.
-   `callback` **[function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)?= null** An optional callback; if specified, the
           function executes asynchronously.
-   `params`   (optional, default `{}`)

**Examples**

```javascript
registrar.transfer('foobarbaz', accounts[2] { from: accounts[1], gas: 4700000 },
  function (err, result) {
    console.log(result);
})
```

Returns **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** The transaction ID if callback is not supplied.

### releaseDeed

**Not yet implemented**
After one year, the owner can release the property and get their ether back

**Parameters**

-   `name` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** The name to release
-   `options` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** An optional transaction object to pass to web3.
-   `callback` **[function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)** An optional callback; if specified, the
           function executes asynchronously.

Returns **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** The transaction ID if callback is not supplied.

### invalidateName

**Not yet implemented**
Submit a name 6 characters long or less. If it has been registered,
the submitter will earn a portion of the deed value, and the name will be updated

**Parameters**

-   `name` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** An invalid name to search for in the registry.
-   `options` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** An optional transaction object to pass to web3.
-   `callback` **[function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)** An optional callback; if specified, the
           function executes asynchronously.

Returns **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** The transaction ID if callback is not supplied.

### transferRegistrars

**Not yet implemented**
Transfers the deed to the current registrar, if different from this one.
Used during the upgrade process to a permanent registrar.

**Parameters**

-   `name`  The name to transfer.
-   `options` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** An optional transaction object to pass to web3.
-   `callback` **[function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)** An optional callback; if specified, the
           function executes asynchronously.

Returns **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** The transaction ID if callback is not supplied.

## shuffle

Shuffles array in place. ES6 version

**Parameters**

-   `a` **[Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)** items The array containing the items.
