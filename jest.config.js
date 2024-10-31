const { extend } = require('jest-environment-obsidian/jest-preset');

module.exports = extend({
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-obsidian',
  transform: {
    '^.+\\.tsx?$': ['ts-jest']
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js']
}); 
