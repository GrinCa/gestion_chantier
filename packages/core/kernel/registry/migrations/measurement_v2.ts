/**
 * measurement_v2.ts
 * ---------------------------------------------------------------------------
 * Exemple de migration measurement v1 -> v2 : ajouter unit par défaut 'unitless'
 */
export function migrateMeasurementV2(payload: any, fromVersion: number){
  let v = { ...payload };
  if(fromVersion < 2){
    if(!v.unit) v.unit = 'unitless';
  }
  return v;
}
