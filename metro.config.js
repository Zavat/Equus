const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.alias = {
  '@': __dirname,
};

config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];

module.exports = config;
