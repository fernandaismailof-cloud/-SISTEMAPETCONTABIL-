import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let db: any;
let auth: any;
let googleProvider: any;

try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
} catch (error) {
  console.error("Erro ao inicializar Firebase. Verifique se o arquivo firebase-applet-config.json está correto.", error);
}

export { db, auth, googleProvider };

export const signInWithGoogle = async () => {
  if (!auth) {
    const error = "Firebase não inicializado. Verifique as configurações.";
    console.error(error);
    throw new Error(error);
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result;
  } catch (error: any) {
    console.error("Erro no login Google:", error);
    // Erros comuns: auth/unauthorized-domain ou auth/popup-blocked
    throw error;
  }
};

// Connection test
async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
