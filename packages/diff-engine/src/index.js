"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatGitDiff = exports.parseGitDiff = exports.DEFAULT_EQUIVALENCE_CONFIG = exports.detectEquivalence = exports.diffSpecs = exports.deepDiff = exports.diffText = void 0;
var text_diff_1 = require("./text-diff");
Object.defineProperty(exports, "diffText", { enumerable: true, get: function () { return text_diff_1.diffText; } });
var object_diff_1 = require("./object-diff");
Object.defineProperty(exports, "deepDiff", { enumerable: true, get: function () { return object_diff_1.deepDiff; } });
Object.defineProperty(exports, "diffSpecs", { enumerable: true, get: function () { return object_diff_1.diffSpecs; } });
var semantic_diff_1 = require("./semantic-diff");
Object.defineProperty(exports, "detectEquivalence", { enumerable: true, get: function () { return semantic_diff_1.detectEquivalence; } });
Object.defineProperty(exports, "DEFAULT_EQUIVALENCE_CONFIG", { enumerable: true, get: function () { return semantic_diff_1.DEFAULT_EQUIVALENCE_CONFIG; } });
var git_diff_1 = require("./git-diff");
Object.defineProperty(exports, "parseGitDiff", { enumerable: true, get: function () { return git_diff_1.parseGitDiff; } });
Object.defineProperty(exports, "formatGitDiff", { enumerable: true, get: function () { return git_diff_1.formatGitDiff; } });
//# sourceMappingURL=index.js.map