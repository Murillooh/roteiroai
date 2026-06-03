const fs = require('fs');
const files = ['public/index.html', 'tmp_script.js'];
const key = 'AQ.Ab8RN6KFYRCcPh6P24oJZvE6H5YY2KEktbS3rJn8hKV_Wtp6Jw';

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace the exact usages where we fetch the key
  content = content.replace(/localStorage\.getItem\('google_api_key'\)/g, "(localStorage.getItem('google_api_key') || '" + key + "')");
  
  fs.writeFileSync(file, content);
  console.log('Updated ' + file);
});
