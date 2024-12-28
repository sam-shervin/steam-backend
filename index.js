import pkgg from "@prisma/client";
import express from "express";
import rateLimit from "express-rate-limit";
import pkg from "express-openid-connect";
//import cors
import cors from "cors";
import fetch from "node-fetch";

const { PrismaClient } = pkgg;
const prisma = new PrismaClient();

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

// Middleware to check if the user is an admin
const checkIfAdmin = async (req, res, next) => {
  if (req.oidc.isAuthenticated()) {
    const email = req.oidc.user.email;

    // Check if the user is an admin
    const user = await prisma.user.findUnique({
      where: { email: email },
    });

    if (user?.isAdmin) {
      // If admin, skip rate limiter
      return next();
    }
  }
  // If not an admin, apply the rate limiter
  limiter(req, res, next);
};

// Apply the checkIfAdmin middleware before the rate limiter
app.use(checkIfAdmin);

app.use(express.json());

const allowedOrigins = [
  "https://admin.steams.social",
  "https://steams.social",
  "https://www.steams.social",
  "https://steamwys.us.auth0.com",
  "https://localhost:3000",
];

app.use((req, res, next) => {
  console.log(`Incoming request from origin: ${req.headers.origin}`);
  next();
});

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.error(`CORS blocked: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
const Authorized = async (email) => {
  const user = await prisma.user.findUnique({
    where: { email: email },
  });
  return !!user;
};

// ----------------------------------------------------------------

// An endpoint that checks if the user is authenticated.
app.get("/checkSession", (req, res) => {
  res.json({ loginStatus: req.oidc.isAuthenticated() });
});

// ----------------------------------------------------------------

// An endpoint that allows the user to log in, if not already authenticated.
app.get("/letmein", async (req, res) => {
  if (!req.oidc.isAuthenticated()) {
    return res.redirect("/login");
  }

  const { email, email_verified, picture } = req.oidc.user;

  // Insert user into the database
  await prisma.user.create({
    data: {
      email: email,
      verified: email_verified,
      picture: picture,
      isAdmin: false,
    },
  });

  res.json({ success: true });
});

// ----------------------------------------------------------------

app.get("/", (req, res) => {
  res.redirect("https://steams.social");
});

// ----------------------------------------------------------------

// An endpoint that gives the user's profile information.
app.get("/self", async (req, res) => {
  if (!req.oidc.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const isAuthorized = await Authorized(req.oidc.user.email);
  if (!isAuthorized) {
    return res.status(403).json({ error: "Not authorized" });
  }

  const { email, email_verified, picture } = req.oidc.user;
  const user = await prisma.user.findUnique({
    where: { email: email },
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({
    email,
    name: user.name,
    email_verified,
    picture,
    isAdmin: user.isAdmin,
  });
});

// ----------------------------------------------------------------

// An endpoint that allows the user to update their profile.
app.put("/profileUpdate", async (req, res) => {
  if (!req.oidc.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const email = req.oidc.user.email;
  const isAuthorized = await Authorized(email);
  if (!isAuthorized) {
    return res.status(403).json({ error: "Not authorized" });
  }

  const { name } = req.body;
  const { email_verified, picture } = req.oidc.user;

  try {
    await prisma.user.upsert({
      where: { email: email },
      update: { name: name },
      create: {
        email: email,
        name: name,
        verified: email_verified,
        picture: picture,
      },
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ----------------------------------------------------------------

// An endpoint to get the heatmap for a given location.
app.get("/map", async (req, res) => {
  if (!req.oidc.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const email = req.oidc.user.email;
  const isAuthorized = await Authorized(email);
  if (!isAuthorized) {
    return res.status(403).json({ error: "Not authorized" });
  }

  const latitude = req.query.latitude;
  const longitude = req.query.longitude;

  if (!latitude || !longitude) {
    return res.status(400).send("Latitude and longitude are required");
  }

  try {
    // Forward the coordinates to the Flask API
    const response = await fetch(
      `https://ml.steams.social/heatmaps?latitude=${latitude}&longitude=${longitude}` // Call the Flask API
    );

    if (!response.ok) {
      throw new Error("Failed to fetch map from Flask API");
    }

    const htmlContent = await response.text();
    res.send(htmlContent); // Send the HTML content to the frontend
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Error fetching map");
  }
});

// ----------------------------------------------------------------

// An endpoint that allows the admin to promote a user to an admin.
app.put("/promoteUser", async (req, res) => {
  if (!req.oidc.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const adminEmail = req.oidc.user.email;
  const { email } = req.body;

  // Ensure the current user is an admin and verified
  const adminUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!adminUser || !adminUser.isAdmin || !adminUser.verified) {
    return res.status(403).json({ error: "Not authorized" });
  }

  const user = await prisma.user.findUnique({
    where: { email: email },
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  try {
    // Promote user to admin by updating the isAdmin flag
    await prisma.user.update({
      where: { email: email },
      data: { isAdmin: true },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error promoting user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ----------------------------------------------------------------

// An endpoint that allows the admin to view all complaints.
app.get("/complaints", async (req, res) => {
  const adminUser = req.oidc.user.email;

  // Check if user is an admin
  const isAdmin = await prisma.user.findUnique({
    where: { email: adminUser },
  }).isAdmin;

  if (!isAdmin) {
    return res.status(403).json({ error: "Not authorized" });
  }

  const complaints = await prisma.complaint.findMany({
    include: { user: true },
  });

  res.json(complaints);
});

// An endpoint that allows the admin to change the status of a complaint.
app.put("/complaint/status", requiresAuth(), async (req, res) => {
  const { complaintUID, status } = req.body;
  const adminUser = req.oidc.user.email;

  // Check if user is an admin
  const isAdmin = await prisma.user.findUnique({
    where: { email: adminUser },
  }).isAdmin;

  if (!isAdmin) {
    return res.status(403).json({ error: "Not authorized" });
  }

  const complaint = await prisma.complaint.findUnique({
    where: { complaintUID: complaintUID },
  });

  if (!complaint) {
    return res.status(404).json({ error: "Complaint not found" });
  }

  const updatedComplaint = await prisma.complaint.update({
    where: { complaintUID: complaintUID },
    data: {
      status: status,
      adminWhoModified: adminUser, // Admin who changed the status
    },
  });

  res.json(updatedComplaint);
});

// An endpoint that allows the user to submit a complaint.
app.post("/complaint", requiresAuth(), async (req, res) => {
  const { email } = req.oidc.user;
  const { complaintUID, status = "NOT_VIEWED" } = req.body;

  // Create complaint record in database
  const newComplaint = await prisma.complaint.create({
    data: {
      complaintUID: complaintUID,
      email: email,
      status: status,
    },
  });

  res.json({ success: true, complaint: newComplaint });
});

// An endpoint that allows the user to view their complaints.
app.get("/myComplaints", requiresAuth(), async (req, res) => {
  const { email } = req.oidc.user;

  const complaints = await prisma.complaint.findMany({
    where: { email: email },
  });

  res.json(complaints);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
