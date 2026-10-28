import { createAuthClient } from "better-auth/react";
import { jwtClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL:
    import.meta.env.SERVER_URL ||
    import.meta.env.VITE_SERVER_URL ||
    "http://localhost:4000",
  plugins: [
    jwtClient(),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
export default authClient;
