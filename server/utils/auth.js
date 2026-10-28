import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { MongoClient } from "mongodb";
import { jwt } from "better-auth/plugins";
import { bearer } from "better-auth/plugins";
import dotenv from "dotenv";

dotenv.config();

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost:27017/eduhub_lms";
const client = new MongoClient(mongoUrl);
const db = client.db();

export const auth = betterAuth({
  database: mongodbAdapter(db, {
    client,
    usePlural: true,
    transaction: false,
  }),
  baseURL: process.env.BACKEND_URL || "http://localhost:4000",
  secret: process.env.JWT_SECRET || "default_super_secret_jwt_key_at_least_32_chars",
  trustedOrigins: [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    process.env.CLIENT_URL ? process.env.CLIENT_URL.replace(/\/+$/, "") : null,
    (origin) => Boolean(origin && (origin.endsWith(".vercel.app") || origin.includes("vercel.app"))),
  ].filter(Boolean),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? {
          github: {
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
          },
        }
      : {}),
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "student",
        input: true,
      },
      bio: {
        type: "string",
        required: false,
        defaultValue: "",
      },
      isBanned: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
      profilePicture: {
        type: "string",
        required: false,
        defaultValue: "",
      },
    },
  },
  plugins: [
    jwt({
      jwt: {
        expirationTime: "48h",
      },
    }),
    bearer(),
  ],
});

export { client as mongoClient, db as mongoDb };
