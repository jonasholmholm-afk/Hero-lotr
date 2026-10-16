// Clears the procedural/asset sprite caches after assets change.
import { clearFigureCache } from './figures.js';
import { clearSpriteCache } from './sprites.js';
import { clearPortraitCache } from './portraits.js';
import { clearIconCache } from './icons.js';
export function clearArtCaches() { clearFigureCache(); clearSpriteCache(); clearPortraitCache(); clearIconCache(); }
