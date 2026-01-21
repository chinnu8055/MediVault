import * as kv from "./kv_store.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const supa = () =>
  createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  );

/**
 * Generate a unique alphanumeric access code
 * Format: XXX-NNN-XXX (3 letters, 3 numbers, 3 letters)
 */
function generateAccessCode(): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  
  let code = "";
  
  // First 3 letters
  for (let i = 0; i < 3; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  
  // 3 numbers
  for (let i = 0; i < 3; i++) {
    code += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  
  // Last 3 letters
  for (let i = 0; i < 3; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }

  return code;
}

/**
 * Generate Access Code Handler
 */
async function handleGenerateCode(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const ttl_minutes = body.ttl_minutes || 60;
    const patient_id = body.patient_id; // Get patient ID from request

    // Validate TTL
    if (!ttl_minutes || ttl_minutes <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid TTL. Must be a positive number." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Generate a unique access code
    const code = generateAccessCode();

    // Calculate expiration time
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttl_minutes * 60 * 1000);

    // Store the code in key-value store
    const codeData = {
      code,
      patient_id: patient_id || null,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      ttl_minutes,
      claimed: false,
      claimed_by: null,
      claimed_at: null,
      revoked: false,
      revoked_at: null,
    };

    await kv.set(`access_code:${code}`, codeData);

    // If patient_id is provided, maintain a list of their codes
    if (patient_id) {
      const userCodesKey = `user_codes:${patient_id}`;
      const existingCodes = (await kv.get(userCodesKey)) || [];
      existingCodes.push(code);
      await kv.set(userCodesKey, existingCodes);
    }

    return new Response(
      JSON.stringify({
        code,
        expires_at: expiresAt.toISOString(),
        ttl_minutes,
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Generate code error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to generate access code",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Revoke Access Code Handler
 */
async function handleRevokeCode(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const code = body.code?.trim();

    console.log('Revoke request - Code received:', code);

    if (!code) {
      return new Response(
        JSON.stringify({ error: "Access code is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const codeData = await kv.get(`access_code:${code}`);
    console.log('Code data found:', !!codeData);

    if (!codeData) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired code" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Remove from user's code list (if patient_id present)
    const patient_id = codeData.patient_id;
    if (patient_id) {
      const userCodesKey = `user_codes:${patient_id}`;
      const codelist = (await kv.get(userCodesKey)) || [];
      const filtered = Array.isArray(codelist) ? codelist.filter((c: string) => c !== code) : [];
      await kv.set(userCodesKey, filtered);
    }

    // Delete the access code entry entirely
    await kv.del(`access_code:${code}`);

    return new Response(
      JSON.stringify({ success: true, deleted: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Revoke code error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to revoke access code" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Claim Access Code Handler
 */
async function handleClaimCode(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const code = body.code?.trim();

    // Validate input
    if (!code) {
      return new Response(
        JSON.stringify({ error: "Access code is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Retrieve code from key-value store
    const codeData = await kv.get(`access_code:${code}`);

    if (!codeData) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired code" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if code is already claimed
    if (codeData.claimed) {
      return new Response(
        JSON.stringify({
          error: "This code has already been claimed",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if code has expired
    const now = new Date();
    const expiresAt = new Date(codeData.expires_at);
    if (now > expiresAt) {
      return new Response(
        JSON.stringify({ error: "Access code has expired" }),
        { status: 410, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get doctor info from request (if available)
    const doctor_id = body.doctor_id || "doctor_id_placeholder";
    const doctor_name = body.doctor_name || "Doctor";
    const doctor_specialization = body.doctor_specialization || "General Physician";

    // Mark code as claimed
    codeData.claimed = true;
    codeData.claimed_at = now.toISOString();
    codeData.claimed_by = doctor_id;
    codeData.doctor_name = doctor_name;
    codeData.doctor_specialization = doctor_specialization;

    await kv.set(`access_code:${code}`, codeData);

    // Lookup patient profile for details
    let patient_name = "Patient";
    let patient_unique_id = "";
    try {
      if (codeData.patient_id) {
        console.log("Looking up patient with ID:", codeData.patient_id);
        const { data: profile, error: pErr } = await supa()
          .from("user_profiles")
          .select("name, unique_id")
          .eq("id", codeData.patient_id)
          .maybeSingle();
        
        console.log("Patient lookup result:", { profile, error: pErr });
        
        if (!pErr && profile) {
          patient_name = profile.name || patient_name;
          patient_unique_id = profile.unique_id || patient_unique_id;
          console.log("Patient found:", { patient_name, patient_unique_id });
        } else {
          console.log("Patient not found or error:", pErr);
        }
      } else {
        console.log("No patient_id in codeData");
      }
    } catch (e) {
      console.log("Exception in patient lookup:", e);
    }

    // Return success response
    return new Response(
      JSON.stringify({
        code,
        patient_name,
        patient_unique_id,
        patient_id: codeData.patient_id, // Include patient database ID in response
        expires_at: expiresAt.toISOString(),
        claimed_at: now.toISOString(),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Claim code error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to claim access code",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * List User's Access Codes Handler
 */
async function handleListCodes(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const patient_id = body.patient_id;

    if (!patient_id) {
      return new Response(
        JSON.stringify({ error: "Patient ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get user's code list
    const userCodesKey = `user_codes:${patient_id}`;
    const codelist = (await kv.get(userCodesKey)) || [];

    // Fetch each code's details
    const codes = [] as any[];
    for (const code of codelist) {
      const codeData = await kv.get(`access_code:${code}`);
      if (codeData) {
        codes.push(codeData);
      }
    }

    return new Response(
      JSON.stringify({ codes }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("List codes error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to list access codes",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Get Active Doctor Access Handler
 */
async function handleGetActiveDoctorAccess(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const patient_id = body.patient_id;

    if (!patient_id) {
      return new Response(
        JSON.stringify({ error: "Patient ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get user's code list
    const userCodesKey = `user_codes:${patient_id}`;
    const codelist = (await kv.get(userCodesKey)) || [];

    // Fetch claimed codes with doctor info
    const activeDoctorAccess = [];
    const now = new Date();

    for (const code of codelist) {
      const codeData = await kv.get(`access_code:${code}`);
      if (codeData && codeData.claimed && !codeData.revoked && new Date(codeData.expires_at) > now) {
        activeDoctorAccess.push({
          id: code,
          code: codeData.code,
          doctor_name: codeData.doctor_name || "Doctor",
          doctor_specialization: codeData.doctor_specialization || "General Physician",
          claimed_at: codeData.claimed_at,
          expires_at: codeData.expires_at,
          claimed_by: codeData.claimed_by
        });
      }
    }

    return new Response(
      JSON.stringify({ active_access: activeDoctorAccess }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Get active doctor access error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to get active doctor access",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Main Handler
 */
Deno.serve(async (req: Request) => {
  // Enable CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, X-Function-Path, x-client-info",
      },
    });
  }

  // Add CORS headers to response
  const setCorsHeaders = (response: Response) => {
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, OPTIONS"
    );
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, apikey, X-Function-Path, x-client-info");
    return response;
  };

  try {
    const url = new URL(req.url);
    let path = req.headers.get('X-Function-Path') || url.pathname;

    // Normalize path
    if (!path.startsWith('/')) path = '/' + path;

    console.log(`[${req.method}] ${path}`);
    console.log('Headers:', {
      'X-Function-Path': req.headers.get('X-Function-Path'),
      'Content-Type': req.headers.get('Content-Type'),
      'method': req.method
    });

    // Route based on path
    if (req.method === "POST") {
      if (path.includes("generate")) {
        return setCorsHeaders(await handleGenerateCode(req));
      }
      if (path.includes("list")) {
        return setCorsHeaders(await handleListCodes(req));
      }
      if (path.includes("revoke")) {
        return setCorsHeaders(await handleRevokeCode(req));
      }
      if (path.includes("active")) {
        return setCorsHeaders(await handleGetActiveDoctorAccess(req));
      }
      if (path.includes("claim")) {
        return setCorsHeaders(await handleClaimCode(req));
      }
    }

    // Health check (default GET request)
    if (req.method === "GET") {
      return setCorsHeaders(
        new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    }

    // Default case - if it's a POST and no path specified, assume it's generate
    if (req.method === "POST") {
      return setCorsHeaders(await handleGenerateCode(req));
    }

    // Not found
    return setCorsHeaders(
      new Response(JSON.stringify({ 
        error: "Not found",
        received_path: path,
        method: req.method,
        available_routes: [
          "/access/share/generate",
          "/access/share/list",
          "/access/share/revoke",
          "/access/share/active",
          "/access/share/claim"
        ]
      }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    );
  } catch (error: any) {
    console.error("Server error:", error);
    return setCorsHeaders(
      new Response(
        JSON.stringify({
          error: error.message || "Internal server error",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    );
  }
});