// Server-side geocoding proxy (no browser key needed)
app.get("/api/geocode", async (req, res) => {
  try {
    const address = String(req.query.address || "");
    if (!address) return res.status(400).json({ status: "INVALID_REQUEST", error: "Missing address" });

    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) return res.status(500).json({ status: "SERVER_CONFIG_ERROR", error: "Missing GOOGLE_MAPS_API_KEY" });

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`;
    const r = await fetch(url);
    const data = await r.json();
    res.status(200).json(data);
  } catch (err: any) {
    console.error("Server geocode error:", err);
    res.status(500).json({ status: "ERROR", error: err?.message || "Geocode proxy failed" });
  }
});