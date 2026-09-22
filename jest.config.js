module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.spec.ts"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/server.ts",
    "!src/messaging/rabbitmq.ts",
    "!src/database/data-source.ts",
    "!src/swagger.ts"
  ],
  coverageThreshold: {
    global: { statements: 80, branches: 35, functions: 80, lines: 80 }
  }
};
