// Proxy Neel HD: menerima file (atau link), lalu meneruskannya ke API HD sebagai multipart/form-data.
const clean = (s) => String(s || "file").replace(/[^\w.\-]/g, "_");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Gunakan POST" });
  const { target, payload = {}, fields = ["file"], upload, link } = req.body || {};
  if (!String(target || "").startsWith("https://api.synoxcloud.xyz/")) {
    return res.status(400).json({ status: false, message: "Target tidak diizinkan" });
  }
  try {
    let buf, name, type;
    if (upload?.data) {
      buf = Buffer.from(String(upload.data).split(",")[1] || "", "base64");
      name = clean(upload.name);
      type = upload.type || "application/octet-stream";
    } else if (/^https?:\/\//.test(link || "")) {
      const d = await fetch(link, { redirect: "follow" });
      if (!d.ok) return res.status(400).json({ status: false, message: "Link tidak bisa diunduh (kode " + d.status + ")" });
      type = (d.headers.get("content-type") || "application/octet-stream").split(";")[0];
      buf = Buffer.from(await d.arrayBuffer());
      name = clean(new URL(link).pathname.split("/").pop());
    } else {
      return res.status(400).json({ status: false, message: "File atau link diperlukan" });
    }

    const url = target + (target.includes("?") ? "&" : "?") + "apikey=" + encodeURIComponent(payload.apikey || "");
    let last;
    for (const field of fields) {
      const f = new FormData();
      for (const [k, v] of Object.entries(payload)) f.append(k, String(v));
      f.append(field, new Blob([buf], { type }), name);
      const r = await fetch(url, { method: "POST", body: f });
      last = {
        status: r.status,
        ct: r.headers.get("content-type") || "application/json",
        out: Buffer.from(await r.arrayBuffer()),
      };
      if (r.ok) break;
    }
    res.status(last.status).setHeader("Content-Type", last.ct);
    res.send(last.out);
  } catch (e) {
    res.status(502).json({ status: false, message: e.message });
  }
};
