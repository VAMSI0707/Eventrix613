module.exports = {
  displayName: 'Auth-Service',
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: [
    'src/routes/**/*.js', '!src/**/__tests__/**'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    'src/server.js',
    'src/models/'
  ],      
  
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov'],
  verbose: true,
  transform: {}
};
