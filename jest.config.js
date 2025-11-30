module.exports = {
  
  projects: [
    '<rootDir>/services/auth-service/jest.config.js',
    '<rootDir>/services/booking-service/jest.config.js',
    '<rootDir>/services/event-service/jest.config.js',
  ],

  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/frontend/src/', 
    '<rootDir>/src/' 
  ],
  coverageReporters: ['text', 'text-summary', 'lcov'],
  verbose: true
};