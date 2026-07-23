import { Command } from 'commander';
import {
  initCommand, doctorCommand, featureCommand, statusCommand, verifyCommand,
  syncCommand, auditCommand, contextCommand, adapterCommand, auditLedgerCommand,
  backupStatusCommand, backupConfigureGithubCommand, proveCommand, hookCommand,
  modeCommand, detectCommand, wizardCommand, retrospectiveCommand, mcpCommand,
  ciCommand, compileCommand, scorecardCommand, timelineCommand, learnCommand,
  agentsCommand, hooksCommand, driftCommand, pluginCommand, attestCommand,
  securityCommand, complianceCommand, rulesCommand, aiCommand, generateCommand,
  contractCommand, releaseCommand, pipelineCommand, performanceCommand,
  featureFlagCommand, ecosystemCommand, reviewCommand, supplyChainCommand,
  gateCommand, knowledgeCommand, observabilityCommand, recordAutoTrace,
  promptCommand, streamCommand, worktreeCommand, snapshotCommand, workflowCommand,
  ragCommand, engineerCommand, prReviewCommand, optimizeCommand, designCommand,
  experimentCommand, mirrorCommand, simulateCommand, appbuilderCommand,
  taskRunCommand, ideCommand, githubCommand, testCommand, scannerCommand,
  patternsCommand, createConsistencyCommand, createMultimodalCommand,
  createLowLevelCommand, createPreviewCommand, createBootstrapCommand,
  coprocessCommand, orchestrateCommand, coverageImproveCommand,
  testFixBrokenCommand, testAutonomyCommand, docsCommand, planCommand,
  coverageCommand, stateCommand, hardenCommand, validateGenerationCommand,
  evolveCommand, adaptiveCommand, publishCommand, distributeCommand,
  telemetryCommand, metricsCommand, alertsCommand, recoverCommand,
  resilienceCommand, policyCommand, approveCommand, governanceCommand,
  agentCommand, roadmapCommand, strategyCommand, scenarioCommand, predictCommand,
  consolidateCommand, verdictCommand, closeCycleCommand, autonomyCommand,
  autonomousRunCommand, autonomousStatusCommand, maintenanceCommand,
  federationCommand, syncContextCommand, reconfigureCommand, featuresCommand,
  platformCommand, finishCommand, trustCommand, authorityCommand, memoryCommand,
  explainCommand, decisionCommand, traceCommand, riskCommand, forecastCommand,
  runbookCommand, legacyCommand, archiveCommand, shutdownCommand, restoreCommand,
  accelerationCommand, anomalyCommand, complexityCommand, polyglotCommand,
  reportCommand, webhookCommand, registerIdeiaCommand,
  emergencyCommand, configCommand, evolutionCommand, radarCommand, setupCommand, notifyCommand,
  catalogCommand, tutorialCommand, lifecycleCliCommand,
  auditTrailCommand,
} from './commands/index';

import { getCliVersion } from './utils/version';
import { AuditTrail } from '@ideia/audit-trail';
import path from 'node:path';

const AUDIT_TRAIL_PATH = path.join(process.cwd(), '.ai', 'audit', 'cli-trail.jsonl');
const auditTrail = new AuditTrail(AUDIT_TRAIL_PATH);

const program = new Command();

program
  .name('ai-devkit')
  .description('AI-Devkit Enterprise CLI - O Sistema Operacional da IA')
  .version(getCliVersion());

program.addCommand(initCommand());
program.addCommand(doctorCommand());
program.addCommand(featureCommand());
program.addCommand(statusCommand());
program.addCommand(verifyCommand());
program.addCommand(syncCommand());
program.addCommand(auditCommand());
program.addCommand(contextCommand());
program.addCommand(adapterCommand());
program.addCommand(auditLedgerCommand());
program.addCommand(backupStatusCommand());
program.addCommand(backupConfigureGithubCommand());
program.addCommand(proveCommand());
program.addCommand(hookCommand());
program.addCommand(modeCommand());
program.addCommand(detectCommand());
program.addCommand(wizardCommand());
program.addCommand(retrospectiveCommand());
program.addCommand(mcpCommand());
program.addCommand(ciCommand());
program.addCommand(compileCommand());
program.addCommand(scorecardCommand());
program.addCommand(timelineCommand());
program.addCommand(learnCommand());
program.addCommand(agentsCommand());
program.addCommand(hooksCommand());
program.addCommand(driftCommand());
program.addCommand(pluginCommand());
program.addCommand(attestCommand());
program.addCommand(securityCommand());
program.addCommand(complianceCommand());
program.addCommand(rulesCommand());
program.addCommand(aiCommand());
program.addCommand(generateCommand());
program.addCommand(contractCommand());
program.addCommand(releaseCommand());
program.addCommand(pipelineCommand());
program.addCommand(performanceCommand());
program.addCommand(featureFlagCommand());
program.addCommand(ecosystemCommand());
program.addCommand(reviewCommand());
program.addCommand(supplyChainCommand());
program.addCommand(gateCommand());
program.addCommand(knowledgeCommand());
program.addCommand(observabilityCommand());
program.addCommand(promptCommand());
program.addCommand(streamCommand());
program.addCommand(worktreeCommand());
program.addCommand(snapshotCommand());
program.addCommand(workflowCommand());
program.addCommand(ragCommand());
program.addCommand(engineerCommand());
program.addCommand(prReviewCommand());
program.addCommand(optimizeCommand());
program.addCommand(designCommand());
program.addCommand(experimentCommand());
program.addCommand(mirrorCommand());
program.addCommand(simulateCommand());
program.addCommand(appbuilderCommand());
program.addCommand(taskRunCommand());
program.addCommand(ideCommand());
program.addCommand(githubCommand());
program.addCommand(testCommand());
program.addCommand(scannerCommand());
program.addCommand(patternsCommand());
program.addCommand(createConsistencyCommand());
program.addCommand(createMultimodalCommand());
program.addCommand(createLowLevelCommand());
program.addCommand(createPreviewCommand());
program.addCommand(createBootstrapCommand());
program.addCommand(coprocessCommand());
program.addCommand(orchestrateCommand());
program.addCommand(coverageImproveCommand());
program.addCommand(testFixBrokenCommand());
program.addCommand(testAutonomyCommand());
program.addCommand(docsCommand());
program.addCommand(planCommand());
program.addCommand(coverageCommand());
program.addCommand(stateCommand());
program.addCommand(hardenCommand());
program.addCommand(validateGenerationCommand());
program.addCommand(evolveCommand());
program.addCommand(adaptiveCommand());
program.addCommand(publishCommand());
program.addCommand(distributeCommand());
program.addCommand(telemetryCommand());
program.addCommand(metricsCommand());
program.addCommand(alertsCommand());
program.addCommand(recoverCommand());
program.addCommand(resilienceCommand());
program.addCommand(policyCommand());
program.addCommand(approveCommand());
program.addCommand(governanceCommand());
program.addCommand(agentCommand());
program.addCommand(roadmapCommand());
program.addCommand(strategyCommand());
program.addCommand(scenarioCommand());
program.addCommand(predictCommand());
program.addCommand(consolidateCommand());
program.addCommand(verdictCommand());
program.addCommand(closeCycleCommand());
program.addCommand(autonomyCommand());
program.addCommand(autonomousRunCommand());
program.addCommand(autonomousStatusCommand());
program.addCommand(maintenanceCommand());
program.addCommand(federationCommand());
program.addCommand(syncContextCommand());
program.addCommand(reconfigureCommand());
program.addCommand(featuresCommand());
program.addCommand(platformCommand());
program.addCommand(finishCommand());
program.addCommand(trustCommand());
program.addCommand(authorityCommand());
program.addCommand(memoryCommand());
program.addCommand(explainCommand());
program.addCommand(decisionCommand());
program.addCommand(traceCommand());
program.addCommand(riskCommand());
program.addCommand(forecastCommand());
program.addCommand(runbookCommand());
program.addCommand(legacyCommand());
program.addCommand(archiveCommand());
program.addCommand(shutdownCommand());
program.addCommand(restoreCommand());
program.addCommand(accelerationCommand());
program.addCommand(anomalyCommand());
program.addCommand(complexityCommand());
program.addCommand(polyglotCommand());
program.addCommand(reportCommand());
program.addCommand(webhookCommand());
registerIdeiaCommand(program);

program.addCommand(catalogCommand());
program.addCommand(tutorialCommand());
program.addCommand(lifecycleCliCommand());
program.addCommand(emergencyCommand());
program.addCommand(configCommand());
program.addCommand(evolutionCommand());
program.addCommand(radarCommand());
program.addCommand(setupCommand());
program.addCommand(notifyCommand());
program.addCommand(auditTrailCommand(auditTrail));

// MET-01: Auto-tracing middleware — records trace entry for every CLI command
let _traceStart = 0;
let _traceCommand = '';

program.hook('preAction', () => {
  _traceStart = Date.now();
  _traceCommand = program.args[0] || '';
});

process.on('exit', (code) => {
  if (_traceStart > 0) {
    const elapsed = Date.now() - _traceStart;
    const status = code === 0 ? 'success' : 'error';
    recordAutoTrace(_traceCommand, status, elapsed);
    auditTrail.append({
      actor: 'system',
      eventType: 'cli:command',
      target: `cli:${_traceCommand}`,
      decision: code === 0 ? 'auto' : 'block',
      result: code === 0 ? 'success' : 'failure',
      metadata: { elapsed, command: _traceCommand, status },
    });
  }
});

program.parse(process.argv);

