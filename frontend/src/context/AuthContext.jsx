import { createContext, useCallback, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("khata_token"));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("khata_user"));
    } catch {
      return null;
    }
  });

  const login = useCallback((payload) => {
    localStorage.setItem("khata_token", payload.token);
    localStorage.setItem("khata_user", JSON.stringify(payload.user));
    setToken(payload.token);
    setUser(payload.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("khata_token");
    localStorage.removeItem("khata_user");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: Boolean(token),
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

import { useContext } from "react";

export function useAuth() {
  return useContext(AuthContext);
}

export { AuthContext };