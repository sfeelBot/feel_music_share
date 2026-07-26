import {describe, expect, it} from '@jest/globals';
import {
  canResignAdmin,
  canSwitchService,
  oppositeService,
  roleDisplayLabel,
  serviceLabel,
  shouldShowServiceSwitch,
} from '../src/state/sessionPermissions';

describe('sessionPermissions.canSwitchService', () => {
  it('allows the host', () => {
    expect(canSwitchService('host')).toBe(true);
  });

  it('allows an admin', () => {
    expect(canSwitchService('admin')).toBe(true);
  });

  it('disallows a regular participant (US-208)', () => {
    expect(canSwitchService('regular')).toBe(false);
  });
});

describe('sessionPermissions.canResignAdmin', () => {
  it('is only true for admins (02-key-ui-patterns.md 6.4a)', () => {
    expect(canResignAdmin('admin')).toBe(true);
    expect(canResignAdmin('host')).toBe(false);
    expect(canResignAdmin('regular')).toBe(false);
  });
});

describe('sessionPermissions.shouldShowServiceSwitch', () => {
  it('shows the service switch item for single-service sessions', () => {
    expect(shouldShowServiceSwitch('spotify')).toBe(true);
    expect(shouldShowServiceSwitch('youtube')).toBe(true);
  });

  it('hides the service switch item entirely for mixed sessions (09문서 결정 3)', () => {
    expect(shouldShowServiceSwitch('mixed')).toBe(false);
  });
});

describe('sessionPermissions.oppositeService', () => {
  it('flips spotify <-> youtube', () => {
    expect(oppositeService('spotify')).toBe('youtube');
    expect(oppositeService('youtube')).toBe('spotify');
  });
});

describe('sessionPermissions.serviceLabel', () => {
  it('renders human-readable labels', () => {
    expect(serviceLabel('spotify')).toBe('Spotify');
    expect(serviceLabel('youtube')).toBe('YouTube');
  });
});

describe('sessionPermissions.roleDisplayLabel', () => {
  it('matches the three wireframe examples in 00-ux-flow.md 2.13', () => {
    expect(roleDisplayLabel('host')).toBe('방장 👑');
    expect(roleDisplayLabel('admin')).toBe('관리자 🛡');
    expect(roleDisplayLabel('regular')).toBe('일반 참여자');
  });
});
