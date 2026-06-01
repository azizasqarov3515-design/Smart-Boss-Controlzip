const fs = require('fs');
const path = require('path');
const dir = 'C:\\Users\\ACER ASPIRE\\.gemini\\antigravity\\scratch\\Smart-Boss-Control\\artifacts\\smartboss\\app\\(tabs)';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

files.forEach(f => {
  const p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf8');
  
  // Revert the colors
  content = content.replace(/colors\.cardForeground/g, 'colors.foreground');
  content = content.replace(/colors\.text/g, 'colors.foreground');
  
  fs.writeFileSync(p, content);
});
console.log('Successfully reverted text colors to original.');
