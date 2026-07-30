import { Thresholds } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('thresholds');

export const defaultThresholds: Thresholds = {
  scorecardMin: 80,
  coverageMin: 80,
  historySuccessMin: 0.8,
  maturityMin: 70
};
