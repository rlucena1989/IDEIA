"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContributionType = exports.DefaultContributionProvider = exports.DisposableCollection = exports.Emitter = void 0;
exports.bindContributionProvider = bindContributionProvider;
class Emitter {
    listeners = [];
    disposed = false;
    get event() {
        return (listener, thisArgs) => {
            this.listeners.push({ listener, thisArgs });
            return { dispose: () => this.removeListener(listener) };
        };
    }
    fire(event) {
        if (this.disposed)
            return;
        for (const entry of this.listeners) {
            entry.listener.call(entry.thisArgs, event);
        }
    }
    dispose() {
        this.disposed = true;
        this.listeners = [];
    }
    removeListener(listener) {
        this.listeners = this.listeners.filter(l => l.listener !== listener);
    }
}
exports.Emitter = Emitter;
class DisposableCollection {
    disposables = [];
    push(disposable) {
        this.disposables.push(disposable);
    }
    dispose() {
        for (const d of this.disposables) {
            try {
                d.dispose();
            }
            catch { }
        }
        this.disposables = [];
    }
}
exports.DisposableCollection = DisposableCollection;
class DefaultContributionProvider {
    contributions = [];
    onChangedEmitter = new Emitter();
    get onContributionsChanged() {
        return this.onChangedEmitter.event;
    }
    constructor(contributions) {
        if (contributions) {
            this.contributions = [...contributions];
        }
    }
    getContributions() {
        return [...this.contributions];
    }
    hasContributions() {
        return this.contributions.length > 0;
    }
    register(contribution) {
        this.contributions.push(contribution);
        this.onChangedEmitter.fire(void 0);
        return { dispose: () => this.unregister(contribution.id) };
    }
    unregister(id) {
        this.contributions = this.contributions.filter(c => c.id !== id);
        this.onChangedEmitter.fire(void 0);
    }
    get(id) {
        return this.contributions.find(c => c.id === id);
    }
}
exports.DefaultContributionProvider = DefaultContributionProvider;
function bindContributionProvider(contributions) {
    return contributions;
}
var ContributionType;
(function (ContributionType) {
    ContributionType["Command"] = "command";
    ContributionType["Menu"] = "menu";
    ContributionType["Keybinding"] = "keybinding";
    ContributionType["View"] = "view";
    ContributionType["Widget"] = "widget";
    ContributionType["Tool"] = "tool";
    ContributionType["Agent"] = "agent";
    ContributionType["Preference"] = "preference";
    ContributionType["Theme"] = "theme";
    ContributionType["Custom"] = "custom";
})(ContributionType || (exports.ContributionType = ContributionType = {}));
//# sourceMappingURL=types.js.map