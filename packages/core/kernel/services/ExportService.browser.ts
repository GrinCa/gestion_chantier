/**
 * Browser stub for ExportService.
 * Toute tentative d'utilisation sur le bundle browser est bloquée.
 */
export class ExportService {
  constructor() {
    throw new Error('[core/browser] ExportService indisponible dans le bundle browser');
  }
}

export const createExportService = () => new ExportService();
