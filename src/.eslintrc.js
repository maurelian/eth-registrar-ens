module.exports = {
    "extends": "airbnb-base",
    "installedESLint": true,
    "env": {
        "browser": true,
        "mocha": true,
        "node": true
    },
    "rules": {
        // comma-dangle won't run (for me) in node 6.9.1
        "comma-dangle": "off",
        // consistent-return prevents passing a callback to our methods
        "consistent-return": "off", 
        "import/no-extraneous-dependencies": "off",
        "no-lonely-if": "warn",
        "no-plusplus": ["warn", {"allowForLoopAfterthoughts": true}],
        "require-jsdoc": ["error", {
            "require": {
                "FunctionDeclaration": true,
                "MethodDefinition": true,
                "ClassDeclaration": true,
                "ArrowFunctionExpression": false
                }
            }
        ]
    },
    "plugins": [
        "import"
    ]
};