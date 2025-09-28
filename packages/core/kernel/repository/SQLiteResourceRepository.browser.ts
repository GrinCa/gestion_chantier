/**
 * Browser stub for SQLiteResourceRepository.
 * Toute tentative d'utilisation sur le bundle browser lève une erreur explicite.
 */
export function createSQLiteRepository(): never {
  throw new Error('[core/browser] SQLiteResourceRepository indisponible dans le bundle browser');
}

export class SQLiteResourceRepository {
  constructor() {
    throw new Error('[core/browser] SQLiteResourceRepository indisponible dans le bundle browser');
  }
}
