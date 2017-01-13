/* eslint-disable*/
const fs = require('fs');

const interfaces = JSON.parse(fs.readFileSync('src/interfaces.json'));

module.exports = {
    deedInterface: interfaces.deedInterface,
    registrarInterface: interfaces.registrarInterface,
    registryInterface: interfaces.registryInterface
};