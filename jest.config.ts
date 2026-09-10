import nextJest from "next/jest.js"

const createJestConfig = nextJest({ dir: "./" })

export default createJestConfig({
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  // Loads @testing-library/jest-dom matchers after the test framework
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  // Build outputs contain their own package.json files, which Jest's module
  // resolver reports as duplicate-name collisions on every run.
  modulePathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/.next-preview/", "<rootDir>/.next-verify/"],
  testMatch: [
    "<rootDir>/src/__tests__/**/*.test.ts",
    "<rootDir>/src/__tests__/**/*.test.tsx",
  ],
  collectCoverageFrom: [
    "src/lib/**/*.ts",
    "!src/**/*.d.ts",
  ],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any)
