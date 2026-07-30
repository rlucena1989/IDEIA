export type QuestionType = 'rating' | 'text' | 'choice' | 'boolean';

export interface SurveyQuestion {
  id: string;
  type: QuestionType;
  question: string;
  required: boolean;
  options?: string[];
  maxRating?: number;
}

export interface SurveyResponse {
  questionId: string;
  answer: string | number | boolean;
  timestamp: string;
}

export interface SurveyConfig {
  id: string;
  title: string;
  trigger: 'on-complete' | 'on-time' | 'on-nps-drop' | 'manual';
  questions: SurveyQuestion[];
  maxResponses: number;
}

export interface SurveyResult {
  surveyId: string;
  responses: SurveyResponse[];
  sessionId: string;
  completedAt: string;
  npsScore?: number;
}

export class FeedbackSurvey {
  private configs: Map<string, SurveyConfig> = new Map();
  private results: SurveyResult[] = [];

  register(config: SurveyConfig): void {
    this.configs.set(config.id, config);
  }

  getSurvey(surveyId: string): SurveyConfig | undefined {
    return this.configs.get(surveyId);
  }

  async submit(surveyId: string, sessionId: string, answers: Array<{ questionId: string; answer: string | number | boolean }>): Promise<SurveyResult> {
    const survey = this.configs.get(surveyId);
    if (!survey) throw new Error(`Survey ${surveyId} not found`);

    const responses: SurveyResponse[] = answers.map(a => ({
      questionId: a.questionId,
      answer: a.answer,
      timestamp: new Date().toISOString(),
    }));

    const result: SurveyResult = {
      surveyId,
      responses,
      sessionId,
      completedAt: new Date().toISOString(),
      npsScore: this.calculateNPS(responses),
    };

    this.results.push(result);
    if (this.results.length > survey.maxResponses) {
      this.results.shift();
    }

    return result;
  }

  getResults(surveyId?: string): SurveyResult[] {
    if (surveyId) return this.results.filter(r => r.surveyId === surveyId);
    return [...this.results];
  }

  getAggregateNPS(surveyId?: string): number {
    const results = surveyId ? this.results.filter(r => r.surveyId === surveyId) : this.results;
    const scores = results.map(r => r.npsScore).filter((s): s is number => s !== undefined);
    if (scores.length === 0) return 0;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  private calculateNPS(responses: SurveyResponse[]): number | undefined {
    const ratingResponse = responses.find(r => {
      const survey = this.configs.get(r.questionId.split('-')[0]);
      return survey?.questions.find(q => q.id === r.questionId)?.type === 'rating';
    });
    if (!ratingResponse || typeof ratingResponse.answer !== 'number') return undefined;
    if (ratingResponse.answer >= 9) return 100;
    if (ratingResponse.answer >= 7) return 0;
    return -100;
  }
}
