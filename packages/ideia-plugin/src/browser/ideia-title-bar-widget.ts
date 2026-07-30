import { injectable } from '@theia/core/shared/inversify';
import { createLogger } from '@ideia/logger';
const logger = createLogger('browser.ideia-title-bar-widget');
import { Widget } from '@theia/core/shared/@lumino/widgets';

@injectable()
export class IdeiaCustomTitleWidget extends Widget {
  constructor() {
    super();
    this.node.style.cssText = 'display:flex;align-items:center;height:36px;background:#0d0d0d;border-bottom:1px solid rgba(255,255,255,0.04);padding:0 10px;user-select:none;';
  }

  protected override onAfterAttach(): void {
    this.renderTitleBar();
  }

  private renderTitleBar(): void {
    this.node.innerHTML = '';

    const logo = document.createElement('div');
    logo.style.cssText = 'display:flex;align-items:center;gap:8px;font-weight:700;font-size:13px;color:#e0e0e0;flex-shrink:0;';
    const icon = document.createElement('div');
    icon.style.cssText = 'width:18px;height:18px;border-radius:5px;background:#2dd4bf;display:flex;align-items:center;justify-content:center;font-size:10px;color:#0d0d0d;font-weight:800;';
    icon.textContent = 'I';
    logo.appendChild(icon);
    logo.appendChild(document.createTextNode('IDEIA'));
    this.node.appendChild(logo);

    const menus = ['File', 'Edit', 'Selection', 'View', 'Go', 'Run', 'Terminal', 'Help', 'IDEIA'];
    const menuContainer = document.createElement('div');
    menuContainer.style.cssText = 'display:flex;align-items:center;gap:0;margin-left:12px;flex-shrink:0;';

    menus.forEach(menu => {
      const item = document.createElement('div');
      const isIDEIA = menu === 'IDEIA';
      item.style.cssText = `padding:2px 7px;font-size:11.5px;color:${isIDEIA ? '#2dd4bf' : '#888'};cursor:pointer;border-radius:4px;background:${isIDEIA ? 'rgba(45,212,191,0.12)' : 'transparent'};`;
      item.textContent = menu;
      item.onmouseenter = () => { if (!isIDEIA) { item.style.background = 'rgba(255,255,255,0.06)'; item.style.color = '#ddd'; } };
      item.onmouseleave = () => { if (!isIDEIA) { item.style.background = 'transparent'; item.style.color = '#888'; } };
      menuContainer.appendChild(item);
    });
    this.node.appendChild(menuContainer);

    const project = document.createElement('div');
    project.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);font-size:11.5px;color:#777;cursor:pointer;padding:2px 12px;border-radius:4px;white-space:nowrap;';
    const dot = document.createElement('span');
    dot.style.cssText = 'display:inline-block;width:8px;height:8px;border-radius:2px;background:#2dd4bf;margin-right:7px;vertical-align:middle;';
    project.appendChild(dot);
    project.appendChild(document.createTextNode('IDEIA — AI-Powered IDE'));
    project.onmouseenter = () => { project.style.background = 'rgba(255,255,255,0.04)'; project.style.color = '#aaa'; };
    project.onmouseleave = () => { project.style.background = 'transparent'; project.style.color = '#777'; };
    this.node.appendChild(project);

    const controls = document.createElement('div');
    controls.style.cssText = 'display:flex;align-items:center;gap:4px;flex-shrink:0;margin-left:auto;';

    const makeBtn = (text: string, onClick: () => void, hoverBg = 'rgba(255,255,255,0.06)') => {
      const btn = document.createElement('button');
      btn.textContent = text;
      btn.style.cssText = 'background:none;border:none;color:#666;width:30px;height:24px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:11px;border-radius:4px;';
      btn.onmouseenter = () => { btn.style.background = hoverBg; btn.style.color = hoverBg === '#e81123' ? '#fff' : '#ccc'; };
      btn.onmouseleave = () => { btn.style.background = 'transparent'; btn.style.color = '#666'; };
      btn.onclick = onClick;
      return btn;
    };

    controls.appendChild(makeBtn('─', () => logger.info('minimize')));
    controls.appendChild(makeBtn('□', () => logger.info('maximize')));
    controls.appendChild(makeBtn('✕', () => logger.info('close'), '#e81123'));
    this.node.appendChild(controls);
  }
}
