const path = require('path');

require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    moduleResolution: 'node',
    esModuleInterop: true
  }
});
const tsConfigPaths = require('tsconfig-paths');
tsConfigPaths.register({
  baseUrl: path.resolve(__dirname, '../..'),
  paths: {
    '@/*': ['src/*']
  }
});

const { createAuditLog } = require('@/lib/audit');
const { PAYMENT_TIERS, resolvePlanAmount, resolveTierKey } = require('@/lib/payment');

console.log('Import successful!');
console.log('PAYMENT_TIERS:', Object.keys(PAYMENT_TIERS));
console.log('resolvePlanAmount BASIC:', resolvePlanAmount('BASIC'));
console.log('createAuditLog type:', typeof createAuditLog);
