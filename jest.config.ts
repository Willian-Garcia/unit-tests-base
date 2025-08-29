import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/tests/jest.setup.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  testMatch: ["**/tests/**/*.test.ts"],
  verbose: true,
  moduleNameMapper: {
    "^src/(.*)$": "<rootDir>/src/$1", // 👈 resolve 'src/...'
  },
};

export default config;