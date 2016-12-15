/* 
  Handy for connecting to ropsten to interact with the ENS or ETH-Registrar from the command line
  Usage example: 

  ```
    $ node debug ropsten
    < Debugger listening on [::]:5858
    connecting to 127.0.0.1:5858 ... ok
    break in ropsten.js:11
      9
     10 
    >11 var Registrar = require('./index.js')
     12 var ENS = require('ethereum-ens');
     13 var fs = require('fs');

    // the program will stop here, enter `c` to 'continue' or 'help'
    c 

    < ens.registry.address:  0x112234455c3a32fd11230c42e7bccd4a84e02010
    < registrar.address:  0x0000000000000000000000000000000000000000
    break in ropsten.js:44
     42     console.log('registrar.address: ', registrar.address);
     43
    >44     debugger;
     45 });
     46

    // The program stops again, enter `repl` to access the program's environment
    repl 
    
    Press Ctrl + C to leave debug repl
    > registrar.getEntry('insurance');
    { name: 'insurance',
      hash: '0x73079a5cb4c7d259f40c6d0841629e689d2a95b85883b371e075ffb2f329c3e1',
      status: 0,
      deed: '0x',
      registrationDate: 0,
      value: 0,
      highestBid: 0 } 
    > registrar.getEntry('foundation');
    { name: 'foundation',
      hash: '0x0d5c1bd818a4086f28314415cb375a937593efab66f8f7d2903bf2a13ed35070',
      status: 2,
      deed: '0x0b3184d5f567df9725025b61e117fc00e2be979e',
      registrationDate: 1481556445,
      value: 10000000000000000,
      highestBid: 2100000000000000000 }
  ```  
*/

var Registrar = require('./index.js')
var ENS = require('ethereum-ens');
var fs = require('fs');
var solc = require('solc');
var TestRPC = require("ethereumjs-testrpc");
var Web3 = require("web3");


var web3 = new Web3();

var accounts = null;
var registrar = null;
var ens = null;


web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'));

web3.eth.getAccounts( function(err, accts){
    accounts = accts;

    if(err) console.log(err);
    // ens = new ENS(web3);
    registrar = new Registrar(web3);
    registrar.init();
    ens = registrar.ens;
    debugger;
});

