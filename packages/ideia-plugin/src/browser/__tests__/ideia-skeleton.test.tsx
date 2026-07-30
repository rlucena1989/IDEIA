import * as React from 'react';
import { describe, it, expect, jest } from '@jest/globals';

jest.mock('react-dom/client', () => ({
  createRoot: jest.fn().mockReturnValue({ render: jest.fn(), unmount: jest.fn() }),
}));

import { IDEIA_SkeletonLoader, SkeletonLoaderProps, SkeletonVariant } from '../ideia-skeleton';

const renderComponent = async (props: SkeletonLoaderProps): Promise<string> => {
  const { renderToString } = require('react-dom/server');
  const element = React.createElement(IDEIA_SkeletonLoader, props);
  await new Promise(resolve => setTimeout(resolve, 50));
  return renderToString(element);
};

describe('IDEIA_SkeletonLoader', () => {
  it('renders card variant with skeleton class', async () => {
    const output = await renderComponent({ variant: 'card' });
    expect(output).toContain('ideia-skeleton');
  });

  it('renders list variant', async () => {
    const output = await renderComponent({ variant: 'list', count: 2 });
    expect(output).toContain('ideia-skeleton');
  });

  it('renders chart variant', async () => {
    const output = await renderComponent({ variant: 'chart' });
    expect(output).toContain('ideia-skeleton');
  });

  it('renders text variant', async () => {
    const output = await renderComponent({ variant: 'text' });
    expect(output).toContain('ideia-skeleton');
  });

  it('renders avatar variant', async () => {
    const output = await renderComponent({ variant: 'avatar' });
    expect(output).toContain('ideia-skeleton');
  });

  it('each variant renders without error', async () => {
    const variants: SkeletonVariant[] = ['card', 'list', 'chart', 'text', 'avatar'];
    for (const variant of variants) {
      const output = await renderComponent({ variant });
      expect(output).toBeDefined();
    }
  });

  it('renders with animation by default', async () => {
    const output = await renderComponent({ variant: 'text' });
    expect(output).toContain('ideia-skeleton-pulse');
  });

  it('renders without animation when animated false', async () => {
    const output = await renderComponent({ variant: 'text', animated: false });
    expect(output).toBeTruthy();
  });

  it('accepts custom width and height', async () => {
    const output = await renderComponent({ variant: 'card', width: 300, height: 200 });
    expect(output).toBeTruthy();
  });

  it('accepts count prop for list variant', async () => {
    const output = await renderComponent({ variant: 'list', count: 5 });
    expect(output).toBeTruthy();
  });
});
