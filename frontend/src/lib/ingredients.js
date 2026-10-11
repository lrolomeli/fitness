// Devuelve solo el nombre del ingrediente, sin cantidad ni unidad.
// "170g pechuga de pollo" → "pechuga de pollo"; "2 rebanadas de pan" → "pan".
// Espejo de `ingredientName` del backend.
const LEADING_MEASURE =
  /^[\d.,/]+\s*(?:(?:kg|kilos?|g|gr|gramos?|mg|ml|mililitros?|l|litros?|oz|onzas?|lbs?|libras?|tazas?|cups?|cucharadas?|cucharaditas?|cdas?|cdtas?|tbsp|tbs|tsp|rebanadas?|rodajas?|latas?|dientes?|piezas?|unidades?|porciones?|pu[nñ]ados?|manojos?|ramas?|scoops?|sobres?)\b)?\s*(?:de\s+)?/i;

const NOISE = /^(?:pizca|chorrito|al gusto|a gusto)(?:\s+de)?\s*/i;

export function ingredientName(text) {
  const original = String(text || '').trim();
  if (!original) return '';
  const stripped = original.replace(LEADING_MEASURE, '').replace(NOISE, '').trim();
  return stripped || original;
}

// Lista única de nombres de ingredientes, sin cantidades ni repetidos.
export function uniqueIngredientNames(ingredients) {
  const seen = new Set();
  const result = [];
  (ingredients || []).forEach((item) => {
    const name = ingredientName(item);
    const key = name.toLowerCase();
    if (!name || seen.has(key)) return;
    seen.add(key);
    result.push(name);
  });
  return result;
}
