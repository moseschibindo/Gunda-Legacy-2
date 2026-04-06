import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import nodemailer from "nodemailer";
import knex from "knex";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL || process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL;
const IS_MYSQL = !!(DATABASE_URL || process.env.MYSQLHOST);

const db = knex({
  client: IS_MYSQL ? "mysql2" : "better-sqlite3",
  connection: IS_MYSQL ? (DATABASE_URL || {
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE,
    port: Number(process.env.MYSQLPORT) || 3306,
    ssl: { rejectUnauthorized: false }
  }) : { filename: path.join(process.cwd(), "gunda_legacy.db") },
  useNullAsDefault: true,
});

// Test connection
db.raw('SELECT 1').then(() => {
  console.log(IS_MYSQL ? 'Connected to External MySQL' : 'Connected to Local Independent Database (SQLite)');
}).catch(err => {
  console.error('Database connection failed:', err.message);
});

const JWT_SECRET = process.env.JWT_SECRET || "gunda_legacy_secret_key_123";

// Initialize Database
async function initDb() {
  const hasUsers = await db.schema.hasTable("users");
  if (!hasUsers) {
    await db.schema.createTable("users", (table) => {
      table.increments("id").primary();
      table.string("phone").unique().notNullable();
      table.string("email").unique();
      table.string("password").notNullable();
      table.string("name").notNullable();
      table.string("role").defaultTo("member");
      table.text("profile_picture");
      table.integer("is_suspended").defaultTo(0);
    });
  }

  const hasContributions = await db.schema.hasTable("contributions");
  if (!hasContributions) {
    await db.schema.createTable("contributions", (table) => {
      table.increments("id").primary();
      table.integer("user_id").unsigned().notNullable()
        .references("id").inTable("users").onDelete("CASCADE");
      table.float("amount").notNullable();
      table.string("date").notNullable();
    });
  }

  const hasSettings = await db.schema.hasTable("settings");
  if (!hasSettings) {
    await db.schema.createTable("settings", (table) => {
      table.string("key").primary();
      table.text("value");
    });
    await db("settings").insert([
      { key: "app_logo", value: "" },
      { key: "app_profile_pic", value: "" },
      { key: "app_name", value: "Gunda Legacy" },
    ]);
  }

  const hasNotifications = await db.schema.hasTable("notifications");
  if (!hasNotifications) {
    await db.schema.createTable("notifications", (table) => {
      table.increments("id").primary();
      table.string("title").notNullable();
      table.text("message").notNullable();
      table.string("date").notNullable();
    });
  }

  // Seed Admin
  const adminPhone = "0790805176";
  const adminPassword = "Moses";
  const existingAdmin = await db("users").where({ phone: adminPhone }).first();

  if (!existingAdmin) {
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);
    await db("users").insert({
      phone: adminPhone,
      password: hashedPassword,
      name: "System Admin",
      role: "admin",
    });
    console.log("Admin user seeded.");
  }
}

// Email Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function startServer() {
  try {
    await initDb();
    const app = express();
    const PORT = Number(process.env.PORT) || 3000;

    app.use(cors());
    app.use(express.json({ limit: '10mb' }));

    // Middleware to verify JWT
    const authenticateToken = (req: any, res: any, next: any) => {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) return res.sendStatus(401);

      jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
      });
    };

    // Auth Routes
    app.post("/api/signup", async (req, res) => {
      const { phone, email, password, name } = req.body;
      try {
        const hashedPassword = bcrypt.hashSync(password, 10);
        const [id] = await db("users").insert({ phone, email, password: hashedPassword, name });
        const token = jwt.sign({ id, phone, role: 'member' }, JWT_SECRET);
        res.json({ token, user: { id, phone, email, name, role: 'member' } });
      } catch (err: any) {
        res.status(400).json({ error: "Phone or email already registered" });
      }
    });

    app.post("/api/login", async (req, res) => {
      const { phone, password } = req.body;
      try {
        const user = await db("users").where("phone", phone).first();

        if (user && bcrypt.compareSync(password, user.password)) {
          if (user.is_suspended) {
            return res.status(403).json({ error: "Your account has been suspended. Please contact the admin." });
          }
          
          const contributions = await db("contributions").where("user_id", user.id).sum("amount as total").first();
          const total_contribution = Number(contributions?.total) || 0;

          const token = jwt.sign({ id: user.id, phone: user.phone, role: user.role }, JWT_SECRET);
          res.json({ 
            token, 
            user: { 
              id: user.id, 
              phone: user.phone, 
              email: user.email, 
              name: user.name, 
              role: user.role, 
              profile_picture: user.profile_picture, 
              total_contribution 
            } 
          });
        } else {
          res.status(401).json({ error: "Invalid credentials" });
        }
      } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    app.post("/api/forgot-password", async (req, res) => {
      const { phone, email } = req.body;
      const user = await db("users").where({ phone }).orWhere({ email }).first();
      
      if (user && user.email) {
        try {
          const resetToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });
          const resetLink = `${process.env.APP_URL}/reset-password?token=${resetToken}`;
          
          await transporter.sendMail({
            from: `"Gunda Legacy" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: "Password Reset - Gunda Legacy",
            html: `<p>You requested a password reset. Click the link below to reset your password:</p>
                   <a href="${resetLink}">${resetLink}</a>
                   <p>This link will expire in 1 hour.</p>`
          });
          res.json({ message: "Password reset link sent to your email." });
        } catch (err) {
          console.error("Email error:", err);
          res.status(500).json({ error: "Failed to send reset email." });
        }
      } else {
        res.status(404).json({ error: "User not found or no email associated with this account." });
      }
    });

    app.post("/api/reset-password", async (req, res) => {
      const { token, password } = req.body;
      try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        const hashedPassword = bcrypt.hashSync(password, 10);
        await db("users").where({ id: decoded.id }).update({ password: hashedPassword });
        res.json({ message: "Password reset successful." });
      } catch (err) {
        res.status(400).json({ error: "Invalid or expired reset token." });
      }
    });

    // User Routes
    app.get("/api/users", authenticateToken, async (req: any, res) => {
      const users = await db("users")
        .leftJoin("contributions", "users.id", "contributions.user_id")
        .select("users.id", "users.phone", "users.email", "users.name", "users.role", "users.profile_picture", "users.is_suspended")
        .sum("contributions.amount as total_contribution")
        .groupBy("users.id");
      res.json(users.map(u => ({ ...u, total_contribution: Number(u.total_contribution) || 0 })));
    });

    app.patch("/api/profile", authenticateToken, async (req: any, res) => {
      const { name, phone, email, profile_picture } = req.body;
      try {
        const updateData: any = { name, phone, email };
        if (profile_picture !== undefined) updateData.profile_picture = profile_picture;
        
        await db("users").where({ id: req.user.id }).update(updateData);
        
        const user = await db("users")
          .leftJoin("contributions", "users.id", "contributions.user_id")
          .select("users.id", "users.phone", "users.email", "users.name", "users.role", "users.profile_picture")
          .sum("contributions.amount as total_contribution")
          .where("users.id", req.user.id)
          .groupBy("users.id")
          .first();
        res.json({ ...user, total_contribution: Number(user.total_contribution) || 0 });
      } catch (err: any) {
        res.status(400).json({ error: err.message });
      }
    });

    app.delete("/api/users/:id", authenticateToken, async (req: any, res) => {
      if (req.user.role !== 'admin') return res.sendStatus(403);
      await db("users").where({ id: req.params.id }).delete();
      res.json({ success: true });
    });

    app.post("/api/users/bulk-delete", authenticateToken, async (req: any, res) => {
      if (req.user.role !== 'admin') return res.sendStatus(403);
      const { ids } = req.body;
      await db("users").whereIn("id", ids).delete();
      res.json({ success: true });
    });

    app.patch("/api/users/:id/role", authenticateToken, async (req: any, res) => {
      if (req.user.role !== 'admin') return res.sendStatus(403);
      const { role } = req.body;
      await db("users").where({ id: req.params.id }).update({ role });
      res.json({ success: true });
    });

    app.patch("/api/users/:id/suspend", authenticateToken, async (req: any, res) => {
      if (req.user.role !== 'admin') return res.sendStatus(403);
      const { is_suspended } = req.body;
      await db("users").where({ id: req.params.id }).update({ is_suspended: is_suspended ? 1 : 0 });
      res.json({ success: true });
    });

    // App Settings Routes
    app.get("/api/settings", async (req, res) => {
      const settings = await db("settings").select("*");
      const settingsMap = settings.reduce((acc: any, s: any) => {
        acc[s.key] = s.value;
        return acc;
      }, {});
      res.json(settingsMap);
    });

    app.patch("/api/settings", authenticateToken, async (req: any, res) => {
      if (req.user.role !== 'admin') return res.sendStatus(403);
      const { app_logo, app_profile_pic, app_name } = req.body;
      if (app_logo !== undefined) {
        await db("settings").where({ key: 'app_logo' }).update({ value: app_logo });
      }
      if (app_profile_pic !== undefined) {
        await db("settings").where({ key: 'app_profile_pic' }).update({ value: app_profile_pic });
      }
      if (app_name !== undefined) {
        await db("settings").where({ key: 'app_name' }).update({ value: app_name });
      }
      res.json({ success: true });
    });

    // Notification Routes
    app.get("/api/notifications", authenticateToken, async (req, res) => {
      const notifications = await db("notifications").orderBy("date", "desc");
      res.json(notifications);
    });

    app.post("/api/notifications", authenticateToken, async (req: any, res) => {
      if (req.user.role !== 'admin') return res.sendStatus(403);
      const { title, message, date } = req.body;
      const [id] = await db("notifications").insert({ title, message, date });
      res.json({ id });
    });

    app.delete("/api/notifications/:id", authenticateToken, async (req: any, res) => {
      if (req.user.role !== 'admin') return res.sendStatus(403);
      await db("notifications").where({ id: req.params.id }).delete();
      res.json({ success: true });
    });

    // Contribution Routes
    app.get("/api/contributions", authenticateToken, async (req, res) => {
      const contributions = await db("contributions")
        .join("users", "contributions.user_id", "users.id")
        .select("contributions.*", "users.name as user_name")
        .orderBy("contributions.date", "desc");
      res.json(contributions);
    });

    app.post("/api/contributions", authenticateToken, async (req: any, res) => {
      if (req.user.role !== 'admin') return res.sendStatus(403);
      const { user_id, amount, date } = req.body;
      const [id] = await db("contributions").insert({ user_id, amount, date });
      res.json({ id });
    });

    app.delete("/api/contributions/:id", authenticateToken, async (req: any, res) => {
      if (req.user.role !== 'admin') return res.sendStatus(403);
      await db("contributions").where({ id: req.params.id }).delete();
      res.json({ success: true });
    });

    app.post("/api/contributions/bulk-delete", authenticateToken, async (req: any, res) => {
      if (req.user.role !== 'admin') return res.sendStatus(403);
      const { ids } = req.body;
      await db("contributions").whereIn("id", ids).delete();
      res.json({ success: true });
    });

    // Stats Route
    app.get("/api/stats", authenticateToken, async (req, res) => {
      const totalContributions = await db("contributions").sum("amount as total").first();
      const memberCount = await db("users").count("* as count").first();
      const recentContributions = await db("contributions")
        .join("users", "contributions.user_id", "users.id")
        .select("contributions.*", "users.name as user_name")
        .orderBy("contributions.date", "desc")
        .limit(5);

      res.json({
        totalAmount: Number(totalContributions?.total) || 0,
        totalShares: (Number(totalContributions?.total) || 0) / 25,
        memberCount: Number(memberCount?.count) || 0,
        recentContributions
      });
    });

    // Vite middleware for development
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
