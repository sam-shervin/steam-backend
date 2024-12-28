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

// Middleware to check if the user is an admin
const checkIfAdmin = async (req, res, next) => {
  const email = req.oidc.user.email;

  // Check if the user is an admin
  const user = await prisma.user.findUnique({
    where: { email: email },
  });

  if (user?.isAdmin) {
    // If admin, skip rate limiter
    return next();
  }

  // If not an admin, apply the rate limiter
  limiter(req, res, next);
};

// Apply the checkIfAdmin middleware before the rate limiter
app.use(checkIfAdmin);

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

// An endpoint that allows the user to view all users.
app.get("/checkSession", (req, res) => {
  res.json({ loginStatus: req.oidc.isAuthenticated() });
});


// An endpoint that allows the user to view their profile.
app.get("/profile", requiresAuth(), (req, res) => {
  res.json(req.oidc.user);
});


// An endpoint that allows the user to update their profile.
app.put("/profileUpdate", reqiresAuth(), (req, res) => {
  const { name } = req.body;
  const { email, email_verified, picture } = req.oidc.user;
  prisma.user.upsert({
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
});

app.post("/heatMap", requiresAuth(), (req, res) => {
  // get lat and lon and send to a flask server
  //const { lat, lon } = req.body;
  // send to flask server
  res.json({ success: true });
});


// An endpoint that allows the admin to promote a user to an admin.
app.post("/promoteUser", requiresAuth(), async (req, res) => {
  const { email } = req.body;
  const adminUser = req.oidc.user.email;

  // Ensure the current user is an admin
  const isAdmin = await prisma.user.findUnique({
    where: { email: adminUser },
  }).isAdmin;

  if (!isAdmin) {
    return res.status(403).json({ error: "Not authorized" });
  }

  const user = await prisma.user.findUnique({
    where: { email: email },
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // Promote user to admin by adding to Admin table
  await prisma.admin.create({
    data: {
      email: email,
    },
  });

  // Update the user record to set isAdmin flag
  await prisma.user.update({
    where: { email: email },
    data: { isAdmin: true },
  });

  res.json({ success: true });
});

// An endpoint that allows the admin to view all complaints.
app.get("/complaints", requiresAuth(), async (req, res) => {
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
