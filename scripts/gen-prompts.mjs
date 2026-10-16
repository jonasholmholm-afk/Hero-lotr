// Writes assets/PROMPTS.md from the asset catalogue. Run: node scripts/gen-prompts.mjs
import { writeFileSync } from 'fs';
import { buildCatalog, buildSheets, CATEGORIES, STYLE, NEGATIVE } from '../js/data/assetCatalog.js';
const cat = buildCatalog();
const sheets = buildSheets();
let md = `# Prompt-pakke til billeder\n\n## Ark-prompts (5 motiver pr. billede)\n\n${sheets.length} prompts dækker alle ${cat.length} pladser. Lav ét billede pr. prompt (bredt format, fx 5:2 eller 16:9, så stor opløsning som muligt) og send billederne videre, så bliver de automatisk delt op, renset for magenta baggrund, beskåret og navngivet.\n\n**Negativ prompt (hvis værktøjet understøtter det):** ${NEGATIVE}, overlapping figures, collage frame, grid lines\n\n`;
for (const sh of sheets) {
  md += `### Ark \`${sh.id}\` – ${sh.category} (${sh.n} motiver)\nIndhold fra venstre mod højre: ${sh.slots.map((s, i) => `${i + 1}. ${s.label}`).join(', ')}\n\n\`\`\`\n${sh.prompt}\n\`\`\`\n\n`;
}
md += `\n## Enkelt-prompts (én pr. billede)\n\nBruges hvis et enkelt motiv skal laves om. Fælles stil:\n\n> ${STYLE}\n\n`;
for (const c of CATEGORIES) {
  md += `\n### ${c}\n\n`;
  for (const s of cat.filter((x) => x.category === c)) {
    md += `**${s.label}** – \`assets/${s.key}.png\` (mindst ${s.size[0]}×${s.size[1]} px${s.keying ? ', magenta baggrund' : ''})\n\n\`\`\`\n${s.prompt}\n\`\`\`\n\n`;
  }
}
writeFileSync(new URL('../assets/PROMPTS.md', import.meta.url), md);
console.log('wrote assets/PROMPTS.md:', sheets.length, 'sheet prompts,', cat.length, 'single prompts');
