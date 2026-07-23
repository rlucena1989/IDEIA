import { MockIOContainer } from '../../io/mock';
import _path from 'node:path';

let _mockIO: MockIOContainer | null = null;

export function useMockIO(): MockIOContainer {
  jest.mock('../../io', () => {
    const _MockContainer = jest.requireActual('../../io/mock').MockIOContainer;
    return {
      __esModule: true,
      getIO: () => {
        if (!_mockIO) _mockIO = new MockIOContainer();
        return _mockIO;
      },
      resetIO: () => { _mockIO = null; },
      createIO: () => {
        if (!_mockIO) _mockIO = new MockIOContainer();
        return _mockIO;
      },
    };
  });
  const io = require('../../io');
  io.resetIO();
  const container = io.getIO() as MockIOContainer;
  container._reset();
  container.setupProject();
  return container;
}

export function getMockIO(): MockIOContainer {
  if (!_mockIO) throw new Error('Call useMockIO() first');
  return _mockIO;
}
