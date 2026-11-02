import {doc,getDoc,setDoc,serverTimestamp} from 'firebase/firestore';
import {db} from '../../src/services/dnsCore';
import {auth} from '../../src/services/auth';
export async function read(path: string) {return (await getDoc(doc(db,path))).data();}
export async function write(path: string, value: Record<string,unknown>) {
  return setDoc(doc(db,path),{...value,updatedBy:auth.currentUser!.uid,updatedAt:serverTimestamp()});
}
