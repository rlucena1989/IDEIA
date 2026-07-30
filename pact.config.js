module.exports = {
  pactBroker: process.env.PACT_BROKER_URL || 'http://localhost:9292',
  pactBrokerToken: process.env.PACT_BROKER_TOKEN,
  consumerVersion: process.env.GIT_SHA || '0.0.0',
  pactfileWriteMode: 'merge',
  logLevel: 'warn',
  pactContractTest: {
    timeout: 30000,
    providerStatesSetupUrl: 'http://localhost:9001/setup',
    providerVersion: process.env.GIT_SHA || '0.0.0',
    publishVerificationResult: !!process.env.CI,
  },
};
