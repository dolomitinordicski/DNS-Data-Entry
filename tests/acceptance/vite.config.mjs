import { defineConfig, mergeConfig } from 'vite';
import base from '../../vite.config';
import { fileURLToPath } from 'node:url';
const replacement = fileURLToPath(new URL('./dnsCore.ts', import.meta.url));
export default mergeConfig(base, defineConfig({
  base: '/',
  plugins: [{name:'isolated-dns-emulators', enforce:'pre', resolveId(source) {
    if (/\/dnsCore$/.test(source)) return replacement;
  }}],
  server:{host:'127.0.0.1',port:4178,strictPort:true},
}));
