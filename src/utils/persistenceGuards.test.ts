// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  canApplyLocalFallback,
  shouldCloseReceiveModal,
  shouldApplyLocalState,
  persistenceSuccess,
  persistenceFailure,
} from './persistenceGuards';

describe('persistenceGuards', () => {
  describe('canApplyLocalFallback', () => {
    it('permite fallback local só quando backend NÃO está configurado', () => {
      expect(canApplyLocalFallback(false)).toBe(true);
      expect(canApplyLocalFallback(true)).toBe(false);
    });
  });

  describe('shouldCloseReceiveModal', () => {
    it('fecha o modal apenas em sucesso', () => {
      expect(shouldCloseReceiveModal(persistenceSuccess())).toBe(true);
      expect(shouldCloseReceiveModal(persistenceSuccess('aviso'))).toBe(true);
      expect(shouldCloseReceiveModal(persistenceFailure('falha'))).toBe(false);
    });
  });

  describe('shouldApplyLocalState', () => {
    it('com backend: aplica local só se API confirmou', () => {
      expect(
        shouldApplyLocalState({ backendConfigured: true, backendSucceeded: true })
      ).toBe(true);
      expect(
        shouldApplyLocalState({ backendConfigured: true, backendSucceeded: false })
      ).toBe(false);
    });

    it('sem backend: sempre aplica local (modo offline/dev)', () => {
      expect(
        shouldApplyLocalState({ backendConfigured: false, backendSucceeded: false })
      ).toBe(true);
      expect(
        shouldApplyLocalState({ backendConfigured: false, backendSucceeded: true })
      ).toBe(true);
    });
  });
});
