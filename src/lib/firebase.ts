import { initializeApp } from "firebase/app";
import { initializeFirestore, doc, getDocFromServer } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD05J3oxXKCKxGDd9t1ASP0ZESDkH7SpoA",
  authDomain: "gen-lang-client-0904661684.firebaseapp.com",
  projectId: "gen-lang-client-0904661684",
  storageBucket: "gen-lang-client-0904661684.firebasestorage.app",
  messagingSenderId: "222405918795",
  appId: "1:222405918795:web:eb3bf63071aaf8b3474dce"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with the specific custom database ID provisioned as the 3rd parameter
const db = initializeFirestore(app, {}, "ai-studio-a1f49f6d-19e4-4ea4-bedc-d57b34cf00e6");

// Validate connection on startup as required by the Firebase Integration Skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration or network status.", error);
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null, // Roblox authentication is cookie-based, so Firebase Auth is unauthenticated
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export { db };
