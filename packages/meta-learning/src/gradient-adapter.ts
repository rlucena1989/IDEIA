import { MetaParams, TaskSpecificParams } from './types';

export class GradientAdapter {
  adapt(metaParams: MetaParams, taskGradients: TaskSpecificParams[], learningRate: number): MetaParams {
    const adapted = { ...metaParams, weights: { ...metaParams.weights } };
    for (const key of Object.keys(adapted)) {
      const val = (adapted as unknown as Record<string, unknown>)[key];
      if (typeof val === 'number' && taskGradients.length > 0) {
        let gradSum = 0;
        for (const g of taskGradients) {
          const gVal = (g as unknown as Record<string, unknown>)[key];
          if (typeof gVal === 'number') gradSum += gVal;
        }
        (adapted as unknown as Record<string, number>)[key] = (val as number) - learningRate * (gradSum / taskGradients.length);
      }
    }
    return adapted;
  }

  computeGradients(prediction: number, target: number): number {
    return prediction - target;
  }

  private _cloneMetaParams(params: MetaParams): MetaParams {
    return { ...params, strategies: [...params.strategies], weights: { ...params.weights } };
  }
}