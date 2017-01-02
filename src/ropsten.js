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
    > c

    break in ropsten.js:64
     62   const registrar = new Registrar(web3);
     63   const ens = registrar.ens; // eslint-disable-line
    >64   debugger; // eslint-disable-line
     65 });
     66

    // The program stops again, enter `repl` to access the program's environment
    > repl

    Press Ctrl + C to leave debug repl
    > registrar.getEntry('insurance')
    { name: 'insurance',
      hash: '0x73079a5cb4c7d259f40c6d0841629e689d2a95b85883b371e075ffb2f329c3e1',
      status: 2,
      deed:
       { address: '0x268e06911ba1ddc9138b355f9b42711abbc6eaec',
         balance: { s: 1, e: 18, c: [Object] },
         creationDate: { s: 1, e: 9, c: [Object] },
         owner: '0x8394a052eb6c32fb9defcaabc12fcbd8fea0b8a8' },
      registrationDate: 1481108206,
      value: 5000000000000000000,
      highestBid: 11100000000000000000,
    mode: 'owned' }
  ```
*/

const Registrar = require('./index.js');
const Web3 = require('web3');

const web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'));

// TODO: make this into a proper repl
web3.eth.getAccounts((err, accts) => { // eslint-disable-line

  if (err) console.log(err); // eslint-disable-line
  // ens = new ENS(web3);
  const registrar = new Registrar(web3);
  const ens = registrar.ens; // eslint-disable-line
  debugger; // eslint-disable-line
});

