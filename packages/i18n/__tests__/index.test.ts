import { I18n } from '../src/index';

describe('I18n', () => {
  beforeEach(() => {
    process.env.LANG = 'en-US';
  });

  test('constructor detects locale from environment', () => {
    const i18n = new I18n();
    expect(i18n.getLocale()).toBe('en-US');
  });

  test('constructor accepts custom locale', () => {
    const i18n = new I18n('pt-BR');
    expect(i18n.getLocale()).toBe('pt-BR');
  });

  test('t returns translation for valid path in English', () => {
    const i18n = new I18n('en-US');
    expect(i18n.t('common.loading')).toBe('Loading...');
    expect(i18n.t('common.error')).toBe('Error');
  });

  test('t returns fallback for invalid path', () => {
    const i18n = new I18n('en-US');
    expect(i18n.t('nonexistent.path')).toBe('nonexistent.path');
  });

  test('t returns custom fallback for invalid path when provided', () => {
    const i18n = new I18n('en-US');
    expect(i18n.t('nonexistent', 'Custom Fallback')).toBe('Custom Fallback');
  });

  test('t returns translation for nested paths in English', () => {
    const i18n = new I18n('en-US');
    expect(i18n.t('common.save')).toBe('Save');
    expect(i18n.t('common.cancel')).toBe('Cancel');
  });

  test('setLocale changes locale', () => {
    const i18n = new I18n('en-US');
    expect(i18n.t('common.save')).toBe('Save');
    i18n.setLocale('pt-BR');
    expect(i18n.t('common.save')).toBe('Salvar');
    expect(i18n.getLocale()).toBe('pt-BR');
  });

  test('getAvailableLocales returns all locale objects', () => {
    const i18n = new I18n();
    const locales = i18n.getAvailableLocales();
    expect(locales).toHaveLength(3);
    expect(locales[0].code).toBe('pt-BR');
    expect(locales[1].code).toBe('en-US');
    expect(locales[2].code).toBe('es');
  });

  test('detectLocale detects from LANG env', () => {
    process.env.LANG = 'pt_BR.UTF-8';
    const i18n = new I18n();
    expect(i18n.getLocale()).toBe('pt-BR');
  });

  test('pt-BR translations are complete', () => {
    const i18n = new I18n('pt-BR');
    expect(i18n.t('common.save')).toBe('Salvar');
    expect(i18n.t('common.cancel')).toBe('Cancelar');
    expect(i18n.t('common.search')).toBe('Buscar');
  });

  test('es translations are complete', () => {
    const i18n = new I18n('es');
    expect(i18n.t('common.save')).toBe('Guardar');
    expect(i18n.t('common.cancel')).toBe('Cancelar');
  });

  test('setLocale with unknown locale falls back to pt-BR', () => {
    const i18n = new I18n('en-US');
    i18n.setLocale('unknown' as any);
    expect(i18n.getLocale()).toBe('unknown');
    expect(i18n.t('common.save')).toBe('Salvar');
  });

  test('t handles dashboard translations', () => {
    const i18n = new I18n('en-US');
    expect(i18n.t('dashboard.title')).toBe('Dashboard');
    expect(i18n.t('dashboard.activeAgents')).toBe('Active Agents');
  });

  test('t handles notification translations', () => {
    const i18n = new I18n('en-US');
    expect(i18n.t('notifications.title')).toBe('Notifications');
    expect(i18n.t('notifications.noNotifications')).toBe('No notifications');
  });

  test('t returns path for incomplete nested path', () => {
    const i18n = new I18n('en-US');
    expect(i18n.t('common')).toBe('common');
  });
});
