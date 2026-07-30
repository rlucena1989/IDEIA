"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultContributionRegistry = void 0;
class DefaultContributionRegistry {
    contributions = new Map();
    disposables = [];
    register(type, contribution) {
        const list = this.contributions.get(type) || [];
        list.push(contribution);
        this.contributions.set(type, list);
        const disposable = { dispose: () => this.unregister(type, contribution) };
        this.disposables.push(disposable);
        return disposable;
    }
    getContributions(type) {
        return (this.contributions.get(type) || []);
    }
    hasType(type) {
        return this.contributions.has(type);
    }
    dispose() {
        for (const d of this.disposables) {
            try {
                d.dispose();
            }
            catch { }
        }
        this.contributions.clear();
        this.disposables = [];
    }
    unregister(type, contribution) {
        const list = this.contributions.get(type);
        if (!list)
            return;
        const idx = list.indexOf(contribution);
        if (idx !== -1) {
            list.splice(idx, 1);
            if (list.length === 0)
                this.contributions.delete(type);
        }
    }
}
exports.DefaultContributionRegistry = DefaultContributionRegistry;
//# sourceMappingURL=contributor.js.map