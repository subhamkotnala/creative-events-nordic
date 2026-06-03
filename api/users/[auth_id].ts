import { createClient } from "@supabase/supabase-js";

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

async function requireAdmin(req: any, res: any, supabaseAdmin: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return false;
  }

  const token = authHeader.split(" ")[1];
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    res.status(401).json({ error: "Unauthorized token" });
    return false;
  }

  let profile = null;

  if (user.email) {
    const { data: pByEmail } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("email", user.email)
      .maybeSingle();
    profile = pByEmail;
  }

  if (!profile) {
    const { data: pByAuthId } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("auth_id", user.id)
      .maybeSingle();
    profile = pByAuthId;
  }

  if (!profile) {
    const { data: pById } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    profile = pById;
  }

  if (!profile || profile.role !== "ADMIN") {
    res.status(403).json({ error: "Forbidden. Admin access required." });
    return false;
  }

  return true;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authId = req.query.auth_id;
  const auth_id = Array.isArray(authId) ? authId[0] : authId;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;

  if (!auth_id) {
    return res.status(400).json({ error: "Missing user id." });
  }

  if (!serviceRoleKey || !supabaseUrl) {
    return res.status(500).json({ error: "Supabase service role key or URL missing from server environment." });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const isAdmin = await requireAdmin(req, res, supabaseAdmin);
    if (!isAdmin) return;

    const { error: p1Error } = await supabaseAdmin.from("profiles").delete().eq("auth_id", auth_id);
    if (p1Error) console.warn("[API] Profile(auth_id) delete note:", p1Error.message);

    const { error: p2Error } = await supabaseAdmin.from("profiles").delete().eq("id", auth_id);
    if (p2Error) console.warn("[API] Profile(id) delete note:", p2Error.message);

    const { error: a1Error } = await supabaseAdmin.from("applications").delete().eq("auth_id", auth_id);
    if (a1Error) console.warn("[API] Application(auth_id) delete note:", a1Error.message);

    const { error: a2Error } = await supabaseAdmin.from("applications").delete().eq("id", auth_id);
    if (a2Error) console.warn("[API] Application(id) delete note:", a2Error.message);

    if (isUuid(auth_id)) {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(auth_id);

      if (authError) {
        if (authError.message.includes("User not found") || authError.status === 404) {
          return res.json({ success: true, message: "Records cleaned up, auth user was not found." });
        }

        return res.status(500).json({ error: `Auth Error: ${authError.message}` });
      }
    }

    return res.json({ success: true, message: "Deletion cleanup completed." });
  } catch (err: any) {
    console.error("[API] Fatal error in DELETE /api/users:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
