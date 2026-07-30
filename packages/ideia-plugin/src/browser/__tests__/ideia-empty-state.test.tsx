import * as React from 'react';
import { describe, it, expect, jest } from '@jest/globals';

jest.mock('react-dom/client', () => ({
  createRoot: jest.fn().mockReturnValue({ render: jest.fn(), unmount: jest.fn() }),
}));

import { IDEIA_EmptyState, EmptyStateProps, EmptyStatePreset } from '../ideia-empty-state';

const renderComponent = (props: EmptyStateProps): string => {
  const { renderToString } = require('react-dom/server');
  return renderToString(React.createElement(IDEIA_EmptyState, props));
};

describe('IDEIA_EmptyState', () => {
  it('renders title and description', () => {
    const output = renderComponent({
      title: 'Test Title',
      description: 'Test Description',
    });
    expect(output).toContain('Test Title');
    expect(output).toContain('Test Description');
  });

  it('renders action button when actionLabel and onAction provided', () => {
    const onAction = jest.fn();
    const output = renderComponent({
      title: 'Title',
      description: 'Desc',
      actionLabel: 'Click Me',
      onAction,
    });
    expect(output).toContain('Click Me');
  });

  it('does not render button when actionLabel missing', () => {
    const output = renderComponent({
      title: 'Title',
      description: 'Desc',
    });
    expect(output).not.toContain('button');
  });

  it('uses preset data when preset is provided without title', () => {
    const output = renderComponent({
      preset: 'noResults',
      title: '',
      description: '',
    });
    expect(output).toContain('Nenhum resultado encontrado');
  });

  it('uses custom title over preset when both provided', () => {
    const output = renderComponent({
      preset: 'noResults',
      title: 'Custom Title',
      description: '',
    });
    expect(output).toContain('Custom Title');
    expect(output).not.toContain('Nenhum resultado encontrado');
  });

  it('each preset has required values', () => {
    const presets: EmptyStatePreset[] = ['noResults', 'noConfig', 'noAgents', 'noData', 'error'];
    for (const preset of presets) {
      const output = renderComponent({ preset, title: '', description: '' });
      expect(output).toBeTruthy();
    }
  });

  it('renders icon class', () => {
    const output = renderComponent({
      title: 'Test',
      description: 'Test',
    });
    expect(output).toContain('codicon');
  });

  it('uses custom icon when provided', () => {
    const output = renderComponent({
      title: 'Test',
      description: 'Test',
      icon: 'custom-icon',
    });
    expect(output).toContain('custom-icon');
  });
});
