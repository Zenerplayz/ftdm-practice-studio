const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
for(const dir of ['dist','backend','scripts','tests'])for(const name of fs.readdirSync(dir))if(/\.(js|mjs|cjs)$/.test(name))execFileSync(process.execPath,['--check',path.join(dir,name)],{stdio:'inherit'});
console.log('JavaScript syntax checks passed.');
