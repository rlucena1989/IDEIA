const mockSpinner = {
  start: () => mockSpinner,
  stop: () => mockSpinner,
  succeed: () => mockSpinner,
  fail: () => mockSpinner,
  warn: () => mockSpinner,
  info: () => mockSpinner,
  stopAndPersist: () => mockSpinner,
  clear: () => mockSpinner,
  render: () => mockSpinner,
  frame: () => mockSpinner,
  text: '',
  color: 'cyan',
  spinner: { interval: 80, frames: ['-'] },
};

const ora = jest.fn(() => mockSpinner);
export default ora;
module.exports = ora;
module.exports.default = ora;
