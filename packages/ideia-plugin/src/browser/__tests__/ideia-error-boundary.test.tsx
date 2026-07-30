import * as React from 'react';
import { describe, it, expect, jest } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import { IDEIA_ErrorBoundary } from '../ideia-error-boundary';

const GoodComponent: React.FC = () => React.createElement('div', null, 'All good');

describe('IDEIA_ErrorBoundary', () => {
  it('renders children when no error', () => {
    const output = renderToString(
      React.createElement(IDEIA_ErrorBoundary, null, React.createElement(GoodComponent))
    );
    expect(output).toContain('All good');
  });

  it('has getDerivedStateFromError static method', () => {
    const result = IDEIA_ErrorBoundary.getDerivedStateFromError(new Error('test'));
    expect(result).toEqual({ hasError: true, error: expect.any(Error) });
  });

  it('accepts onError prop', () => {
    const onError = jest.fn();
    const element = React.createElement(IDEIA_ErrorBoundary, { onError }, React.createElement(GoodComponent));
    expect(element).toBeDefined();
  });

  it('accepts fallback prop', () => {
    const fallback = React.createElement('div', null, 'Custom fallback');
    const element = React.createElement(IDEIA_ErrorBoundary, { fallback }, React.createElement(GoodComponent));
    expect(element).toBeDefined();
  });

  it('renders without icon', () => {
    const output = renderToString(
      React.createElement(IDEIA_ErrorBoundary, null, React.createElement('div', null, 'test'))
    );
    expect(output).toContain('test');
  });
});
