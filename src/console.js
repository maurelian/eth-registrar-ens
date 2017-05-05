/*
  Handy for connecting to ropsten to interact with the ENS or ETH-Registrar from the command line
  Usage example:

  ```
    # In one terminal:
    $ geth -testnet --rpc
    # After the above has synced, in another terminal:
    $ node ropsten
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
const ENS = require('ethereum-ens');
const Web3 = require('web3');
const repl = require('repl');

let ens = null;
let registrar = null;

const web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'));
web3.eth.getAccounts((err, accts) => { // eslint-disable-line
  if (err) {
    console.log(err); // eslint-disable-line
  } else {
    // live net
    ens = new ENS(web3, '0x314159265dd8dbb310642f98f50c066173c1259b');
    // ropsten
    // ens = new ENS(web3, "0x112234455c3a32fd11230c42e7bccd4a84e02010");
    registrar = new Registrar(web3, ens, 'eth', 7, () => {
      const ens = registrar.ens; // eslint-disable-line
      console.log(`connecting to: ` + // eslint-disable-line
        `\n  * the ENS registry at ${ens.registry.address} ` + // eslint-disable-line
        `\n  * the "${registrar.tld}" registrar at ${registrar.address}`);
      const r = repl.start('node> ');
      r.context.registrar = registrar;
      r.context.ens = ens;
      r.context.web3 = web3;
      r.context.accts = accts;
    }
    );
  }
});
