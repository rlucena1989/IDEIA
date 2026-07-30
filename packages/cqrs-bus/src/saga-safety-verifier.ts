import { PetriNet, PetriPlace, PetriTransition, SafetyResult } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('saga-safety-verifier');

export class SagaSafetyVerifier {
  private _nets: Map<string, PetriNet> = new Map();

  buildSagaPetriNet(sagaName: string, steps: Array<{ name: string; compensatedBy?: string; timeout?: number }>): PetriNet {
    const places = new Map<string, PetriPlace>();
    const transitions: PetriTransition[] = [];
    const markings = new Map<string, number>();

    places.set('start', { id: 'start', tokens: 1, label: 'Saga Start', type: 'step' });
    markings.set('start', 1);

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const placeId = 'step_' + step.name;
      const compPlaceId = 'comp_' + step.name;
      const failPlaceId = 'fail_' + step.name;

      places.set(placeId, { id: placeId, tokens: 0, label: 'Step: ' + step.name, type: 'step' });
      markings.set(placeId, 0);

      if (step.compensatedBy) {
        places.set(compPlaceId, { id: compPlaceId, tokens: 0, label: 'Comp: ' + step.name, type: 'compensation' });
        markings.set(compPlaceId, 0);
      }

      places.set(failPlaceId, { id: failPlaceId, tokens: 0, label: 'Fail: ' + step.name, type: 'failed' });
      markings.set(failPlaceId, 0);

      const fromPlace = i === 0 ? 'start' : 'step_' + steps[i - 1].name;
      transitions.push({ id: 'exec_' + step.name, from: fromPlace, to: placeId, action: 'execute_' + step.name });
      transitions.push({ id: 'fail_' + step.name, from: fromPlace, to: failPlaceId, action: 'fail_' + step.name });
    }

    const lastPlace = 'step_' + steps[steps.length - 1].name;
    places.set('completed', { id: 'completed', tokens: 0, label: 'Saga Completed', type: 'completed' });
    markings.set('completed', 0);
    transitions.push({ id: 'complete_saga', from: lastPlace, to: 'completed', action: 'complete' });

    for (let i = steps.length - 1; i >= 0; i--) {
      const step = steps[i];
      if (!step.compensatedBy) continue;
      const compPlaceId = 'comp_' + step.name;
      const failTarget = 'fail_' + steps[Math.min(i + 1, steps.length - 1)].name;
      transitions.push({ id: 'compensate_' + step.name, from: failTarget, to: compPlaceId, action: 'compensate_' + step.name });
    }

    const net: PetriNet = { places, transitions, markings };
    this._nets.set(sagaName, net);
    return net;
  }

  verifySafety(sagaName: string, maxSteps: number = 100): SafetyResult {
    const net = this._nets.get(sagaName);
    if (!net) throw new Error('Saga ' + sagaName + ' not found');

    const visited = new Set<string>();
    const queue: Array<{ state: string; markings: Map<string, number> }> = [{
      state: this._markingToString(net.markings),
      markings: new Map(net.markings),
    }];

    let deadlocks = 0;
    let canComplete = false;
    let sites = 0;

    while (queue.length > 0 && sites < maxSteps) {
      const current = queue.shift()!;
      sites++;
      if (visited.has(current.state)) continue;
      visited.add(current.state);

      const enabled = this._findEnabledTransitions(net, current.markings);
      if (enabled.length === 0) {
        if (current.markings.get('completed') === 1) {
          canComplete = true;
        } else {
          deadlocks++;
        }
        continue;
      }

      for (const transition of enabled) {
        const newMarkings = this._fireTransition(current.markings, transition);
        if (newMarkings) {
          queue.push({ state: this._markingToString(newMarkings), markings: newMarkings });
        }
      }
    }

    const compensationComplete = this._verifyCompensationComplete(net);

    return {
      sagaName,
      canComplete,
      deadlocks,
      compensationComplete,
      sitesExplored: sites,
      maxReachableSteps: Math.max(...queue.map(q => q.state.split('|').length), 0),
      hasLivelock: sites >= maxSteps,
      verified: canComplete && compensationComplete && deadlocks === 0,
    };
  }

  private _findEnabledTransitions(net: PetriNet, markings: Map<string, number>): PetriTransition[] {
    return net.transitions.filter(t => {
      const fromTokens = markings.get(t.from) ?? 0;
      if (fromTokens <= 0) return false;
      return !t.guard || t.guard(markings);
    });
  }

  private _fireTransition(markings: Map<string, number>, transition: PetriTransition): Map<string, number> | null {
    const newMarkings = new Map(markings);
    const fromTokens = newMarkings.get(transition.from) ?? 0;
    if (fromTokens <= 0) return null;
    newMarkings.set(transition.from, fromTokens - 1);
    newMarkings.set(transition.to, (newMarkings.get(transition.to) ?? 0) + 1);
    return newMarkings;
  }

  private _markingToString(markings: Map<string, number>): string {
    return Array.from(markings.entries())
      .filter(([_, v]) => v > 0)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => k + ':' + v)
      .join('|');
  }

  private _verifyCompensationComplete(net: PetriNet): boolean {
    const failPlaces = Array.from(net.places.values()).filter(p => p.type === 'failed');
    for (const failPlace of failPlaces) {
      const hasComp = net.transitions.some(t => t.from === failPlace.id);
      if (!hasComp) return false;
    }
    return true;
  }
}