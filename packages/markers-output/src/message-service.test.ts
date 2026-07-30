jest.mock('@ideia/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    child: jest.fn().mockReturnThis(),
  }),
}));

import { DefaultMessageService } from './message-service';

describe('DefaultMessageService', () => {
  let service: DefaultMessageService;

  beforeEach(() => {
    service = new DefaultMessageService();
  });

  it('should handle info messages', async () => {
    const result = await service.info('information');
    expect(result).toBeUndefined();
  });

  it('should handle warn messages', async () => {
    const result = await service.warn('warning');
    expect(result).toBeUndefined();
  });

  it('should handle error messages', async () => {
    const result = await service.error('error');
    expect(result).toBeUndefined();
  });

  it('should process actions when provided', async () => {
    const action = { id: 'act1', label: 'Retry', run: jest.fn() };
    const result = await service.showMessage('error', 'failed', [action]);
    expect(result).toBeUndefined();
  });
});
