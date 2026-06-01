const fs = require('fs');
const path = require('path');
const dir = 'C:\\Users\\ACER ASPIRE\\.gemini\\antigravity\\scratch\\Smart-Boss-Control\\artifacts\\smartboss\\app\\(tabs)';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

files.forEach(f => {
  const p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf8');
  
  // Replace all colors.foreground with colors.cardForeground
  content = content.replace(/colors\.foreground/g, 'colors.cardForeground');
  
  // Revert specific text elements that are directly on the background to use colors.text (dark)
  content = content.replace(/styles\.emptyTitle,\s*\{\s*color:\s*colors\.cardForeground\s*\}/g, 'styles.emptyTitle, { color: colors.text }');
  content = content.replace(/styles\.sectionTitle,\s*\{\s*color:\s*colors\.cardForeground\s*\}/g, 'styles.sectionTitle, { color: colors.text }');
  content = content.replace(/styles\.title,\s*\{\s*color:\s*colors\.cardForeground\s*\}/g, 'styles.title, { color: colors.text }');
  
  fs.writeFileSync(p, content);
});
console.log('Successfully updated text colors for the new high-contrast card theme.');
