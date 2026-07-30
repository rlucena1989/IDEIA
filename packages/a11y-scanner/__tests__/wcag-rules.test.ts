import { A11yScanner } from '../src/a11y-scanner';

describe('WCAG Rules - Individual Rule Tests', () => {
  const scanner = new A11yScanner();

  it('img-alt: should detect missing alt on images', () => {
    const fail = scanner.scanContent('<img src="photo.jpg" />', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'img-alt')).toBe(true);
    const pass = scanner.scanContent('<img src="photo.jpg" alt="Photo" />', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'img-alt')).toBe(false);
  });

  it('input-label: should detect inputs without labels', () => {
    const fail = scanner.scanContent('<input type="text" />', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'input-label')).toBe(true);
    const pass = scanner.scanContent('<input aria-label="Name" />', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'input-label')).toBe(false);
  });

  it('heading-order: should detect skipped heading levels', () => {
    const fail = scanner.scanContent('<h1>Title</h1>\n<h3>Skipped</h3>', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'heading-order')).toBe(true);
    const pass = scanner.scanContent('<h1>Title</h1>\n<h2>Sub</h2>', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'heading-order')).toBe(false);
  });

  it('color-contrast-inline: should detect inline color without background pair', () => {
    const fail = scanner.scanContent('color: #ccc;', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'color-contrast-inline')).toBe(true);
    const pass = scanner.scanContent('color: #000; background: #fff;', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'color-contrast-inline')).toBe(false);
  });

  it('keyboard-nav: should detect click without keyboard handler', () => {
    const fail = scanner.scanContent('onClick={() => handleSubmit()}', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'keyboard-nav')).toBe(true);
    const pass = scanner.scanContent('onClick={handleSubmit} onKeyDown={handleKey}', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'keyboard-nav')).toBe(false);
  });

  it('aria-role: should detect interactive role without accessible name', () => {
    const fail = scanner.scanContent('<div role="button">Click</div>', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'aria-role')).toBe(true);
    const pass = scanner.scanContent('<div role="button" aria-label="Click">Click</div>', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'aria-role')).toBe(false);
  });

  it('focus-order: should detect explicit tabIndex', () => {
    const fail = scanner.scanContent('tabIndex={0}', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'focus-order')).toBe(true);
    const pass = scanner.scanContent('// no tabindex', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'focus-order')).toBe(false);
  });

  it('lang-attr: should detect missing lang on html', () => {
    const fail = scanner.scanContent('<html><head></head></html>', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'lang-attr')).toBe(true);
    const pass = scanner.scanContent('<html lang="en"><head></head></html>', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'lang-attr')).toBe(false);
  });

  it('link-text: should detect empty or generic link text', () => {
    const fail = scanner.scanContent('<a href="/page"></a>', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'link-text')).toBe(true);
    const pass = scanner.scanContent('<a href="/page">Read documentation</a>', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'link-text')).toBe(false);
  });

  it('error-id: should detect inputs without error attributes', () => {
    const fail = scanner.scanContent('<input type="email" />', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'error-id')).toBe(true);
    const pass = scanner.scanContent('<input aria-describedby="error-msg" />', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'error-id')).toBe(false);
  });

  it('focus-visible: should detect removed focus outline', () => {
    const fail = scanner.scanContent(':focus { outline: none; }', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'focus-visible')).toBe(true);
    const pass = scanner.scanContent(':focus { outline: 2px solid blue; }', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'focus-visible')).toBe(false);
  });

  it('landmark: should detect semantic elements without aria labels', () => {
    const fail = scanner.scanContent('<nav>Nav</nav>', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'landmark')).toBe(true);
    const pass = scanner.scanContent('<nav aria-label="Main">Nav</nav>', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'landmark')).toBe(false);
  });

  it('audio-desc: should detect video without audio description', () => {
    const fail = scanner.scanContent('<video src="intro.mp4">Content</video>', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'audio-desc')).toBe(true);
    const pass = scanner.scanContent('<video src="intro.mp4" aria-describedby="desc">Content</video>', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'audio-desc')).toBe(false);
  });

  it('captions: should detect media without captions', () => {
    const fail = scanner.scanContent('<video src="talk.mp4">Talk</video>', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'captions')).toBe(true);
    const pass = scanner.scanContent('<video src="talk.mp4"><track kind="captions" src="en.vtt" /></video>', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'captions')).toBe(false);
  });

  it('media-alt: should detect video without text alternative', () => {
    const fail = scanner.scanContent('<video src="demo.mp4">Demo</video>', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'media-alt')).toBe(true);
    const pass = scanner.scanContent('<video src="demo.mp4" aria-label="Demo video">Demo</video>', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'media-alt')).toBe(false);
  });

  it('resize-text: should detect fixed font-size in px', () => {
    const fail = scanner.scanContent('font-size: 14px;', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'resize-text')).toBe(true);
    const pass = scanner.scanContent('font-size: 1.4rem;', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'resize-text')).toBe(false);
  });

  it('images-text: should detect images of text', () => {
    const fail = scanner.scanContent('<img src="title.png" alt="Welcome Title" />', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'images-text')).toBe(true);
    const pass = scanner.scanContent('<img src="photo.jpg" alt="A landscape" />', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'images-text')).toBe(false);
  });

  it('reflow: should detect fixed width containers', () => {
    const fail = scanner.scanContent('width: 960px;', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'reflow')).toBe(true);
    const pass = scanner.scanContent('width: 100%;', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'reflow')).toBe(false);
  });

  it('motion-animation: should detect animation without reduced-motion', () => {
    const fail = scanner.scanContent('animation: slide 0.3s;', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'motion-animation')).toBe(true);
    const pass = scanner.scanContent('color: blue;', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'motion-animation')).toBe(false);
  });

  it('pointer-cancel: should detect pointer down without cancel handler', () => {
    const fail = scanner.scanContent('onPointerDown={() => dragStart()}', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'pointer-cancel')).toBe(true);
    const pass = scanner.scanContent('onPointerDown={onStart} onPointerUp={onEnd}', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'pointer-cancel')).toBe(false);
  });

  it('target-size: should detect small clickable targets', () => {
    const fail = scanner.scanContent('<button>x</button>', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'target-size')).toBe(true);
    const pass = scanner.scanContent('not a small target', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'target-size')).toBe(false);
  });

  it('pointer-gestures: should detect path-based gestures without alternative', () => {
    const fail = scanner.scanContent('const gesture = "swipe";', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'pointer-gestures')).toBe(true);
    const pass = scanner.scanContent('const gesture = "click";', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'pointer-gestures')).toBe(false);
    const withButton = scanner.scanContent('const gesture = "swipe"; const btn = <button>Alt</button>;', 'test.tsx');
    expect(withButton.some(v => v.ruleId === 'pointer-gestures')).toBe(false);
  });

  it('input-modality: should detect pointer-only events', () => {
    const fail = scanner.scanContent('onClick={handleClick}', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'input-modality')).toBe(true);
    const pass = scanner.scanContent('onClick={handleClick} onKeyDown={handleKey}', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'input-modality')).toBe(false);
  });

  it('input-labels: should detect inputs without labels', () => {
    const fail = scanner.scanContent('<input type="text" />', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'input-labels')).toBe(true);
    const pass = scanner.scanContent('<input id="name" />', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'input-labels')).toBe(false);
  });

  it('input-help: should detect complex inputs without help text', () => {
    const fail = scanner.scanContent('<input type="email" />', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'input-help')).toBe(true);
    const pass = scanner.scanContent('<input type="email" placeholder="you@example.com" />', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'input-help')).toBe(false);
  });

  it('error-prevention: should detect forms without validation handler', () => {
    const fail = scanner.scanContent('<form><input /></form>', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'error-prevention')).toBe(true);
    const pass = scanner.scanContent('<form onSubmit={handleSubmit}><input /></form>', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'error-prevention')).toBe(false);
  });

  it('name-role-value: should detect interactive div without role', () => {
    const fail = scanner.scanContent('<div onClick={() => {}}>Click</div>', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'name-role-value')).toBe(true);
    const pass = scanner.scanContent('<button onClick={() => {}}>Click</button>', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'name-role-value')).toBe(false);
  });

  it('status-messages: should detect dynamic updates without live region', () => {
    const fail = scanner.scanContent('element.textContent = "Loading...";', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'status-messages')).toBe(true);
    const pass = scanner.scanContent('', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'status-messages')).toBe(false);
  });

  it('parsing: should detect duplicate IDs', () => {
    const fail = scanner.scanContent('<div id="dup">a</div>\n<div id="dup">b</div>', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'parsing')).toBe(true);
    const pass = scanner.scanContent('<div id="a">a</div>\n<div id="b">b</div>', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'parsing')).toBe(false);
  });

  it('color-contrast-inline: should detect inline color without background pair', () => {
    const fail = scanner.scanContent('style="color: #333;"', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'color-contrast-inline')).toBe(true);
    const pass = scanner.scanContent('style="color: #333; background: #fff;"', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'color-contrast-inline')).toBe(false);
  });

  it('language: should detect html without lang attribute', () => {
    const fail = scanner.scanContent('<html><head></head></html>', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'language')).toBe(true);
    const pass = scanner.scanContent('<html lang="en"><head></head></html>', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'language')).toBe(false);
  });

  it('meta-viewport: should detect user-scalable=no', () => {
    const fail = scanner.scanContent('<meta name="viewport" content="user-scalable=no, width=device-width" />', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'meta-viewport')).toBe(true);
    const pass = scanner.scanContent('<meta name="viewport" content="width=device-width, initial-scale=1" />', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'meta-viewport')).toBe(false);
  });

  it('meta-viewport: should detect maximum-scale restriction', () => {
    const fail = scanner.scanContent('<meta name="viewport" content="maximum-scale=1, width=device-width" />', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'meta-viewport')).toBe(true);
    const fail2 = scanner.scanContent('<meta name="viewport" content="maximum-scale=0.5" />', 'test.tsx');
    expect(fail2.some(v => v.ruleId === 'meta-viewport')).toBe(true);
  });

  it('autoplay: should detect autoplay media without controls', () => {
    const fail = scanner.scanContent('<video src="intro.mp4" autoplay />', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'autoplay')).toBe(true);
    const pass = scanner.scanContent('<video src="intro.mp4" autoplay controls />', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'autoplay')).toBe(false);
    const noAutoplay = scanner.scanContent('<video src="intro.mp4" controls />', 'test.tsx');
    expect(noAutoplay.some(v => v.ruleId === 'autoplay')).toBe(false);
  });

  it('autoplay: should detect audio autoplay without controls', () => {
    const fail = scanner.scanContent('<audio src="song.mp3" autoplay />', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'autoplay')).toBe(true);
  });

  it('tab-order: should detect positive tabindex', () => {
    const fail = scanner.scanContent('tabIndex={5}', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'tab-order')).toBe(true);
    const fail1 = scanner.scanContent('tabIndex={10}', 'test.tsx');
    expect(fail1.some(v => v.ruleId === 'tab-order')).toBe(true);
    const pass = scanner.scanContent('tabIndex={0}', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'tab-order')).toBe(false);
    const pass2 = scanner.scanContent('tabIndex={-1}', 'test.tsx');
    expect(pass2.some(v => v.ruleId === 'tab-order')).toBe(false);
  });

  it('aria-hidden-focusable: should detect aria-hidden on focusable elements', () => {
    const fail = scanner.scanContent('<button aria-hidden="true">Click</button>', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'aria-hidden-focusable')).toBe(true);
    const failA = scanner.scanContent('<a href="/" aria-hidden="true">Link</a>', 'test.tsx');
    expect(failA.some(v => v.ruleId === 'aria-hidden-focusable')).toBe(true);
    const pass = scanner.scanContent('<div aria-hidden="true">Decorative</div>', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'aria-hidden-focusable')).toBe(false);
  });

  it('target-size-enhanced: should detect small interactive targets', () => {
    const fail = scanner.scanContent('<button>x</button>', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'target-size-enhanced')).toBe(true);
    const pass = scanner.scanContent('not a small element', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'target-size-enhanced')).toBe(false);
  });

  it('reflow-enhanced: should detect fixed wide containers', () => {
    const fail = scanner.scanContent('width: 1200px;', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'reflow-enhanced')).toBe(true);
    const pass = scanner.scanContent('width: 100%; overflow: auto;', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'reflow-enhanced')).toBe(false);
  });

  it('scrollable-region: should detect non-scrollable overflow:hidden containers', () => {
    const fail = scanner.scanContent('overflow: hidden; height: 400px;', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'scrollable-region')).toBe(true);
    const pass = scanner.scanContent('overflow: auto; height: 400px;', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'scrollable-region')).toBe(false);
  });

  it('touch-target: should detect small touch targets', () => {
    const fail = scanner.scanContent('<button>x</button>', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'touch-target')).toBe(true);
    const pass = scanner.scanContent('not a small target', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'touch-target')).toBe(false);
  });

  it('heading-empty: should detect empty headings', () => {
    const fail = scanner.scanContent('<h2></h2>', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'heading-empty')).toBe(true);
    const pass = scanner.scanContent('<h2>Content</h2>', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'heading-empty')).toBe(false);
  });

  it('table-header: should detect tables without th elements', () => {
    const fail = scanner.scanContent('<table><tr><td>Data</td></tr></table>', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'table-header')).toBe(true);
    const pass = scanner.scanContent('<table><tr><th>Header</th></tr></table>', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'table-header')).toBe(false);
  });

  it('css-outline: should detect removed outline without fallback', () => {
    const fail = scanner.scanContent('outline: none;', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'css-outline')).toBe(true);
    const pass = scanner.scanContent('outline: none; :focus-visible { outline: 2px solid; }', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'css-outline')).toBe(false);
  });

  it('autocomplete: should detect inputs missing autocomplete', () => {
    const fail = scanner.scanContent('<input type="text" />', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'autocomplete')).toBe(true);
    const pass = scanner.scanContent('<input type="text" autocomplete="email" />', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'autocomplete')).toBe(false);
  });

  it('link-purpose: should detect links with generic text', () => {
    const fail = scanner.scanContent('<a href="/page">click here</a>', 'test.tsx');
    expect(fail.some(v => v.ruleId === 'link-purpose')).toBe(true);
    const pass = scanner.scanContent('<a href="/page">Read documentation</a>', 'test.tsx');
    expect(pass.some(v => v.ruleId === 'link-purpose')).toBe(false);
  });

  it('score: clean code should have high score', async () => {
    const fs = require('fs');
    const path = require('path');
    const dir = fs.mkdtempSync('a11y-score-');
    fs.writeFileSync(path.join(dir, 'clean.tsx'), '<img src="photo.jpg" alt="Photo" /><input aria-label="Name" /><html lang="en"></html>');
    const report = await scanner.scanDirectory(dir);
    expect(report.score).toBeGreaterThanOrEqual(85);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('score: code with violations should have lowered score', async () => {
    const fs = require('fs');
    const path = require('path');
    const dir = fs.mkdtempSync('a11y-score-low-');
    fs.writeFileSync(path.join(dir, 'bad.tsx'), '<img src="photo.jpg" /><input type="email" /><html><body><div onClick={fn}>Click</div></body></html><video src="intro.mp4"></video><style>font-size: 14px; width: 960px; animation: slide 0.3s;</style>');
    const report = await scanner.scanDirectory(dir);
    expect(report.score).toBeLessThan(85);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('should check 45 rules are registered', () => {
    expect(scanner.getRules().length).toBe(45);
  });
});
