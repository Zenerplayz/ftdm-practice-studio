const fs=require('node:fs');
const value=(process.env.FTDM_API_BASE||'').trim().replace(/\/$/,'');
if(value&&!(new URL(value).protocol==='https:'))throw Error('FTDM_API_BASE must use HTTPS');
fs.writeFileSync('dist/config.js','// Public API address; no credentials.\nwindow.FTDM_API_BASE = '+JSON.stringify(value)+';\n');
