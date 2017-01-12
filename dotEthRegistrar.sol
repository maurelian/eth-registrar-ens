pragma solidity ^0.4.0;

import "node_modules/ens/interface";
import "node_modules/ens/ENS" as ENS;
import "node_modules/ens/hashRegistrarSimplified" as Registrar;

contract DeployENS {
    ENS public ens;
    Registrar public registrar;
    bytes32 public tldnode;
    
    function DeployENS() {
        var tld = sha3('eth');
        tldnode = sha3(bytes32(0), tld);
        // _this_ contract is the ENS rootnode owner
        ens = new ENS(this);
        // This is amazing! Look at this just deploying it's own Registrar!
        registrar = new Registrar(ens, tldnode);
        // make registrar the owner of dotEth
        ens.setSubnodeOwner(0,tld,registrar);


        // Set foo.eth up with a resolver and an addr record
        // ens.setSubnodeOwner(0, tld, this);
        // ens.setSubnodeOwner(tldnode, sha3('foo'), this);
        // var fooDotEth = sha3(tldnode, sha3('foo'));
       
    }
    function registrarInfo() constant returns (address, bytes32){
        return (registrar, tldnode);
    } 
}