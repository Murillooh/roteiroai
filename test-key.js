const key = 'AQ.Ab8RN6KFYRCcPh6P24oJZvE6H5YY2KEktbS3rJn8hKV_Wtp6Jw';
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ contents: [{ parts: [{ text: 'oi' }] }] })
}).then(async r => {
  console.log(r.status);
  console.log(await r.text());
}).catch(e => console.error(e));
