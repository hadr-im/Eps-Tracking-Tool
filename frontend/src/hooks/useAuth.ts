import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from '../context/AuthContext';


//  Access the auth context from any component inside <AuthProvider>
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth() must be called inside an <AuthProvider>.');
  }
  return ctx;
}
