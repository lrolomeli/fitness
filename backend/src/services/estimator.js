// Estimador aproximado de macros a partir de ingredientes.
// Tabla local (kcal / proteína / carbos / grasa por 100 g) + parser de cantidades.
// No pretende ser exacto: es un respaldo cuando la fuente no trae nutrición.

// `serving_g` = gramos por "pieza" cuando la medida no indica unidad.
const TABLE = [
  { match: ['peanut butter', 'crema de cacahuate', 'mantequilla de mani'], per100: { kcal: 588, p: 25, c: 20, f: 50 }, serving_g: 15 },
  { match: ['chicken breast', 'pechuga'], per100: { kcal: 165, p: 31, c: 0, f: 3.6 }, serving_g: 170 },
  { match: ['chicken thigh', 'muslo'], per100: { kcal: 209, p: 26, c: 0, f: 11 }, serving_g: 130 },
  { match: ['chicken', 'pollo'], per100: { kcal: 190, p: 28, c: 0, f: 8 }, serving_g: 150 },
  { match: ['ground beef', 'minced beef', 'carne molida'], per100: { kcal: 250, p: 26, c: 0, f: 15 }, serving_g: 150 },
  { match: ['beef', 'steak', 'res', 'carne de res'], per100: { kcal: 250, p: 26, c: 0, f: 15 }, serving_g: 150 },
  { match: ['pork', 'cerdo', 'puerco'], per100: { kcal: 242, p: 27, c: 0, f: 14 }, serving_g: 150 },
  { match: ['lamb', 'cordero'], per100: { kcal: 294, p: 25, c: 0, f: 21 }, serving_g: 150 },
  { match: ['bacon', 'tocino'], per100: { kcal: 541, p: 37, c: 1.4, f: 42 }, serving_g: 15 },
  { match: ['turkey', 'pavo'], per100: { kcal: 135, p: 29, c: 0, f: 1 }, serving_g: 150 },
  { match: ['ham', 'jamon', 'jamón'], per100: { kcal: 145, p: 18, c: 1.5, f: 7 }, serving_g: 40 },
  { match: ['sausage', 'salchicha', 'chorizo'], per100: { kcal: 300, p: 15, c: 2, f: 26 }, serving_g: 60 },
  { match: ['salmon', 'salmón'], per100: { kcal: 208, p: 20, c: 0, f: 13 }, serving_g: 150 },
  { match: ['tuna', 'atun', 'atún'], per100: { kcal: 132, p: 28, c: 0, f: 1 }, serving_g: 120 },
  { match: ['shrimp', 'prawn', 'camaron', 'camarón'], per100: { kcal: 99, p: 24, c: 0.2, f: 0.3 }, serving_g: 100 },
  { match: ['cod', 'fish', 'pescado', 'tilapia'], per100: { kcal: 90, p: 19, c: 0, f: 1 }, serving_g: 150 },
  { match: ['egg white', 'claras'], per100: { kcal: 52, p: 11, c: 0.7, f: 0.2 }, serving_g: 33 },
  { match: ['egg', 'huevo'], per100: { kcal: 155, p: 13, c: 1.1, f: 11 }, serving_g: 50 },
  { match: ['greek yogurt', 'yogur griego'], per100: { kcal: 59, p: 10, c: 3.6, f: 0.4 }, serving_g: 170 },
  { match: ['yogurt', 'yoghurt', 'yogur'], per100: { kcal: 61, p: 3.5, c: 4.7, f: 3.3 }, serving_g: 170 },
  { match: ['cream', 'crema'], per100: { kcal: 340, p: 2.1, c: 2.8, f: 36 }, serving_g: 30 },
  { match: ['milk', 'leche'], per100: { kcal: 42, p: 3.4, c: 5, f: 1 }, serving_g: 240 },
  { match: ['cheddar', 'cheese', 'queso'], per100: { kcal: 402, p: 25, c: 1.3, f: 33 }, serving_g: 30 },
  { match: ['butter', 'mantequilla'], per100: { kcal: 717, p: 0.9, c: 0.1, f: 81 }, serving_g: 10 },
  { match: ['olive oil', 'oil', 'aceite'], per100: { kcal: 884, p: 0, c: 0, f: 100 }, serving_g: 10 },
  { match: ['protein powder', 'whey', 'proteina', 'proteína'], per100: { kcal: 400, p: 80, c: 8, f: 6 }, serving_g: 30 },
  { match: ['tofu'], per100: { kcal: 76, p: 8, c: 1.9, f: 4.8 }, serving_g: 120 },
  { match: ['pasta', 'spaghetti', 'macarron', 'macarrón', 'fideo'], per100: { kcal: 360, p: 12, c: 73, f: 1.5 }, serving_g: 80 },
  { match: ['rice', 'arroz'], per100: { kcal: 350, p: 7, c: 78, f: 0.6 }, serving_g: 80 },
  { match: ['quinoa'], per100: { kcal: 368, p: 14, c: 64, f: 6 }, serving_g: 80 },
  { match: ['oat', 'avena'], per100: { kcal: 389, p: 17, c: 66, f: 7 }, serving_g: 40 },
  { match: ['bread', 'pan'], per100: { kcal: 265, p: 9, c: 49, f: 3.2 }, serving_g: 30 },
  { match: ['tortilla'], per100: { kcal: 300, p: 8, c: 50, f: 8 }, serving_g: 40 },
  { match: ['flour', 'harina'], per100: { kcal: 364, p: 10, c: 76, f: 1 }, serving_g: 30 },
  { match: ['sweet potato', 'camote', 'batata'], per100: { kcal: 86, p: 1.6, c: 20, f: 0.1 }, serving_g: 150 },
  { match: ['potato', 'papa', 'patata'], per100: { kcal: 77, p: 2, c: 17, f: 0.1 }, serving_g: 150 },
  { match: ['chickpea', 'garbanzo'], per100: { kcal: 164, p: 8.9, c: 27, f: 2.6 }, serving_g: 120 },
  { match: ['lentil', 'lenteja'], per100: { kcal: 116, p: 9, c: 20, f: 0.4 }, serving_g: 120 },
  { match: ['bean', 'frijol', 'alubia'], per100: { kcal: 127, p: 8.9, c: 23, f: 0.5 }, serving_g: 120 },
  { match: ['corn', 'maiz', 'maíz'], per100: { kcal: 96, p: 3.4, c: 21, f: 1.5 }, serving_g: 100 },
  { match: ['avocado', 'aguacate'], per100: { kcal: 160, p: 2, c: 9, f: 15 }, serving_g: 100 },
  { match: ['banana', 'platano', 'plátano'], per100: { kcal: 89, p: 1.1, c: 23, f: 0.3 }, serving_g: 118 },
  { match: ['apple', 'manzana'], per100: { kcal: 52, p: 0.3, c: 14, f: 0.2 }, serving_g: 180 },
  { match: ['orange', 'naranja'], per100: { kcal: 47, p: 0.9, c: 12, f: 0.1 }, serving_g: 130 },
  { match: ['strawberr', 'berry', 'fresa', 'frutos rojos'], per100: { kcal: 32, p: 0.7, c: 8, f: 0.3 }, serving_g: 100 },
  { match: ['almond', 'walnut', 'nut', 'nuez', 'almendra'], per100: { kcal: 600, p: 20, c: 20, f: 55 }, serving_g: 30 },
  { match: ['honey', 'miel'], per100: { kcal: 304, p: 0.3, c: 82, f: 0 }, serving_g: 20 },
  { match: ['sugar', 'azucar', 'azúcar'], per100: { kcal: 387, p: 0, c: 100, f: 0 }, serving_g: 5 },
  { match: ['soy sauce', 'soja', 'soya'], per100: { kcal: 53, p: 8, c: 5, f: 0 }, serving_g: 15 },
  { match: ['mayonnaise', 'mayonesa'], per100: { kcal: 680, p: 1, c: 0.6, f: 75 }, serving_g: 15 },
  { match: ['ketchup', 'catsup'], per100: { kcal: 101, p: 1, c: 26, f: 0.1 }, serving_g: 15 },
  { match: ['tomato', 'jitomate', 'tomate'], per100: { kcal: 18, p: 0.9, c: 3.9, f: 0.2 }, serving_g: 120 },
  { match: ['onion', 'cebolla'], per100: { kcal: 40, p: 1.1, c: 9, f: 0.1 }, serving_g: 110 },
  { match: ['garlic', 'ajo'], per100: { kcal: 149, p: 6, c: 33, f: 0.5 }, serving_g: 3 },
  { match: ['pepper', 'pimiento', 'pimenton', 'pimentón'], per100: { kcal: 31, p: 1, c: 6, f: 0.3 }, serving_g: 120 },
  { match: ['carrot', 'zanahoria'], per100: { kcal: 41, p: 0.9, c: 10, f: 0.2 }, serving_g: 80 },
  { match: ['broccoli', 'brocoli', 'brócoli'], per100: { kcal: 34, p: 2.8, c: 7, f: 0.4 }, serving_g: 120 },
  { match: ['spinach', 'espinaca'], per100: { kcal: 23, p: 2.9, c: 3.6, f: 0.4 }, serving_g: 80 },
  { match: ['lettuce', 'lechuga'], per100: { kcal: 15, p: 1.4, c: 2.9, f: 0.2 }, serving_g: 60 },
  { match: ['cucumber', 'pepino'], per100: { kcal: 15, p: 0.7, c: 3.6, f: 0.1 }, serving_g: 100 },
  { match: ['mushroom', 'champiñon', 'champiñón', 'hongo'], per100: { kcal: 22, p: 3.1, c: 3.3, f: 0.3 }, serving_g: 80 },
  { match: ['lemon', 'lime', 'limon', 'limón'], per100: { kcal: 29, p: 1, c: 9, f: 0.3 }, serving_g: 60 },
  { match: ['broth', 'stock', 'caldo'], per100: { kcal: 15, p: 1, c: 1, f: 0.5 }, serving_g: 240 },
  { match: ['wine', 'vino'], per100: { kcal: 83, p: 0.1, c: 2.6, f: 0 }, serving_g: 150 },
  { match: ['water', 'agua', 'salt', 'sal', 'spice', 'herb', 'especia', 'hierba', 'pepper corn', 'seasoning'], per100: { kcal: 0, p: 0, c: 0, f: 0 }, serving_g: 5 },
];

const DEFAULT_ENTRY = { per100: { kcal: 150, p: 8, c: 15, f: 5 }, serving_g: 100 };

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function matchIngredient(name) {
  const n = normalize(name);
  return TABLE.find((entry) => entry.match.some((kw) => n.includes(normalize(kw)))) || DEFAULT_ENTRY;
}

function parseAmount(text) {
  const s = String(text || '').trim();
  let m = s.match(/^(\d+)\s+(\d+)\/(\d+)/);
  if (m) return parseInt(m[1], 10) + parseInt(m[2], 10) / parseInt(m[3], 10);
  m = s.match(/^(\d+)\/(\d+)/);
  if (m) return parseInt(m[1], 10) / parseInt(m[2], 10);
  m = s.match(/^(\d+(?:[.,]\d+)?)/);
  if (m) return parseFloat(m[1].replace(',', '.'));
  return null;
}

function measureToGrams(measure, entry) {
  const m = normalize(measure);
  const amount = parseAmount(m);

  if (amount == null) {
    if (/pinch|pizca/.test(m)) return 1;
    return entry.serving_g;
  }

  if (/kg|kilo/.test(m)) return amount * 1000;
  if (/\bml\b|millilit/.test(m)) return amount;
  if (/\bl\b|liter|litro/.test(m)) return amount * 1000;
  if (/cup|taza/.test(m)) return amount * 240;
  if (/tbsp|tbs|cuchar/.test(m) && !/cucharadita/.test(m)) return amount * 15;
  if (/tsp|cucharadita/.test(m)) return amount * 5;
  if (/oz|ounce/.test(m)) return amount * 28.35;
  if (/l(b|bs|ibra|ibra)/.test(m) && !/tbsp/.test(m)) return amount * 453.6;
  if (/clove|diente/.test(m)) return amount * 3;
  if (/slice|rebanad/.test(m)) return amount * (entry.serving_g || 30);
  if (/can|lata/.test(m)) return amount * 400;
  if (/sprig|rama/.test(m)) return amount * 5;
  if (/handful|punado|puñado/.test(m)) return amount * 30;
  if (/\bg\b|gr|gram/.test(m)) return amount;

  if (amount >= 25) return amount; // se asume gramos
  return amount * entry.serving_g; // "piezas"
}

function splitString(text) {
  const s = String(text || '').trim();
  const m = s.match(
    /^([0-9.,/]+\s*(?:kg|g|gr|grams?|ml|l|liters?|cups?|tbsp|tbs|tsp|oz|lbs?|cloves?|slices?|cans?|tazas?|cucharaditas?|cucharadas?)?)\s+(.+)$/i
  );
  if (m && parseAmount(m[1]) != null) {
    return { measure: m[1].trim(), name: m[2].trim() };
  }
  return { measure: '', name: s };
}

// Devuelve solo el nombre del ingrediente, sin cantidad ni unidad.
// "170g pechuga de pollo" → "pechuga de pollo"; "2 rebanadas de pan" → "pan".
function ingredientName(text) {
  const original = String(text || '').trim();
  if (!original) return '';
  const stripped = original
    .replace(
      /^[\d.,/]+\s*(?:(?:kg|kilos?|g|gr|gramos?|mg|ml|mililitros?|l|litros?|oz|onzas?|lbs?|libras?|tazas?|cups?|cucharadas?|cucharaditas?|cdas?|cdtas?|tbsp|tbs|tsp|rebanadas?|rodajas?|latas?|dientes?|piezas?|unidades?|porciones?|pu[nñ]ados?|manojos?|ramas?|scoops?|sobres?)\b)?\s*(?:de\s+)?/i,
      ''
    )
    .replace(/^(?:pizca|chorrito|al gusto|a gusto)(?:\s+de)?\s*/i, '')
    .trim();
  return stripped || original;
}

// Acepta strings ("200g arroz") o {name, measure}.
function estimateMacros(ingredients) {
  const totals = { kcal: 0, p: 0, c: 0, f: 0 };

  (ingredients || []).forEach((item) => {
    let name;
    let measure;
    if (typeof item === 'string') {
      ({ name, measure } = splitString(item));
    } else {
      name = item.name;
      measure = item.measure;
    }
    if (!name) return;
    const entry = matchIngredient(name);
    const grams = measureToGrams(measure, entry);
    const factor = grams / 100;
    totals.kcal += entry.per100.kcal * factor;
    totals.p += entry.per100.p * factor;
    totals.c += entry.per100.c * factor;
    totals.f += entry.per100.f * factor;
  });

  return {
    kcal: Math.round(totals.kcal),
    protein_g: Math.round(totals.p),
    carbs_g: Math.round(totals.c),
    fat_g: Math.round(totals.f),
  };
}

module.exports = { estimateMacros, matchIngredient, ingredientName };
