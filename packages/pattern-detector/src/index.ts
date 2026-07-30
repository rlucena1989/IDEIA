export { CrossSessionAnalyzer, createCrossSessionAnalyzer } from './cross-session';
export type { SessionInput, SessionCommand, SessionError, SessionCodeSample } from './cross-session';

export { PatternSuggester, createPatternSuggester } from './pattern-suggester';

export { PatternStore, createPatternStore } from './pattern-store';

export { AdaptiveLearner, createAdaptiveLearner } from './adaptive-learner';

export { FeedbackLoop, createFeedbackLoop } from './feedback-loop';
export type { FeedbackLoopConfig } from './feedback-loop';

export type {
  SessionMetadata,
  RepeatedCommand,
  FrequentError,
  CodePattern,
  PatternSuggestion,
  PatternStoreEntry,
  LearningFeedback,
  AdaptiveRule,
} from './types';

export { wireChatPatternDetector } from './bus-integration';
