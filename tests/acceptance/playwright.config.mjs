import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'.',testMatch:'acceptance.spec.mjs',workers:1,timeout:60000,
  reporter:[['list'],['html',{outputFolder:'../../playwright-report',open:'never'}]],
  use:{baseURL:'http://127.0.0.1:4178',trace:'retain-on-failure'},
  webServer:{cwd:process.cwd(),command:'npx vite --config tests/acceptance/vite.config.mjs',url:'http://127.0.0.1:4178',reuseExistingServer:false},
});
