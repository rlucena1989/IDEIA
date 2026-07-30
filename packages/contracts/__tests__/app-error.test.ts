import { describe, it, expect } from '@jest/globals';
import { AppError, NotFoundError, ValidationError, UnauthorizedError, ForbiddenError } from '../src/app-error';

describe('AppError', () => {
  it('creates an error with code and message', () => {
    const err = new AppError('TEST_ERR', 'Test error message');
    expect(err.code).toBe('TEST_ERR');
    expect(err.message).toBe('Test error message');
    expect(err.statusCode).toBe(400);
    expect(err.name).toBe('AppError');
  });

  it('uses provided status code', () => {
    const err = new AppError('NOT_FOUND', 'Not found', 404);
    expect(err.statusCode).toBe(404);
  });

  it('includes optional details', () => {
    const details = { field: 'email', reason: 'invalid format' };
    const err = new AppError('VALIDATION', 'Invalid', 400, details);
    expect(err.details).toEqual(details);
  });

  it('toJSON returns structured error object', () => {
    const err = new AppError('TEST', 'Something went wrong', 500, { debug: 'info' });
    const json = err.toJSON();
    expect(json).toEqual({
      error: true,
      code: 'TEST',
      message: 'Something went wrong',
      statusCode: 500,
      details: { debug: 'info' },
    });
  });
});

describe('NotFoundError', () => {
  it('creates 404 error with resource name', () => {
    const err = new NotFoundError('User');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.statusCode).toBe(404);
    expect(err.message).toContain('User');
  });

  it('includes id in message when provided', () => {
    const err = new NotFoundError('User', '123');
    expect(err.message).toContain("'123'");
  });
});

describe('ValidationError', () => {
  it('creates 400 error with message', () => {
    const err = new ValidationError('Invalid input');
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.statusCode).toBe(400);
  });

  it('includes details when provided', () => {
    const err = new ValidationError('Invalid', { field: 'name', value: '' });
    expect(err.details).toEqual({ field: 'name', value: '' });
  });
});

describe('UnauthorizedError', () => {
  it('creates 401 error with default message', () => {
    const err = new UnauthorizedError();
    expect(err.code).toBe('UNAUTHORIZED');
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Unauthorized');
  });

  it('uses custom message', () => {
    const err = new UnauthorizedError('Access denied');
    expect(err.message).toBe('Access denied');
  });
});

describe('ForbiddenError', () => {
  it('creates 403 error with default message', () => {
    const err = new ForbiddenError();
    expect(err.code).toBe('FORBIDDEN');
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe('Forbidden');
  });
});
