// noinspection JSFileReferences
require.config({
    baseUrl: ".",
    packages: [{
        name: "codemirror",
        location: "node_modules/codemirror",
        main: "lib/codemirror"
    }],
    "paths": {
        'babel-polyfill': 'node_modules/babel-polyfill/dist/polyfill.min'
    }
});
require(["babel-polyfill"]);
require(['minified/main']);