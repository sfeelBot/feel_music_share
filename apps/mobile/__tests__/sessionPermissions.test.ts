import {describe, expect, it} from '@jest/globals';
import {canResignAdmin, roleDisplayLabel} from '../src/state/sessionPermissions';

describe('sessionPermissions.canResignAdmin', () => {
  it('is only true for admins (02-key-ui-patterns.md 6.4a)', () => {
    expect(canResignAdmin('admin')).toBe(true);
    expect(canResignAdmin('host')).toBe(false);
    expect(canResignAdmin('regular')).toBe(false);
  });
});

describe('sessionPermissions.roleDisplayLabel', () => {
  it('matches the three wireframe examples in 00-ux-flow.md 2.13', () => {
    expect(roleDisplayLabel('host')).toBe('방장 👑');
    expect(roleDisplayLabel('admin')).toBe('관리자 🛡');
    expect(roleDisplayLabel('regular')).toBe('일반 참여자');
  });
});
