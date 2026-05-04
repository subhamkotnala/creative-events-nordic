import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";

// Load .env file
dotenv.config();

// Fallback for .env.example if .env is missing and we are in dev
if (process.env.NODE_ENV !== "production") {
  const examplePath = path.join(process.cwd(), ".env.example");
  if (fs.existsSync(examplePath)) {
    const exampleEnv = dotenv.parse(fs.readFileSync(examplePath));
    for (const key in exampleEnv) {
      if (!process.env[key] && exampleEnv[key]) {
        process.env[key] = exampleEnv[key];
      }
    }
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.delete("/api/users/:auth_id", async (req, res) => {
    const { auth_id } = req.params;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL;

    console.log(`Delete request for user: ${auth_id}`);

    if (!serviceRoleKey || !supabaseUrl) {
      console.error("Missing Supabase configuration in server environment", {
        hasUrl: !!supabaseUrl,
        hasKey: !!serviceRoleKey
      });
      return res.status(500).json({ error: "Server configuration incomplete. SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_URL is missing." });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    try {
      console.log(`[SERVER] Deletion requested for auth_id: ${auth_id}`);
      
      // 1. Delete from related public tables first to avoid foreign key issues
      const { error: profError } = await supabaseAdmin.from('profiles').delete().eq('auth_id', auth_id);
      if (profError) console.warn("[SERVER] Profile delete warning:", profError);
      
      const { error: appError } = await supabaseAdmin.from('applications').delete().eq('auth_id', auth_id);
      if (appError) console.warn("[SERVER] Application delete warning:", appError);

      // 2. Delete from auth.users
      console.log(`[SERVER] Attempting supabaseAdmin.auth.admin.deleteUser(${auth_id})`);
      const { data: deleteData, error: authError } = await supabaseAdmin.auth.admin.deleteUser(auth_id);
      
      if (authError) {
        console.error("[SERVER] Supabase Auth admin delete failed:", authError);
        // If user already doesn't exist in auth, but we deleted profiles, that's okay
        if (authError.message.includes("User not found")) {
           return res.json({ message: "Profile cleaned up, user was not found in auth. It might have been deleted already." });
        }
        return res.status(500).json({ error: authError.message });
      }

      console.log(`[SERVER] Successfully deleted auth user and records for: ${auth_id}`, deleteData);
      res.json({ message: "User and related records deleted successfully from both database and auth." });
    } catch (err: any) {
      console.error("Unexpected error during delete:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
