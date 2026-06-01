const { execSync } = require('child_process');

function run(command) {
  console.log(`\x1b[36mRunning: ${command}\x1b[0m`);
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error(`\x1b[31mError executing: ${command}\x1b[0m`);
    process.exit(1);
  }
}

// 1. Sync Capacitor assets to native directories (Android Studio)
console.log('\n\x1b[32m=== 1. Sincronizando arquivos com o Android Studio (Capacitor Sync) ===\x1b[0m');
run('npx cap sync');

// 2. Git staging
console.log('\n\x1b[32m=== 2. Adicionando alterações ao Git ===\x1b[0m');
run('git add .');

// 3. Git commit
// Extract message from arguments if present, else use default timestamp message
const args = process.argv.slice(2);
const defaultMsg = `update: auto-sync ${new Date().toLocaleString('pt-BR')}`;
const commitMsg = args.length > 0 ? args.join(' ') : defaultMsg;

console.log('\n\x1b[32m=== 3. Realizando Commit no Git ===\x1b[0m');
// Escape double quotes in the commit message
const escapedMsg = commitMsg.replace(/"/g, '\\"');
run(`git commit -m "${escapedMsg}"`);

// 4. Git push to GitHub (triggers Vercel deploy)
console.log('\n\x1b[32m=== 4. Enviando atualizações para o GitHub (Push) ===\x1b[0m');
run('git push origin main');

console.log('\n\x1b[32m🎉 Sincronização e deploy concluídos com sucesso!\x1b[0m');
console.log('📱 Android Studio: Atualizado e pronto para compilar.');
console.log('🌐 Web (Vercel): Deploy em andamento no GitHub.\n');
