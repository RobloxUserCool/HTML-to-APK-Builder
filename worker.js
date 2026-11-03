const OWNER = "RobloxUserCool";
const REPO = "HTML-to-APK-Builder";
const BRANCH = "main";
const API = "https://api.github.com";
const HEADERS = {
  "Accept": "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28"
};

function cors(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
    ...extra
  };
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: cors({ "Content-Type": "application/json; charset=utf-8" })
  });
}
function encodeBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
async function gh(env, path, options = {}) {
  if (!env.GH_TOKEN) throw new Error("Не задан секрет GH_TOKEN в настройках Worker.");
  const response = await fetch(API + path, {
    ...options,
    headers: {
      ...HEADERS,
      "Authorization": `Bearer ${env.GH_TOKEN}`,
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GitHub API ${response.status}: ${detail.slice(0, 500)}`);
  }
  return response;
}
async function putFile(env, path, bytes, message) {
  await gh(env, `/repos/${OWNER}/${REPO}/contents/${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: encodeBase64(bytes),
      branch: BRANCH
    })
  });
}
async function findRun(env, buildId) {
  const response = await gh(env, `/repos/${OWNER}/${REPO}/actions/workflows/apk.yml/runs?branch=${BRANCH}&event=workflow_dispatch&per_page=50`);
  const data = await response.json();
  return (data.workflow_runs || []).find(run =>
    (run.display_title || "").includes(buildId) ||
    (run.name || "").includes(buildId)
  ) || null;
}
async function findArtifact(env, runId, buildId) {
  const response = await gh(env, `/repos/${OWNER}/${REPO}/actions/runs/${runId}/artifacts?per_page=100`);
  const data = await response.json();
  return (data.artifacts || []).find(item => item.name === `apk-${buildId}` && !item.expired) || null;
}
async function handle(request, env) {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") return new Response(null, { headers: cors() });
  if (url.pathname === "/" && request.method === "GET") {
    return new Response("HTML to APK Worker is online.", { headers: cors({ "Content-Type": "text/plain; charset=utf-8" }) });
  }

  if (url.pathname === "/build" && request.method === "POST") {
    const form = await request.formData();
    const html = form.get("html");
    const icon = form.get("icon");
    const appName = String(form.get("appName") || "").trim();
    if (!(html instanceof File) || !html.size) return json({ error: "Не найден HTML-файл." }, 400);
    if (html.size > 2 * 1024 * 1024) return json({ error: "HTML больше 2 МБ." }, 413);
    if (!appName || appName.length > 40) return json({ error: "Название должно содержать от 1 до 40 символов." }, 400);
    if (icon instanceof File && icon.size > 2 * 1024 * 1024) return json({ error: "Иконка больше 2 МБ." }, 413);

    const buildId = crypto.randomUUID().replace(/-/g, "");
    const prefix = `uploads/${buildId}`;
    try {
      const htmlBytes = new Uint8Array(await html.arrayBuffer());
      const metadataBytes = new TextEncoder().encode(JSON.stringify({ appName }));
      await putFile(env, `${prefix}/index.html`, htmlBytes, `Upload HTML for ${buildId}`);
      await putFile(env, `${prefix}/metadata.json`, metadataBytes, `Add app metadata for ${buildId}`);
      if (icon instanceof File && icon.size) {
        const iconBytes = new Uint8Array(await icon.arrayBuffer());
        await putFile(env, `${prefix}/icon.bin`, iconBytes, `Add app icon for ${buildId}`);
      }
      await gh(env, `/repos/${OWNER}/${REPO}/actions/workflows/apk.yml/dispatches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: BRANCH, inputs: { build_id: buildId } })
      });
      return json({ ok: true, build_id: buildId });
    } catch (error) {
      return json({ error: error.message || "Не удалось запустить сборку." }, 500);
    }
  }

  if (url.pathname === "/status" && request.method === "GET") {
    const buildId = url.searchParams.get("build_id") || "";
    if (!/^[a-f0-9]{32}$/.test(buildId)) return json({ error: "Некорректный build_id." }, 400);
    try {
      const run = await findRun(env, buildId);
      if (!run) return json({ build_id: buildId, status: "queued" });
      let artifactReady = false;
      if (run.status === "completed" && run.conclusion === "success") {
        artifactReady = !!(await findArtifact(env, run.id, buildId));
      }
      return json({
        build_id: buildId,
        status: run.status,
        conclusion: run.conclusion,
        artifact_ready: artifactReady
      });
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  if (url.pathname === "/download" && request.method === "GET") {
    const buildId = url.searchParams.get("build_id") || "";
    if (!/^[a-f0-9]{32}$/.test(buildId)) return json({ error: "Некорректный build_id." }, 400);
    try {
      const run = await findRun(env, buildId);
      if (!run || run.status !== "completed" || run.conclusion !== "success") {
        return json({ error: "APK ещё не готов." }, 409);
      }
      const artifact = await findArtifact(env, run.id, buildId);
      if (!artifact) return json({ error: "Архив APK не найден или срок его хранения истёк." }, 404);
      const response = await fetch(`${API}/repos/${OWNER}/${REPO}/actions/artifacts/${artifact.id}/zip`, {
        headers: {
          ...HEADERS,
          "Authorization": `Bearer ${env.GH_TOKEN}`
        },
        redirect: "manual"
      });
      if (response.status !== 302 && response.status !== 301) {
        return json({ error: `GitHub не выдал ссылку на архив (HTTP ${response.status}).` }, 502);
      }
      const location = response.headers.get("Location");
      if (!location) return json({ error: "GitHub не вернул ссылку на архив." }, 502);
      return Response.redirect(location, 302);
    } catch (error) {
      return json({ error: error.message }, 500);
    }
  }

  return json({ error: "Not found" }, 404);
}
export default { fetch: handle };
