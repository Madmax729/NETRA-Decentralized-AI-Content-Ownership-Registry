import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export interface WalletState {
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
}

interface WalletContextValue extends WalletState {
  connect: () => Promise<string | null>;
  switchAccount: () => Promise<string | null>;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<WalletState>({ isConnected: false, isConnecting: false, address: null });

  const setAccounts = useCallback((accounts: string[]) => {
    const addr = accounts && accounts.length > 0 ? accounts[0] : null;
    setState((s) => ({ ...s, address: addr, isConnected: !!addr }));
  }, []);

  // Initialize and subscribe to account changes
  useEffect(() => {
    const eth = (window as any).ethereum;
    if (!eth) return;

    // Get current accounts if already connected
    eth
      .request({ method: "eth_accounts" })
      .then((accounts: string[]) => setAccounts(accounts))
      .catch((e: any) => console.error("eth_accounts error", e));

    const onAccountsChanged = (accounts: string[]) => setAccounts(accounts);

    // Subscribe to account changes
    eth.on?.("accountsChanged", onAccountsChanged);

    return () => {
      eth.removeListener?.("accountsChanged", onAccountsChanged);
    };
  }, [setAccounts]);

  const requestAccountsWithPermissions = useCallback(async (): Promise<string[] | null> => {
    const eth = (window as any).ethereum;
    if (!eth) return null;

    // Prefer permission-based flow (shows account picker), but fall back for wallets that don't support it.
    try {
      await eth.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] });
      const accounts: string[] = await eth.request({ method: "eth_accounts" });
      return accounts;
    } catch (e) {
      // Fallback: prompts account selection in most wallets
      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
      return accounts;
    }
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask to connect your wallet");
      return null;
    }
    try {
      setState((s) => ({ ...s, isConnecting: true }));
      // Prefer permission-based flow to always show the account picker
      const accounts = await requestAccountsWithPermissions();
      if (accounts) setAccounts(accounts);
      return accounts?.[0] ?? null;
    } catch (e) {
      console.error("MetaMask connection failed:", e);
      // Fallback to eth_requestAccounts if permissions call was rejected
      try {
        const accounts: string[] = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
        setAccounts(accounts);
        return accounts?.[0] ?? null;
      } catch (err) {
        console.error("eth_requestAccounts failed:", err);
        return null;
      }
    } finally {
      setState((s) => ({ ...s, isConnecting: false }));
    }
  }, [requestAccountsWithPermissions, setAccounts]);

  const switchAccount = useCallback(async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask to connect your wallet");
      return null;
    }

    try {
      setState((s) => ({ ...s, isConnecting: true }));
      const accounts = await requestAccountsWithPermissions();
      if (accounts) setAccounts(accounts);
      return accounts?.[0] ?? null;
    } catch (e) {
      console.error("Switch account failed:", e);
      return null;
    } finally {
      setState((s) => ({ ...s, isConnecting: false }));
    }
  }, [requestAccountsWithPermissions, setAccounts]);

  const value = useMemo<WalletContextValue>(() => ({
    ...state,
    connect,
    switchAccount,
  }), [state, connect, switchAccount]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return ctx;
};
