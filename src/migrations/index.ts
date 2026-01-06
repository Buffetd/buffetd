import * as migration_20251228_203635_initial from './20251228_203635_initial';
import * as migration_20260106_102528_source_update from './20260106_102528_source_update';

export const migrations = [
  {
    up: migration_20251228_203635_initial.up,
    down: migration_20251228_203635_initial.down,
    name: '20251228_203635_initial',
  },
  {
    up: migration_20260106_102528_source_update.up,
    down: migration_20260106_102528_source_update.down,
    name: '20260106_102528_source_update'
  },
];
