const fs = require('fs');
const path = require('path');
const ts = require(path.join(__dirname, '..', '..', 'node_modules', 'typescript'));

const packages = [
  'reality-sync', 'cli', 'agent-runtime', 'memory-store', 'event-bus',
  'workflow-engine', 'delivery-orchestrator', 'prompt-security',
  'observability-engine', 'contract-cdc', 'mcp', 'schema-registry',
  'feedback-pipeline', 'contracts', 'policy-engine'
];

let ok = 0, fail = 0;
packages.forEach(pkg => {
  const cfgPath = path.join(__dirname, '..', '..', 'packages', pkg, 'tsconfig.json');
  if (!fs.existsSync(cfgPath)) { ok++; return; }

  const config = ts.readConfigFile(cfgPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(cfgPath));
  const prog = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options });
  const diags = ts.getPreEmitDiagnostics(prog);

  if (diags.length === 0) {
    ok++;
    console.log('  PASS ' + pkg);
  } else {
    fail++;
    console.log('  FAIL ' + pkg + ': ' + diags.length + ' errors');
    diags.forEach(d => {
      if (d.file) {
        const l = d.file.getLineAndCharacterOfPosition(d.start);
        console.log('    ' + d.file.fileName.split(/[/\\]/).pop() + ':' + (l.line + 1) + ' ' + ts.flattenDiagnosticMessageText(d.messageText).substring(0, 120));
      }
    });
  }
});

console.log('\nPASS: ' + ok + ' FAIL: ' + fail);
process.exit(fail > 0 ? 1 : 0);
