// Writes assets/PROMPTS.md from the asset catalogue. Run: node scripts/gen-prompts.mjs
import { writeFileSync } from 'fs';
import { buildCatalog, CATEGORIES, STYLE, NEGATIVE } from '../js/data/assetCatalog.js';
const cat = buildCatalog();
let md = `# Prompt-pakke til billeder\n\nBrug én og samme stil til alle billeder, så de hænger sammen. Gem hvert billede med det angivne filnavn (eller importér dem i spillets Grafikværksted, hvor du kan vælge pladsen manuelt).\n\n**Fælles stil (er allerede indsat i hver prompt):**\n\n> ${STYLE}\n\n**Negativ prompt (hvis værktøjet understøtter det):** ${NEGATIVE}\n\nBilleder med magenta baggrund får baggrunden fjernet automatisk ved import. Billedet må gerne være større end den angivne størrelse; det beskæres og skaleres automatisk.\n\n`;
for (const c of CATEGORIES) {
  md += `\n## ${c}\n\n`;
  for (const s of cat.filter((x) => x.category === c)) {
    md += `### ${s.label}\n- Filnavn: \`assets/${s.key}.png\`\n- Størrelse: mindst ${s.size[0]}×${s.size[1]} px${s.keying ? ', magenta baggrund' : ''}\n\n\`\`\`\n${s.prompt}\n\`\`\`\n\n`;
  }
}
writeFileSync(new URL('../assets/PROMPTS.md', import.meta.url), md);
console.log('wrote assets/PROMPTS.md with', cat.length, 'prompts');
