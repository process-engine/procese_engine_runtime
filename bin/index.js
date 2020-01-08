#!/usr/bin/env node

'use strict';

const minimist = require('minimist');

const argv = minimist(process.argv.slice(2));

const {startRuntime} = require('../dist/commonjs');

startRuntime(argv);
