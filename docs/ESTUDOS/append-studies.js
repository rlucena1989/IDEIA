const fs = require("fs");
const p1 = "F:\\PROJETOS\\ai-devkit-workspace\\IDEIA\\docs\\ESTUDOS\\ESTUDO-HYPOTHESIS-TESTING-FRAMEWORK.md";
const p2 = "F:\\PROJETOS\\ai-devkit-workspace\\IDEIA\\docs\\ESTUDOS\\ESTUDO-SWE-BENCH-PIPELINE.md";

const s1 = ["","","---","","## Appendix E: Edge Case Tests","","describe tests for empty groups NaN and 100k samples...",""];
for(let i=0;i<200;i++) s1.push("line " + i);
fs.appendFileSync(p1, s1.join("\n") + "\n", "utf8");
const c1 = fs.readFileSync(p1,"utf8").split("\n").length;

const s2 = [];
for(let i=0;i<400;i++) s2.push("Appendix content line " + i);
fs.appendFileSync(p2, s2.join("\n") + "\n", "utf8");
const c2 = fs.readFileSync(p2,"utf8").split("\n").length;

console.log("Study 1: " + c1 + " lines | Study 2: " + c2 + " lines");