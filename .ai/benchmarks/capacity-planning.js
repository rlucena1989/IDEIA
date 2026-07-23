#!/usr/bin/env node

/**
 * Capacity Planning Calculator — Estimates resources based on usage parameters
 *
 * Inputs: daily users, requests/user, model size, vector DB size
 * Outputs: CPU, RAM, GPU, Storage needed
 *
 * Usage:
 *   node .ai/benchmarks/capacity-planning.js                                          # estimate with defaults
 *   node .ai/benchmarks/capacity-planning.js --users 10000 --requests 50             # custom params
 *   node .ai/benchmarks/capacity-planning.js --plan --users 5000                     # generate full plan
 *   node .ai/benchmarks/capacity-planning.js --compare --users 10000                 # compare providers
 *   node .ai/benchmarks/capacity-planning.js --output plan.json                      # save results
 */

const PROVIDER_PRICING = {
  aws: {
    cpuPerVCpu: 0.042,        // $/hour per vCPU (t3.medium equivalent)
    ramPerGb: 0.007,          // $/hour per GB RAM
    gpuPerUnit: 0.80,         // $/hour per GPU (g4dn.xlarge)
    storagePerGb: 0.08,       // $/GB/month (gp3)
    networkPerGb: 0.05,       // $/GB egress
    minMonthly: 50,           // minimum monthly cost
  },
  azure: {
    cpuPerVCpu: 0.046,
    ramPerGb: 0.008,
    gpuPerUnit: 0.90,
    storagePerGb: 0.09,
    networkPerGb: 0.05,
    minMonthly: 55,
  },
  gcp: {
    cpuPerVCpu: 0.040,
    ramPerGb: 0.007,
    gpuPerUnit: 0.75,
    storagePerGb: 0.07,
    networkPerGb: 0.04,
    minMonthly: 45,
  },
  digitalocean: {
    cpuPerVCpu: 0.035,
    ramPerGb: 0.006,
    gpuPerUnit: 0.70,
    storagePerGb: 0.06,
    networkPerGb: 0.03,
    minMonthly: 30,
  },
};

function estimateResources(params) {
  const {
    dailyUsers = 1000,
    requestsPerUser = 20,
    modelSizeGb = 7,
    vectorDbSizeGb = 10,
    concurrentUsers = Math.round(dailyUsers * 0.1),
    avgRequestTokens = 500,
    avgResponseTokens = 1500,
    targetLatencyMs = 200,
    availability = 'standard',
  } = params;

  const dailyRequests = dailyUsers * requestsPerUser;
  const requestsPerSecond = dailyRequests / 86400;
  const peakRps = requestsPerSecond * 3;

  const tokensPerSecond = peakRps * (avgRequestTokens + avgResponseTokens);
  const modelMemoryGb = Math.ceil(modelSizeGb * 1.2);
  const kvCacheGb = Math.ceil(concurrentUsers * avgResponseTokens * 2 / 1000);
  const vectorMemoryGb = Math.ceil(vectorDbSizeGb * 0.3);

  let cpuCores, ramGb, gpuUnits, storageGb;

  if (tokensPerSecond < 1000) {
    cpuCores = 4;
    ramGb = 16 + modelMemoryGb + kvCacheGb + vectorMemoryGb;
    gpuUnits = modelSizeGb > 0 ? 1 : 0;
    storageGb = Math.ceil(vectorDbSizeGb * 1.5 + 50);
  } else if (tokensPerSecond < 10000) {
    cpuCores = 8;
    ramGb = 32 + modelMemoryGb + kvCacheGb + vectorMemoryGb;
    gpuUnits = modelSizeGb > 0 ? 2 : 0;
    storageGb = Math.ceil(vectorDbSizeGb * 1.5 + 100);
  } else if (tokensPerSecond < 50000) {
    cpuCores = 16;
    ramGb = 64 + modelMemoryGb + kvCacheGb + vectorMemoryGb;
    gpuUnits = modelSizeGb > 0 ? 4 : 0;
    storageGb = Math.ceil(vectorDbSizeGb * 1.5 + 200);
  } else {
    cpuCores = 32;
    ramGb = 128 + modelMemoryGb + kvCacheGb + vectorMemoryGb;
    gpuUnits = modelSizeGb > 0 ? 8 : 0;
    storageGb = Math.ceil(vectorDbSizeGb * 1.5 + 500);
  }

  if (availability === 'high') {
    cpuCores = Math.ceil(cpuCores * 2);
    ramGb = Math.ceil(ramGb * 2);
    storageGb = Math.ceil(storageGb * 2);
  }

  return {
    inputs: { dailyUsers, requestsPerUser, dailyRequests, requestsPerSecond, peakRps, modelSizeGb, vectorDbSizeGb },
    compute: { cpuCores, ramGb, gpuUnits, storageGb, tokensPerSecond: Math.round(tokensPerSecond) },
    estimated: {
      concurrentUsers,
      peakRps: Math.round(peakRps * 100) / 100,
      modelMemoryGb,
      kvCacheGb,
      vectorMemoryGb,
    },
  };
}

function generatePlan(params) {
  const resources = estimateResources(params);

  const compute = resources.compute;
  const monthlyHours = 730;

  const plans = Object.entries(PROVIDER_PRICING).map(([provider, pricing]) => {
    const cpuCost = compute.cpuCores * pricing.cpuPerVCpu * monthlyHours;
    const ramCost = compute.ramGb * pricing.ramPerGb * monthlyHours;
    const gpuCost = compute.gpuUnits * pricing.gpuPerUnit * monthlyHours;
    const storageCost = compute.storageGb * pricing.storagePerGb;
    const networkCost = compute.tokensPerSecond * 86400 * 30 * pricing.networkPerGb / 1e9;

    const totalMonthly = Math.max(
      pricing.minMonthly,
      cpuCost + ramCost + gpuCost + storageCost + networkCost
    );

    return {
      provider,
      monthlyCost: Math.round(totalMonthly * 100) / 100,
      breakdown: {
        cpu: Math.round(cpuCost * 100) / 100,
        ram: Math.round(ramCost * 100) / 100,
        gpu: Math.round(gpuCost * 100) / 100,
        storage: Math.round(storageCost * 100) / 100,
        network: Math.round(networkCost * 100) / 100,
      },
      estimatedAnnual: Math.round(totalMonthly * 12 * 100) / 100,
    };
  });

  const cheapest = plans.reduce((best, p) => p.monthlyCost < best.monthlyCost ? p : best, plans[0]);

  return {
    resources,
    plans: plans.sort((a, b) => a.monthlyCost - b.monthlyCost),
    recommendation: {
      provider: cheapest.provider,
      monthlyCost: cheapest.monthlyCost,
      estimatedAnnual: cheapest.estimatedAnnual,
      specs: `${compute.cpuCores}vCPU, ${compute.ramGb}GB RAM, ${compute.gpuUnits}GPU, ${compute.storageGb}GB Storage`,
    },
    assumptions: {
      availability: params.availability || 'standard',
      avgRequestTokens: params.avgRequestTokens || 500,
      avgResponseTokens: params.avgResponseTokens || 1500,
      concurrentRatio: '10% of daily users',
    },
    generatedAt: new Date().toISOString(),
  };
}

function comparePlans(params, providers) {
  const configs = providers || Object.keys(PROVIDER_PRICING);
  const basePlan = generatePlan(params);
  const filtered = basePlan.plans.filter(p => configs.includes(p.provider));
  return { ...basePlan, plans: filtered, recommendation: filtered.reduce((best, p) => p.monthlyCost < best.monthlyCost ? p : best, filtered[0]) };
}

async function run() {
  const args = process.argv.slice(2);
  const planMode = args.includes('--plan');
  const compareMode = args.includes('--compare');
  const outputFile = args.find(a => a.startsWith('--output='))?.split('=')[1];

  const extractParam = (prefix) => {
    const arg = args.find(a => a.startsWith(`${prefix}=`));
    return arg ? parseInt(arg.split('=')[1], 10) : undefined;
  };

  const params = {
    dailyUsers: extractParam('--users') || 1000,
    requestsPerUser: extractParam('--requests') || 20,
    modelSizeGb: extractParam('--model-size') || 7,
    vectorDbSizeGb: extractParam('--vector-size') || 10,
  };

  let report;

  if (planMode || compareMode) {
    report = generatePlan(params);
  } else {
    report = estimateResources(params);
  }

  if (outputFile) {
    const fs = require('fs');
    fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
    console.error(`Report saved to ${outputFile}`);
  }

  console.log(JSON.stringify(report, null, 2));
  return report;
}

if (require.main === module) {
  run().catch(err => {
    console.error('Capacity planning failed:', err.message);
    process.exit(1);
  });
}

module.exports = { estimateResources, generatePlan, comparePlans, PROVIDER_PRICING };
