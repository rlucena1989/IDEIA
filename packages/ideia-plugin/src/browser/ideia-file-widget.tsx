import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { injectable, inject } from '@theia/core/shared/inversify';
import { BaseWidget } from '@theia/core/lib/browser';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { IDEIA_TASK_SERVICE } from '../common/ideia-protocol';
import { IDEIA_TaskService } from '../common/ideia-protocol';
import { FileChange } from '../common/ideia-types';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  change?: FileChange;
}

@injectable()
export class IDEIA_FileWidget extends BaseWidget {
  static ID = 'ideia:files';
  static LABEL = 'IDEIA Files';

  private root: Root | undefined;
  private files: FileNode[] = [];
  private expandedPaths = new Set<string>();

  constructor(
    @inject(FileService) private fileService: FileService,
    @inject(IDEIA_TASK_SERVICE) private taskService: IDEIA_TaskService,
  ) {
    super();
    this.id = IDEIA_FileWidget.ID;
    this.title.label = IDEIA_FileWidget.LABEL;
    this.title.closable = true;
    this.title.iconClass = 'codicon codicon-files';
    this.node.style.height = '100%';
    this.node.style.overflow = 'hidden';
  }

  setFiles(changes: FileChange[]): void {
    const tree = this.buildTree(changes);
    this.files = tree;
    this.renderReact();
  }

  private buildTree(changes: FileChange[]): FileNode[] {
    const root: FileNode[] = [];
    const _map = new Map<string, FileNode>();

    for (const change of changes) {
      const parts = change.path.replace(/\\/g, '/').split('/');
      let current = root;
      let currentPath = '';

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (i === parts.length - 1) {
          current.push({ name: part, path: currentPath, type: 'file', change });
        } else {
          let existing = current.find(n => n.name === part && n.type === 'directory') as FileNode | undefined;
          if (!existing) {
            existing = { name: part, path: currentPath, type: 'directory', children: [] };
            current.push(existing);
          }
          current = existing.children ?? [];
        }
      }
    }

    return root;
  }

  protected override onAfterAttach(): void {
    this.renderReact();
  }

  protected onDetach(): void {
    if (this.root) {
      this.root.unmount();
      this.root = undefined;
    }
  }

  private renderReact(): void {
    if (!this.root) {
      const container = document.createElement('div');
      container.style.height = '100%';
      container.style.overflow = 'auto';
      this.node.appendChild(container);
      this.root = createRoot(container);
    }
    this.root.render(this.renderComponent());
  }

  private renderComponent(): React.ReactElement {
    if (this.files.length === 0) {
      return (
        <div style={{ padding: '16px', color: 'var(--theia-descriptionForeground)', fontSize: '12px', textAlign: 'center' }}>
          No generated files yet
        </div>
      );
    }

    return (
      <div style={{ padding: '4px 0' }}>
        {this.files.map(node => this.renderNode(node, 0))}
      </div>
    );
  }

  private renderNode(node: FileNode, depth: number): React.ReactElement {
    const isExpanded = this.expandedPaths.has(node.path);
    const isDir = node.type === 'directory';

    return (
      <div key={node.path}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            paddingLeft: `${12 + depth * 16}px`,
            cursor: 'pointer',
            fontSize: '12px',
            borderRadius: '2px',
          }}
          className="theia-TreeNode"
          onClick={() => {
            if (isDir) {
              if (isExpanded) this.expandedPaths.delete(node.path);
              else this.expandedPaths.add(node.path);
              this.renderReact();
            }
          }}
        >
          <span className={`codicon codicon-${isDir ? (isExpanded ? 'chevron-down' : 'chevron-right') : 'file'}`}
                style={{ fontSize: '14px', minWidth: '16px' }} />
          <span style={{
            marginLeft: '2px',
            color: node.change?.status === 'added' ? 'var(--theia-successForeground)' :
                   node.change?.status === 'deleted' ? 'var(--theia-errorForeground)' :
                   node.change?.status === 'modified' ? 'var(--theia-warningForeground)' :
                   'var(--theia-foreground)',
            fontWeight: node.change ? 600 : 400,
          }}>
            {node.name}
          </span>
          {node.change && (
            <span style={{
              fontSize: '9px',
              padding: '1px 4px',
              borderRadius: '3px',
              marginLeft: '4px',
              background: node.change.status === 'added' ? 'var(--theia-successBackground)' :
                          node.change.status === 'deleted' ? 'var(--theia-errorBackground)' :
                          'var(--theia-warningBackground)',
              color: '#fff',
              fontWeight: 600,
            }}>
              {node.change.status === 'added' ? 'NEW' : node.change.status === 'deleted' ? 'DEL' : 'MOD'}
            </span>
          )}
        </div>
        {isDir && isExpanded && node.children?.map(child => this.renderNode(child, depth + 1))}
      </div>
    );
  }
}
