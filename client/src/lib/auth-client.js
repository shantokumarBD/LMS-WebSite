import { createAuthClient } from "better-auth/react";
import { jwtClient } from "better-auth/client/plugins";

const getServerUrl = () => {
  const url =
    import.meta.env.SERVER_URL ||
    import.meta.env.BACKEND_URL ||
    import.meta.env.VITE_SERVER_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    (import.meta.env.API_URL ? import.meta.env.API_URL.replace(/\/api\/v1\/?$/, "") : null) ||
    "http://localhost:4000";
  return url.replace(/\/+$/, "");
};

export const authClient = createAuthClient({
  baseURL: getServerUrl(),
  plugins: [
    jwtClient(),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
export default authClient;
