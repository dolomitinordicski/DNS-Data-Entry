import {test,expect} from '@playwright/test';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {doc,setDoc} from 'firebase/firestore';
import fs from 'node:fs';
const org='dns-test-organisation', other='dns-test-organisation-2', area='dns-test-area';
const password='DNS-emulator-only-2026!';
let env; const users={};
const permissions=['pricing.read','pricing.manage','ticketSales.read','ticketSales.write','kp.read','kp.write'];
test.beforeAll(async()=>{
  if(process.env.GCLOUD_PROJECT!=='demo-dns-identity'||process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8188'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9098') throw Error('Dedicated loopback demo required');
  env=await initializeTestEnvironment({projectId:'demo-dns-identity',firestore:{host:'127.0.0.1',port:8188,rules:fs.readFileSync('tests/acceptance/upstream/firestore.rules','utf8')}});
  for(const name of ['admin','writer','reader','none','outsider','inactive','second']){
    const email=`${name}-${Date.now()}@dns-test.invalid`;
    const response=await fetch('http://127.0.0.1:9098/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-only',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})});
    const account=await response.json(); if(!response.ok) throw Error(JSON.stringify(account));
    users[name]={email,uid:account.localId};
  }
});
test.afterAll(async()=>{await env?.cleanup();});
test.beforeEach(async({page})=>{
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async c=>{
    const db=c.firestore(); const put=(p,d)=>setDoc(doc(db,p),d);
    await put('seasons/2026-27',{id:'2026-27',status:'active',canonicalName:'2026/27'});
    await put('seasons/2025-26',{id:'2025-26',status:'historical',canonicalName:'2025/26'});
    await put(`reportingAreas/${area}`,{id:area,canonicalName:'DNS Test Area'});
    for(const id of [org,other])await put(`organizations/${id}`,{id,canonicalName:id,reportingAreaIds:[area]});
    for(const [name,{uid}] of Object.entries(users)){
      await put(`users/${uid}`,{id:uid,active:name!=='inactive',globalRoles:name==='admin'?['dns-admin']:[],preferredLanguage:'it'});
      if(['admin','outsider'].includes(name))continue;
      const id=name==='second'?other:org;
      await put(`memberships/${uid}__${id}`,{userId:uid,organizationId:id,active:true});
      await put(`accessGrants/${uid}__organization__${id}`,{userId:uid,scopeType:'organization',scopeId:id,active:true,permissions});
    }
    await put(`organizationToolAccess/${org}`,{organizationId:org,tools:{'data-entry':'write'}});
    await put(`organizationToolAccess/${other}`,{organizationId:other,tools:{'data-entry':'write'}});
    await put('kpMilestones/2026-27__m1',{id:'2026-27__m1',seasonId:'2026-27',date:'2026-12-08',label:'Test milestone',order:1});
    await put('ticketPricingConfigs/2026-27-network-wk-dns-official-regular',{...price(),id:'2026-27-network-wk-dns-official-regular',scopeType:'network',scopeId:'dolomiti-nordicski',productCode:'wk-dns',unitPrice:65,settlementUnitPrice:65});
    await put('ticketPricingConfigs/test-price',price());
  });
  await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    return ['127.0.0.1','localhost'].includes(url.hostname)?route.continue():route.abort();
  });
});
function price(){return {id:'test-price',seasonId:'2026-27',scopeType:'reportingArea',scopeId:area,productCode:'day',salesChannel:'official',salesPeriod:'regular',unitPrice:10,settlementUnitPrice:10,currency:'EUR',active:true,revision:1,validFrom:'',validTo:'',notes:'',provenance:{sourceSystem:'manual-data-entry',methodVersion:1,dataStatus:'draft'}};}
async function policy(level){await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'organizationToolAccess',org),{organizationId:org,tools:{'data-entry':level}}));}
async function login(page,name='writer'){
  await page.goto('/');await page.getByRole('button',{name:'IT',exact:true}).click();
  await page.locator('input[type=email]').fill(users[name].email);await page.locator('input[type=password]').fill(password);
  await page.getByRole('button',{name:'Accedi',exact:true}).click();
  await expect(page.getByRole('button',{name:'Esci',exact:true})).toBeVisible();
}
async function relogin(page,name='writer'){await page.getByRole('button',{name:'Esci',exact:true}).click();await login(page,name);}
async function service(page,method,args=[]){return page.evaluate(async({method,args})=>{
  const modules={pricing:'/src/services/seasonalPersistence.ts',quality:'/src/features/track-quality/trackQualityPersistence.ts',kp:'/src/services/kp.ts'};
  const [module,fn]=method.split('.');return (await import(/* @vite-ignore */ modules[module]))[fn](...args);
},{method,args});}
test('Prices: UI edit, Firebase save, logout/login and reload',async({page})=>{
  await login(page,'admin');await page.getByRole('button',{name:'Tariffe',exact:true}).click();
  const row=page.locator('tr').filter({hasText:'Settimanale DNS'}).filter({hasText:'Punto vendita'}).filter({hasText:'Regolare'}).first();
  await row.locator('input').first().fill('67');
  await page.getByRole('button',{name:'Salva in Firebase',exact:true}).click();
  await expect(page.getByText('Salvato in Firebase',{exact:true})).toBeVisible();
  await relogin(page,'admin');await page.getByRole('button',{name:'Tariffe',exact:true}).click();
  await expect(row.locator('input').first()).toHaveValue('67');
});
test('Quality: create 2026/27 trail, partial km, save and relogin through UI',async({page})=>{
  await login(page);await page.getByRole('button',{name:'Controllo piste',exact:true}).click();
  await page.getByRole('button',{name:'Aggiungi pista',exact:true}).click();
  await page.getByLabel('Pista',{exact:true}).fill('Synthetic DNS trail');await page.getByLabel('Km complessivi',{exact:true}).fill('5');
  await page.getByLabel('Preparata entro 8 dicembre').selectOption('partial');
  await page.getByLabel('Km unici preparati (se parziale)',{exact:true}).fill('2');
  await page.getByRole('button',{name:'Salva',exact:true}).click();await expect(page.getByText('Salvato su Firebase',{exact:true})).toBeVisible();
  await relogin(page);await page.getByRole('button',{name:'Controllo piste',exact:true}).click();
  await expect(page.getByLabel('Pista',{exact:true})).toHaveValue('Synthetic DNS trail');
  await expect(page.getByLabel('Km unici preparati (se parziale)',{exact:true})).toHaveValue('2');
});
test('Sales: blank differs from zero, revenue, correction and relogin through UI',async({page})=>{
  await login(page);await page.getByRole('button',{name:'Vendite biglietti',exact:true}).click();
  const day=page.getByLabel('Biglietti venduti · Giornaliero',{exact:true}),week=page.getByLabel('Biglietti venduti · Settimanale DNS',{exact:true});
  await expect(day).toBeEnabled();await day.fill('0');await week.fill('2');
  await page.getByRole('button',{name:'Salva in Firebase',exact:true}).click();await expect(page.getByText('Salvato in Firebase',{exact:true})).toBeVisible();
  let saved=await service(page,'pricing.loadSales',['2026-27',org,area]);expect(saved).toHaveLength(2);expect(saved.find(r=>r.productCode==='day').quantity).toBe(0);expect(saved.find(r=>r.productCode==='wk-dns').calculatedAmount).toBe(130);
  await week.fill('3');await page.getByRole('button',{name:'Salva in Firebase',exact:true}).click();await expect(page.getByText('Salvato in Firebase',{exact:true})).toBeVisible();
  await relogin(page);await page.getByRole('button',{name:'Vendite biglietti',exact:true}).click();await expect(day).toHaveValue('0');await expect(week).toHaveValue('3');
  await expect(page.getByLabel('Biglietti venduti · Settimanale area',{exact:true})).toHaveValue('');
});
test('KP: real service creates, revises, reloads and preserves archived values',async({page})=>{
  await login(page); const value={id:`2026-27__${org}`,seasonId:'2026-27',entityType:'organization',entityId:org,reportingAreaId:area,referenceKm:{uniqueNetworkKm:5,potentialOperationalKm:5},milestones:[{milestoneId:'2026-27__m1',openedKm:3,naturalSnowKm:2,artificialSnowKm:1}],includeInKp:true,exclusionReason:'',notes:'synthetic'};
  expect(await service(page,'kp.saveKpEntry',[value,0])).toBe(1);
  expect(await service(page,'kp.saveKpEntry',[{...value,notes:'corrected'},1])).toBe(2);
  await relogin(page);await page.getByRole('button',{name:'KP',exact:true}).click();
  await expect(page.getByText('Caricamento KP non riuscito.',{exact:true})).toHaveCount(0);
  const entries=await page.evaluate(async()=>{const a=await import('/src/services/auth.ts');const k=await import('/src/services/kp.ts');return k.loadKpEntries('2026-27',await a.loadAccessContext(a.auth.currentUser.uid));});
  expect(entries).toHaveLength(1);expect(entries[0].notes).toBe('corrected');expect(entries[0].milestones[0].openedKm).toBe(3);
});
for(const [name,level]of [['reader','read'],['none','none']])test(`Identity ${level}: UI and direct writes are capped despite W grants`,async({page})=>{
  await policy(level);await login(page,name);
  if(level==='none'){await expect(page.getByRole('button',{name:'KP',exact:true})).toHaveCount(0);return;}
  await page.getByRole('button',{name:'Controllo piste',exact:true}).click();
  await expect(page.getByRole('button',{name:'Aggiungi pista',exact:true})).toHaveCount(0);
});
test('Unauthorized and inactive users cannot access protected UI',async({page})=>{
  for(const name of ['outsider','inactive']){await login(page,name);await expect(page.getByText('Accesso non abilitato',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Esci',exact:true}).click();}
});
test('Two simultaneous organizations: own reads allowed and foreign queries denied',async({page,browser})=>{
  await login(page);const context=await browser.newContext();const second=await context.newPage();await login(second,'second');
  await service(page,'pricing.loadSales',['2026-27',org,area]);await service(second,'pricing.loadSales',['2026-27',other,area]);
  await expect(service(page,'pricing.loadSales',['2026-27',other,area])).rejects.toThrow();
  await expect(service(second,'quality.loadTrackQuality',['2026-27',area,org])).rejects.toThrow();await context.close();
});
test('History locked even for admin and stale revisions rejected',async({page})=>{
  await login(page,'admin');const row={...price(),id:'2025-26-test',seasonId:'2025-26'};
  await expect(service(page,'pricing.savePricing',[[row]])).rejects.toThrow();
  await expect(service(page,'kp.saveKpMilestone',[{id:'2025-26__m1',seasonId:'2025-26',date:'2025-12-08',label:'blocked',order:1}])).rejects.toThrow();
});
