import { PermissionTier, PermissionCheck, MCPToolDefinition } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('permission-manager');

export class PermissionManager {
  private _defaultTier: PermissionTier = 'T1';
  private _toolOverrides: Map<string, PermissionTier> = new Map();
  private _userTiers: Map<string, PermissionTier> = new Map();
  private _workspaceTier: PermissionTier = 'T1';

  setDefaultTier(tier: PermissionTier): void { this._defaultTier = tier; }
  getDefaultTier(): PermissionTier { return this._defaultTier; }
  setWorkspaceTier(tier: PermissionTier): void { this._workspaceTier = tier; }
  getWorkspaceTier(): PermissionTier { return this._workspaceTier; }

  setUserTier(user: string, tier: PermissionTier): void {
    this._userTiers.set(user, tier);
  }

  getUserTier(user: string): PermissionTier {
    return this._userTiers.get(user) ?? this._workspaceTier;
  }

  overrideToolPermission(tool: string, tier: PermissionTier): void {
    this._toolOverrides.set(tool, tier);
  }

  getToolPermission(tool: string): PermissionTier {
    return this._toolOverrides.get(tool) ?? this._defaultTier;
  }

  checkToolPermission(tool: MCPToolDefinition, user: string): PermissionCheck {
    const toolTier = this.getToolPermission(tool.name);
    const userTier = this.getUserTier(user);
    const effectiveTier = this._resolveEffectiveTier(toolTier, userTier);
    const allowed = this._tierValue(effectiveTier) >= this._tierValue(tool.permissionTier);
    return {
      allowed,
      tier: effectiveTier,
      approvalRequired: effectiveTier === 'T2' || effectiveTier === 'T3' || effectiveTier === 'T4',
      approvalStrategy: allowed ? this._getApprovalStrategy(effectiveTier) : undefined,
      requiredApprovals: effectiveTier === 'T4' ? 2 : undefined,
      approverPool: effectiveTier === 'T4' ? ['admin-role'] : undefined,
      reason: allowed ? undefined : `User tier ${effectiveTier} insufficient for tool tier ${tool.permissionTier}`,
    };
  }

  checkBulk(tools: MCPToolDefinition[], user: string): PermissionCheck[] {
    return tools.map(t => this.checkToolPermission(t, user));
  }

  resolveUserEffectiveTier(user: string): PermissionTier {
    const userTier = this._userTiers.get(user) ?? this._workspaceTier;
    return this._resolveEffectiveTier(this._defaultTier, userTier);
  }

  clear(): void {
    this._toolOverrides.clear();
    this._userTiers.clear();
    this._defaultTier = 'T1';
    this._workspaceTier = 'T1';
  }

  private _resolveEffectiveTier(toolTier: PermissionTier, userTier: PermissionTier): PermissionTier {
    const order: PermissionTier[] = ['T1', 'T2', 'T3', 'T4'];
    const toolIdx = order.indexOf(toolTier);
    const userIdx = order.indexOf(userTier);
    return userIdx >= toolIdx ? userTier : toolTier;
  }

  private _tierValue(tier: PermissionTier): number {
    const order: PermissionTier[] = ['T1', 'T2', 'T3', 'T4'];
    return order.indexOf(tier);
  }

  private _getApprovalStrategy(tier: PermissionTier): string | undefined {
    switch (tier) {
      case 'T2': return 'user-confirm';
      case 'T3': return 'admin-approve';
      case 'T4': return 'multi-party';
      default: return undefined;
    }
  }
}
