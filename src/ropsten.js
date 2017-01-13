/*
  Handy for connecting to ropsten to interact with the ENS or ETH-Registrar from the command line
  Usage example:

  ```
    # In one terminal:
    $ geth -testnet --rpc
    # After the above has synced, in another terminal:
    $ node src/ropsten
    node>
    node> registrar.getEntry('insurance')
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
const repl = require('repl');

const web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'));

web3.eth.getAccounts((err, accts) => {
  if (err) {
    console.log(err);  // eslint-disable-line
  } else {
    const registrar = new Registrar(web3);
    const ens = registrar.ens;
    const r = repl.start('node> ');
    r.context.registrar = registrar;
    r.context.ens = ens;
    r.context.web3 = web3;
    r.context.accts = accts;
  }
});
