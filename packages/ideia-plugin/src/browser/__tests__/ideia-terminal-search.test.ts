import 'jest';
import { IDEIA_TerminalSearch } from '../ideia-terminal-search';

describe('IDEIA_TerminalSearch', () => {
  let widget: IDEIA_TerminalSearch;

  beforeEach(() => {
    jest.clearAllMocks();
    widget = new IDEIA_TerminalSearch();
  });

  it('should have static ID and LABEL', () => {
    expect(IDEIA_TerminalSearch.ID).toBe('ideia:terminal-search');
    expect(IDEIA_TerminalSearch.LABEL).toBe('Terminal Search');
  });

  it('should start hidden', () => {
    expect(widget['visible']).toBe(false);
    expect(widget.node.style.display).toBe('none');
  });

  it.skip('open should show widget (needs jsdom)', () => {
    widget.open();
    expect(widget['visible']).toBe(true);
    expect(widget.node.style.display).toBe('block');
  });

  it.skip('close should hide widget and clear search (needs jsdom)', () => {
    const mockDelegate = { search: jest.fn(), next: jest.fn(), previous: jest.fn(), clearSearch: jest.fn() };
    widget.setDelegate(mockDelegate as never);
    widget.open();
    widget.close();

    expect(widget['visible']).toBe(false);
    expect(widget.node.style.display).toBe('none');
    expect(mockDelegate.clearSearch).toHaveBeenCalled();
  });

  it.skip('toggle should switch visibility (needs jsdom)', () => {
    expect(widget['visible']).toBe(false);
    widget.toggle();
    expect(widget['visible']).toBe(true);
    widget.toggle();
    expect(widget['visible']).toBe(false);
  });

  it('should be a Theia widget with correct id', () => {
    expect(widget.id).toBe('ideia:terminal-search');
  });
});
