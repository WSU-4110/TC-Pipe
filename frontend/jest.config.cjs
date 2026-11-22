module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['<rootDir>/pages/__tests__/**/*.test.{js,jsx}'],
  moduleNameMapper: {
    '\\.(css|less|scss)$': '<rootDir>/pages/__tests__/styleMock.cjs',
  },
};
