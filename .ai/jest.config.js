/** @type {import('jest').Config} */
module.exports = {
  "preset": "ts-jest",
  "testEnvironment": "node",
  "roots": [
    "<rootDir>/tests"
  ],
  "testMatch": [
    "**/*.test.ts"
  ],
  "moduleFileExtensions": [
    "ts",
    "js",
    "json"
  ],
  "collectCoverageFrom": [
    "src/**/*.ts",
    "!src/server.ts",
    "!src/cli.ts",
    "!**/*.d.ts"
  ],
  "coverageDirectory": "coverage",
  "clearMocks": true,
  "testTimeout": 30000,
  "transform": {
    "^.+\\.ts$": [
      "ts-jest",
      {
        "tsconfig": {
          "module": "CommonJS",
          "esModuleInterop": true,
          "types": [
            "node",
            "jest"
          ]
        }
      }
    ]
  },
  "coverageThreshold": {
    "global": {
      "lines": 80,
      "branches": 75,
      "functions": 80,
      "statements": 80
    },
    "./src/": {
      "lines": 85,
      "branches": 65,
      "functions": 85,
      "statements": 85
    }
  },
  "coverageReporters": [
    "text",
    "lcov",
    "cobertura",
    "json-summary"
  ]
};


