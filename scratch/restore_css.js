const fs = require('fs');
const diffLines = fs.readFileSync('scratch/deleted.txt', 'utf8').split('\n');

let cssToRestore = '';
for (let line of diffLines) {
  // If line starts with '-  ', remove the '-  '.
  // If line starts with '-', remove the '-'.
  if (line.startsWith('-')) {
    cssToRestore += line.substring(1) + '\n';
  }
}

// Ensure the cssToRestore does not have the `.day-dot` class which was intentionally deleted.
// Actually it's fine to restore it since the HTML no longer uses it, but it's harmless.

let indexHtml = fs.readFileSync('public/index.html', 'utf8');

// We will insert cssToRestore right before the PRELOADER comment.
if (indexHtml.includes('/* ── PRELOADER ── */')) {
  indexHtml = indexHtml.replace('/* ── PRELOADER ── */', cssToRestore + '\n  /* ── PRELOADER ── */');
  fs.writeFileSync('public/index.html', indexHtml);
  console.log('Restored all deleted CSS successfully!');
} else {
  console.log('Error: Could not find insertion point.');
}
