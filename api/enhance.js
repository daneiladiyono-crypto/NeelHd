// Proxy tipis supaya browser tidak kena blokir CORS. Dipakai otomatis jika panggilan langsung gagal.
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Gunakan POST" });
  const { target, payload } = req.body || {};
  if (!String(target || "").startsWith("https://api.synoxcloud.xyz/")) {
    return res.status(400).json({ error: "Target tidak diizinkan" });
  }
  try {
    const r = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const ct = r.headers.get("content-type") || "application/json";
    res.status(r.status).setHeader("Content-Type", ct);
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    res.status(502).json({ error: "Gagal menghubungi server HD: " + e.message });
  }
};
