import * as migration_20251228_203635_initial from './20251228_203635_initial';

export const migrations = [
  {
    up: migration_20251228_203635_initial.up,
    down: migration_20251228_203635_initial.down,
    name: '20251228_203635_initial'
  },
];
