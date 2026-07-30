import { DefaultTitleBar } from '../title-bar';

describe('DefaultTitleBar', () => {
  let titleBar: DefaultTitleBar;

  beforeEach(() => {
    titleBar = new DefaultTitleBar();
  });

  it('should start with default title', () => {
    expect(titleBar.getTitle()).toBe('IDEIA');
  });

  it('should set a custom title', () => {
    titleBar.setTitle('My Project - IDEIA');
    expect(titleBar.getTitle()).toBe('My Project - IDEIA');
  });

  it('should set icon', () => {
    expect(titleBar.getIcon()).toBe('');
    titleBar.setIcon('fa-code');
    expect(titleBar.getIcon()).toBe('fa-code');
  });

  it('should replace title on subsequent calls', () => {
    titleBar.setTitle('First');
    titleBar.setTitle('Second');
    expect(titleBar.getTitle()).toBe('Second');
  });

  it('should replace icon on subsequent calls', () => {
    titleBar.setIcon('fa-folder');
    titleBar.setIcon('fa-file');
    expect(titleBar.getIcon()).toBe('fa-file');
  });

  it('should be visible by default', () => {
    expect(titleBar.isVisible()).toBe(true);
  });

  it('should hide', () => {
    titleBar.hide();
    expect(titleBar.isVisible()).toBe(false);
  });

  it('should show after hide', () => {
    titleBar.hide();
    titleBar.show();
    expect(titleBar.isVisible()).toBe(true);
  });

  it('should allow empty string as title', () => {
    titleBar.setTitle('');
    expect(titleBar.getTitle()).toBe('');
  });

  it('should allow empty string as icon', () => {
    titleBar.setIcon('');
    expect(titleBar.getIcon()).toBe('');
  });

  it('should not throw on multiple show calls', () => {
    titleBar.show();
    titleBar.show();
    expect(titleBar.isVisible()).toBe(true);
  });

  it('should not throw on multiple hide calls', () => {
    titleBar.hide();
    titleBar.hide();
    expect(titleBar.isVisible()).toBe(false);
  });
});
