"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryCurator = exports.GlobalMemory = exports.InstitutionalMemory = exports.ProjectMemory = exports.WorkingMemory = exports.MemoryHierarchy = void 0;
exports.createMemoryHierarchy = createMemoryHierarchy;
var hierarchy_1 = require("./hierarchy");
Object.defineProperty(exports, "MemoryHierarchy", { enumerable: true, get: function () { return hierarchy_1.MemoryHierarchy; } });
var working_memory_1 = require("./working-memory");
Object.defineProperty(exports, "WorkingMemory", { enumerable: true, get: function () { return working_memory_1.WorkingMemory; } });
var project_memory_1 = require("./project-memory");
Object.defineProperty(exports, "ProjectMemory", { enumerable: true, get: function () { return project_memory_1.ProjectMemory; } });
var institutional_memory_1 = require("./institutional-memory");
Object.defineProperty(exports, "InstitutionalMemory", { enumerable: true, get: function () { return institutional_memory_1.InstitutionalMemory; } });
var global_memory_1 = require("./global-memory");
Object.defineProperty(exports, "GlobalMemory", { enumerable: true, get: function () { return global_memory_1.GlobalMemory; } });
var curator_1 = require("./curator");
Object.defineProperty(exports, "MemoryCurator", { enumerable: true, get: function () { return curator_1.MemoryCurator; } });
const hierarchy_2 = require("./hierarchy");
const logger_1 = require("@ideia/logger");
const logger = (0, logger_1.createLogger)('index');
function createMemoryHierarchy() {
    return new hierarchy_2.MemoryHierarchy();
}
//# sourceMappingURL=index.js.map