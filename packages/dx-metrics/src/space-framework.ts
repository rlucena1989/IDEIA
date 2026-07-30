export interface SPACEScore {
  satisfaction: number;
  performance: number;
  activity: number;
  communication: number;
  efficiency: number;
  overall: number;
}

export class SPACECalculator {
  async calculate(): Promise<SPACEScore> {
    const satisfaction = 75;
    const performance = 70;
    const activity = 65;
    const communication = 80;
    const efficiency = 72;

    const overall = Math.round(
      satisfaction * 0.25 +
        performance * 0.20 +
        activity * 0.15 +
        communication * 0.20 +
        efficiency * 0.20,
    );

    return { satisfaction, performance, activity, communication, efficiency, overall };
  }
}
