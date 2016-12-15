/*
* Import solidity (Registar code, ENS)
* Connect to a node
* Compile and deploy solidity code. 
* Instantiate contracts in web3
* Run tests
*/

var Registrar = require('./index.js')
var ENS = require('ethereum-ens');
var fs = require('fs');
var solc = require('solc');
var TestRPC = require("ethereumjs-testrpc");
var Web3 = require("web3");


var web3 = new Web3();

var accounts = null;
var ens = ENS(web3);
var ensRoot = null;
var registrar = null;
var registrarAddress = null;
var rootNode = null;

var tld = "eth";
var min_length = 7;


web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'));

web3.eth.getAccounts( function(err, accts){
    accounts = accts;

    if(err) console.log(err);
    ens = new ENS(web3);
    console.log(ens);
    registrar = new Registrar(web3);
    registrar.init(ens, tld, min_length);
    debugger;
});


console.log("end");
