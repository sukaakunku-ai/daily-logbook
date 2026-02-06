import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface DriveFileResponse {
  id: string;
  name: string;
  webViewLink: string;
}

async function getAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/drive.file",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const claimsB64 = btoa(JSON.stringify(claims)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const unsignedJwt = `${headerB64}.${claimsB64}`;

  // Import private key
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  let pemContents = serviceAccount.private_key
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\\n/g, "")
    .replace(/\n/g, "")
    .trim();

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  // Sign the JWT
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(unsignedJwt)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const signedJwt = `${unsignedJwt}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: signedJwt,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const tokenData: GoogleTokenResponse = await tokenResponse.json();
  return tokenData.access_token;
}

async function getOrCreateFolder(accessToken: string, folderName: string): Promise<string> {
  // Search for existing folder
  const searchResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(folderName)}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!searchResponse.ok) {
    throw new Error("Failed to search for folder");
  }

  const searchData = await searchResponse.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create new folder
  const createResponse = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });

  if (!createResponse.ok) {
    throw new Error("Failed to create folder");
  }

  const folderData = await createResponse.json();
  return folderData.id;
}

async function uploadFile(
  accessToken: string,
  folderId: string,
  fileName: string,
  fileContent: ArrayBuffer,
  mimeType: string
): Promise<DriveFileResponse> {
  const metadata = {
    name: fileName,
    parents: [folderId],
  };

  const boundary = "-------314159265358979323846";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataBytes = new TextEncoder().encode(
    delimiter +
      "Content-Type: application/json\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${mimeType}\r\n\r\n`
  );

  const closeBytes = new TextEncoder().encode(closeDelimiter);
  const fileBytes = new Uint8Array(fileContent);

  const body = new Uint8Array(metadataBytes.length + fileBytes.length + closeBytes.length);
  body.set(metadataBytes, 0);
  body.set(fileBytes, metadataBytes.length);
  body.set(closeBytes, metadataBytes.length + fileBytes.length);

  const uploadResponse = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: body,
    }
  );

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    throw new Error(`File upload failed: ${error}`);
  }

  const fileData: DriveFileResponse = await uploadResponse.json();

  // Make file publicly viewable
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileData.id}/permissions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      role: "reader",
      type: "anyone",
    }),
  });

  return fileData;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const fileName = formData.get("fileName") as string | null;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get service account credentials from environment
    const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!serviceAccountJson) {
      return new Response(
        JSON.stringify({ error: "Google Drive integration not configured. Please add GOOGLE_SERVICE_ACCOUNT_JSON secret." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    
    // Get access token
    const accessToken = await getAccessToken(serviceAccount);

    // Get or create upload folder
    const folderId = await getOrCreateFolder(accessToken, "DailyWorkTracker_uploads");

    // Upload file
    const fileContent = await file.arrayBuffer();
    const uploadedFile = await uploadFile(
      accessToken,
      folderId,
      fileName || file.name,
      fileContent,
      file.type || "application/octet-stream"
    );

    return new Response(
      JSON.stringify({
        fileId: uploadedFile.id,
        fileName: uploadedFile.name,
        webViewLink: uploadedFile.webViewLink,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Upload failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
