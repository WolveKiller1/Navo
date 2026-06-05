import { useEffect, useState } from 'react';
import {
  getAccountSystemSnapshot,
  initAccountSystem,
  subscribeToAccountSystem
} from '../services/accountSync';

export function useAccountSystem() {
  const [accountSystem, setAccountSystem] = useState(getAccountSystemSnapshot());

  useEffect(() => {
    const unsubscribe = subscribeToAccountSystem(setAccountSystem);
    void initAccountSystem();
    return unsubscribe;
  }, []);

  return accountSystem;
}
