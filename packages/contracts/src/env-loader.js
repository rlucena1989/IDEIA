"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadEnv = loadEnv;
const path_1 = require("path");
const logger_1 = require("@ideia/logger");
const fs_1 = require("fs");
const logger = (0, logger_1.createLogger)('env-loader');
function loadEnv(root) {
    try {
        const dotenv = require('dotenv');
        const basePath = root || process.cwd();
        const envFiles = [
            (0, path_1.resolve)(basePath, '.env'),
            (0, path_1.resolve)(basePath, '.env.local'),
        ];
        for (const file of envFiles) {
            if ((0, fs_1.existsSync)(file)) {
                dotenv.config({ path: file });
            }
        }
    }
    catch {
        // dotenv not available
    }
}
//# sourceMappingURL=env-loader.js.map