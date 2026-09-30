import { initializeApp } from 'firebase/app';
import { collection, getDocs, getFirestore } from 'firebase/firestore';
import type { CanonicalRecord, DNSCoreMaster, MasterCollectionName } from '../types/master';

const firebaseConfig = {
  apiKey: 'AIzaSyAgxv6Z45-AfrusbFnCSyvYChRUBu6-vXc',
  authDomain: 'dns-core.firebaseapp.com',
  projectId: 'dns-core',
  storageBucket: 'dns-core.firebasestorage.app',
  messagingSenderId: '387653285986',
  appId: '1:387653285986:web:27ad6f2e9a41ea1aebb93b',
  measurementId: 'G-2G56PRYNME',
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

const collections: MasterCollectionName[] = [
  'reportingAreas',
  'destinations',
  'organizations',
  'organizationRelationships',
  'seasons',
];

async function readCollection(name: MasterCollectionName): Promise<CanonicalRecord[]> {
  const snapshot = await getDocs(collection(db, name));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function loadDNSCoreMaster(): Promise<DNSCoreMaster> {
  const [reportingAreas, destinations, organizations, organizationRelationships, seasons] =
    await Promise.all(collections.map(readCollection));

  return {
    reportingAreas,
    destinations,
    organizations,
    organizationRelationships,
    seasons,
  };
}
