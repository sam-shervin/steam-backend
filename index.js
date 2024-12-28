//import prisma from "./db/prismaInstance.js";
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import rateLimit from "express-rate-limit";
import pkg from "express-openid-connect";
//import cors
import cors from "cors";

const { auth, requiresAuth } = pkg;

const app = express();

const port = 8032;

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.AUTH_SECRET,
  baseURL: process.env.BASE_URL,
  clientID: process.env.CLIENT_ID,
  issuerBaseURL: process.env.ISSUER_BASE_URL,
};

app.use(auth(config));

app.set("trust proxy", true);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  validate: { trustProxy: false }, // Disable the trust proxy validation check
});

app.use(limiter);

app.use(express.json());

// CORS setup
const allowedOrigins = [
  "https://steams.social",
  "https://www.steams.social, https://steamwys.us.auth0.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"],
  })
);

app.get("/checkSession", (req, res) => {
  res.json({ loginStatus: req.oidc.isAuthenticated() });
});

app.get("/profile", requiresAuth(), (req, res) => {
  res.json(req.oidc.user);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

