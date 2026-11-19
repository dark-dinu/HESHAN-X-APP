import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyCcvPQLZ2oBm3YUISuuW2rraBVB_lK7ktc',
  authDomain: 'heshan-ofc.firebaseapp.com',
  projectId: 'heshan-ofc',
  storageBucket: 'heshan-ofc.firebasestorage.app',
  messagingSenderId: '671404119380',
  appId: '1:671404119380:web:09aac5109151d6a232a4c1',
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })
