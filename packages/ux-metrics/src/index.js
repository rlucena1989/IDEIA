"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeNps = exports.createUxMetricsCollector = exports.UxMetricsCollector = void 0;
var ux_metrics_collector_1 = require("./ux-metrics-collector");
Object.defineProperty(exports, "UxMetricsCollector", { enumerable: true, get: function () { return ux_metrics_collector_1.UxMetricsCollector; } });
Object.defineProperty(exports, "createUxMetricsCollector", { enumerable: true, get: function () { return ux_metrics_collector_1.createUxMetricsCollector; } });
Object.defineProperty(exports, "normalizeNps", { enumerable: true, get: function () { return ux_metrics_collector_1.normalizeNps; } });
__exportStar(require("./types"), exports);
//# sourceMappingURL=index.js.map