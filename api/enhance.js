// Proxy Neel HD: (1) menghindari blokir CORS, (2) mengunggah file sementara agar API cukup menerima link.
async function host(buf, name, type) {
  try {
    const f = new FormData();
    f.append("reqtype", "fileupload");
    f.append("fileToUpload", new Blob([buf], { type }), name);
    const r = await fetch("https://catbox.moe/user/api.php", { method: "POST", body: f });
    const t = (await r.text()).trim();
    if (/^https?:\/\//.test(t)) return t;
  } catch (e) {}
  try {
    const f = new FormData();
    f.append("file", new Blob([buf], { type }), name);
    const r = await fetch("https://tmpfiles.org/api/v1/upload", { method: "POST", body: f });
    const u = (await r.json())?.data?.url;
    if (u) return u.replace("tmpfiles.org/", "tmpfiles.org/dl/");
  } catch (e) {}
  throw new Error("Gagal mengunggah file sementara");
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Gunakan POST" });
  const { target, payload = {}, fields = [], upload } = req.body || {};
  if (!String(target || "").startsWith("https://api.synoxcloud.xyz/")) {
    return res.status(400).json({ error: "Target tidak diizinkan" });
  }
  try {
    if (upload?.data) {
      const buf = Buffer.from(String(upload.data).split(",")[1] || "", "base64");
      const name = String(upload.name || "file").replace(/[^\w.\-]/g, "_");
      const url = await host(buf, name, upload.type || "application/octet-stream");
      fields.forEach((k) => (payload[k] = url));
    }
    const r = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const ct = r.headers.get("content-type") || "application/json";
    res.status(r.status).setHeader("Content-Type", ct);
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    res.status(502).json({ status: false, message: e.message });
  }
};
