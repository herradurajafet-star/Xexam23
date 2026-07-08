import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser("xexam-roblox-secret-key"));

// Helper to get Roblox redirect URI
function getRedirectUri(req: express.Request): string {
  const host = req.headers["x-forwarded-host"] || req.get("host") || "localhost:3000";
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
  // Always use the APP_URL env variable if present, otherwise build it dynamically
  const baseUrl = process.env.APP_URL || `${protocol}://${host}`;
  return `${baseUrl.replace(/\/$/, "")}/api/auth/roblox/callback`;
}

// -------------------------------------------------------------
// Auth Route: Initialize Roblox OAuth 2.0 Login
// -------------------------------------------------------------
app.get("/api/auth/roblox", (req, res) => {
  const clientId = process.env.ROBLOX_CLIENT_ID;
  if (!clientId) {
    return res.status(400).json({
      error: "ROBLOX_CLIENT_ID is not configured in .env on the server. Please use Sandbox Login or configure your Roblox Client ID."
    });
  }

  const redirectUri = getRedirectUri(req);
  const state = Math.random().toString(36).substring(2, 15);
  res.cookie("oauth_state", state, { maxAge: 600000, httpOnly: true, secure: true });

  // Redirect to Roblox OAuth 2.0 Authorization screen
  const robloxAuthUrl = `https://apis.roblox.com/oauth/v1/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=openid%20profile&state=${state}`;

  res.redirect(robloxAuthUrl);
});

// -------------------------------------------------------------
// Auth Route: Roblox OAuth 2.0 Callback
// -------------------------------------------------------------
app.get("/api/auth/roblox/callback", async (req, res) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    return res.redirect(`/?auth_error=${encodeURIComponent(String(error_description || error))}`);
  }

  const savedState = req.cookies.oauth_state;
  if (!state || state !== savedState) {
    return res.redirect("/?auth_error=State%20mismatch.%20Security%20validation%20failed.");
  }

  res.clearCookie("oauth_state");

  const clientId = process.env.ROBLOX_CLIENT_ID;
  const clientSecret = process.env.ROBLOX_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res.redirect("/?auth_error=Roblox%20OAuth%20credentials%20are%20missing%20on%20the%20server.");
  }

  try {
    const redirectUri = getRedirectUri(req);

    // Exchange Code for Access Token
    const tokenResponse = await fetch("https://apis.roblox.com/oauth/v1/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code: String(code),
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      console.error("Roblox token exchange failed:", errBody);
      return res.redirect(`/?auth_error=Token%20exchange%20failed:%20${encodeURIComponent(errBody)}`);
    }

    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;

    // Fetch Userinfo from Roblox
    const userinfoResponse = await fetch("https://apis.roblox.com/oauth/v1/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!userinfoResponse.ok) {
      return res.redirect("/?auth_error=Failed%20to%20fetch%20Roblox%20user%20profile.");
    }

    const robloxUser = await userinfoResponse.json();
    const userId = robloxUser.sub; // Roblox User ID
    const username = robloxUser.preferred_username || robloxUser.name;
    const displayName = robloxUser.name || username;

    // Fetch real Roblox headshot
    let avatarUrl = "https://tr.rbxcdn.com/30day-avatarheadshot-150x150-png";
    try {
      const thumbResponse = await fetch(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`
      );
      if (thumbResponse.ok) {
        const thumbData = await thumbResponse.json();
        if (thumbData.data && thumbData.data.length > 0) {
          avatarUrl = thumbData.data[0].imageUrl;
        }
      }
    } catch (e) {
      console.error("Failed to fetch Roblox avatar headshot thumbnail:", e);
    }

    const sessionUser = {
      id: `roblox:${userId}`,
      username,
      displayName,
      avatarUrl
    };

    // Save user profile in secure cookie
    res.cookie("roblox_session", JSON.stringify(sessionUser), {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      secure: true,
      signed: true
    });

    res.redirect("/");
  } catch (error) {
    console.error("Roblox OAuth Callback error:", error);
    res.redirect(`/?auth_error=${encodeURIComponent(error instanceof Error ? error.message : "Internal Error")}`);
  }
});

// -------------------------------------------------------------
// API Route: Proxy/Redirect Roblox Avatar Headshots
// -------------------------------------------------------------
app.get("/api/roblox/avatar/:userId", async (req, res) => {
  const { userId } = req.params;
  const cleanId = String(userId).replace(/[^0-9]/g, ""); // Keep only digits for Roblox User ID
  if (!cleanId) {
    return res.redirect("https://img.icons8.com/color/150/000000/roblox.png");
  }

  try {
    const thumbResponse = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${cleanId}&size=150x150&format=Png&isCircular=false`
    );
    if (thumbResponse.ok) {
      const thumbData = await thumbResponse.json();
      if (thumbData.data && thumbData.data.length > 0 && thumbData.data[0].imageUrl) {
        return res.redirect(thumbData.data[0].imageUrl);
      }
    }
  } catch (e) {
    console.error("Failed to proxy Roblox avatar headshot:", e);
  }
  // Safe fallback Roblox logo
  res.redirect("https://img.icons8.com/color/150/000000/roblox.png");
});

// -------------------------------------------------------------
// Auth Route: Username-based instant Roblox Login (Allows testing without OAuth keys)
// -------------------------------------------------------------
app.post("/api/auth/sandbox-login", async (req, res) => {
  const { username } = req.body;
  if (!username || typeof username !== "string" || username.trim() === "") {
    return res.status(400).json({ error: "Roblox username is required" });
  }

  const cleanUsername = username.trim();

  try {
    // Look up the actual user details from Roblox's public API
    const searchResponse = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        usernames: [cleanUsername],
        excludeBannedUsers: false
      })
    });

    let userId = "1";
    let displayName = cleanUsername;
    let foundUsername = cleanUsername;

    if (searchResponse.ok) {
      const searchResult = await searchResponse.json();
      if (searchResult.data && searchResult.data.length > 0) {
        userId = String(searchResult.data[0].id);
        displayName = searchResult.data[0].displayName || cleanUsername;
        foundUsername = searchResult.data[0].name || cleanUsername;
      } else {
        // Fallback to random numerical ID to make testing work even with unexisting usernames
        userId = String(Math.floor(1000000 + Math.random() * 90000000));
      }
    } else {
      userId = String(Math.floor(1000000 + Math.random() * 90000000));
    }

    // Set avatarUrl to hit our proxy endpoint so it loads cleanly in all client contexts
    const avatarUrl = `/api/roblox/avatar/${userId}`;

    const sessionUser = {
      id: `roblox:${userId}`,
      username: foundUsername,
      displayName,
      avatarUrl
    };

    res.cookie("roblox_session", JSON.stringify(sessionUser), {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      secure: true,
      signed: true
    });

    res.json({ success: true, user: sessionUser });
  } catch (error) {
    console.error("Roblox login failure:", error);
    res.status(500).json({ error: "Failed to perform Roblox user lookup." });
  }
});

// -------------------------------------------------------------
// Auth Route: Get Current User Session
// -------------------------------------------------------------
app.get("/api/auth/me", (req, res) => {
  const sessionCookie = req.signedCookies.roblox_session;
  if (!sessionCookie) {
    return res.json({ user: null, oauthConfigured: !!process.env.ROBLOX_CLIENT_ID });
  }

  try {
    const user = JSON.parse(sessionCookie);
    res.json({ user, oauthConfigured: !!process.env.ROBLOX_CLIENT_ID });
  } catch (error) {
    res.json({ user: null, oauthConfigured: !!process.env.ROBLOX_CLIENT_ID });
  }
});

// -------------------------------------------------------------
// Auth Route: Logout
// -------------------------------------------------------------
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("roblox_session");
  res.json({ success: true });
});

// -------------------------------------------------------------
// Vite Middleware / Static Asset Serving
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA routing - Express v4 route matches *
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Xexam] Server running on port ${PORT}`);
  });
}

startServer();
