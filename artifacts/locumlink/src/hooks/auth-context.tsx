import { createContext } from "react";
import type { CurrentUser, LoginBody, RegisterBody } from "@workspace/api-client-react";

export interface AuthContextType {
  user: CurrentUser | null;
  isLoading: boolean;
  login: (data: LoginBody) => Promise<void>;
  register: (data: RegisterBody) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);
