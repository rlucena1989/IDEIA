import { describe, it, expect, beforeEach } from '@jest/globals';
import { I18n, t, Locale } from '../src/index';

describe('I18n', () => {
  let i18n: I18n;

  beforeEach(() => {
    i18n = new I18n('en-US');
  });

  describe('constructor', () => {
    it('should create i18n instance with default locale', () => {
      const i18n = new I18n();
      expect(i18n).toBeInstanceOf(I18n);
      expect(i18n.getLocale()).toBeDefined();
    });

    it('should create i18n instance with specified locale', () => {
      const i18n = new I18n('pt-BR');
      expect(i18n.getLocale()).toBe('pt-BR');
    });
  });

  describe('t', () => {
    it('should translate simple path', () => {
      const result = i18n.t('common.loading');
      expect(result).toBe('Loading...');
    });

    it('should translate nested path', () => {
      const result = i18n.t('dashboard.title');
      expect(result).toBe('Dashboard');
    });

    it('should return fallback for missing path', () => {
      const result = i18n.t('nonexistent.path', 'fallback');
      expect(result).toBe('fallback');
    });

    it('should return path as fallback when no fallback provided', () => {
      const result = i18n.t('nonexistent.path');
      expect(result).toBe('nonexistent.path');
    });
  });

  describe('setLocale', () => {
    it('should change locale', () => {
      i18n.setLocale('pt-BR');
      expect(i18n.getLocale()).toBe('pt-BR');
      expect(i18n.t('common.loading')).toBe('Carregando...');
    });

    it('should change to Spanish', () => {
      i18n.setLocale('es');
      expect(i18n.getLocale()).toBe('es');
      expect(i18n.t('common.loading')).toBe('Cargando...');
    });
  });

  describe('getLocale', () => {
    it('should return current locale', () => {
      expect(i18n.getLocale()).toBe('en-US');
    });
  });

  describe('getAvailableLocales', () => {
    it('should return available locales', () => {
      const locales = i18n.getAvailableLocales();
      expect(locales).toHaveLength(3);
      expect(locales[0].code).toBe('pt-BR');
      expect(locales[1].code).toBe('en-US');
      expect(locales[2].code).toBe('es');
    });
  });

  describe('global t function', () => {
    it('should translate using global instance', () => {
      const result = t('common.success');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });
});
