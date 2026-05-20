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

    console.log(`[SERVER] DELETE /api/users/${auth_id} - ServiceRole: ${serviceRoleKey ? 'PRESENT' : 'MISSING'}`);

    if (!serviceRoleKey || !supabaseUrl) {
      return res.status(500).json({ error: "Supabase service role key or URL missing from server environment." });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    try {
      // 1. Delete from related public tables
      // We do them separately for maximum reliability
      console.log(`[SERVER] Cleaning up database records for: ${auth_id}`);
      
      const { error: p1Error } = await supabaseAdmin.from('profiles').delete().eq('auth_id', auth_id);
      if (p1Error) console.warn("[SERVER] Profile(auth_id) delete note:", p1Error.message);
      
      const { error: p2Error } = await supabaseAdmin.from('profiles').delete().eq('id', auth_id);
      if (p2Error) console.warn("[SERVER] Profile(id) delete note:", p2Error.message);
      
      const { error: a1Error } = await supabaseAdmin.from('applications').delete().eq('auth_id', auth_id);
      if (a1Error) console.warn("[SERVER] Application(auth_id) delete note:", a1Error.message);
      
      const { error: a2Error } = await supabaseAdmin.from('applications').delete().eq('id', auth_id);
      if (a2Error) console.warn("[SERVER] Application(id) delete note:", a2Error.message);

      // 2. Delete from auth.users if it's a UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(auth_id);
      if (isUUID) {
        console.log(`[SERVER] Attempting Auth Admin delete for UUID: ${auth_id}`);
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(auth_id);
        
        if (authError) {
          console.error("[SERVER] Supabase Auth admin delete failed:", authError.message);
          // If user already doesn't exist in auth, that's not a fatal error for this operation
          if (authError.message.includes("User not found") || authError.status === 404) {
             return res.json({ success: true, message: "Records cleaned up, auth user was not found." });
          }
          return res.status(500).json({ error: `Auth Error: ${authError.message}` });
        }
      } else {
        console.log(`[SERVER] ${auth_id} is not a UUID, skipping Auth Admin deletion.`);
      }

      console.log(`[SERVER] Successfully processed deletion for: ${auth_id}`);
      return res.json({ success: true, message: "Deletion cleanup completed." });
    } catch (err: any) {
      console.error("[SERVER] Fatal error in DELETE /api/users:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
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
