import { injectable, inject } from '@theia/core/shared/inversify';
import { createLogger } from '@ideia/logger';
import { FrontendApplicationContribution, FrontendApplication } from '@theia/core/lib/browser';
import { ThemeService } from '@theia/core/lib/browser/theming';
import { IDEIA_DARK_THEME } from './ideia-theme-registration';
const logger = createLogger('ideia-lifecycle-contribution');

@injectable()
export class IDEIA_LifecycleContribution implements FrontendApplicationContribution {

  constructor(
    @inject(ThemeService) private readonly themeService: ThemeService,
  ) {}

  async onStart(_app: FrontendApplication): Promise<void> {
    this.themeService.setCurrentTheme(IDEIA_DARK_THEME.id);
  }
}
