// Test-only replacement. Never imported by the production configuration.
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, collection, getDocs } from 'firebase/firestore';
if (location.hostname !== '127.0.0.1') throw new Error('Loopback required');
export const app = initializeApp({projectId:'demo-dns-identity',apiKey:'demo-only',authDomain:'localhost'},'dns-digital-pass');
export const db = getFirestore(app);
connectFirestoreEmulator(db,'127.0.0.1',8188);
connectAuthEmulator(getAuth(app),'http://127.0.0.1:9098',{disableWarnings:true});
export async function loadDNSCoreMaster() {
  const names = ['reportingAreas','destinations','organizations','organizationRelationships','seasons'];
  return Object.fromEntries(await Promise.all(names.map(async name => [name,
    (await getDocs(collection(db,name))).docs.map(d=>({id:d.id,...d.data()}))])));
}
