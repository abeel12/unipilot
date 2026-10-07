import http from "node:http";

function page(title: string, body: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body>${body}</body></html>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

function cookieUser(header: string | undefined) {
  const match = /(?:^|;\s*)lms_user=([^;]+)/.exec(header ?? "");
  if (!match) return null;
  try {
    const name = decodeURIComponent(match[1]).replace(/[\r\n]/g, "").slice(0, 80);
    return name || null;
  } catch {
    return null;
  }
}

export async function startMockLms(port = 0) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const user = cookieUser(req.headers.cookie);
    const send = (status: number, html: string, extra: Record<string, string> = {}) => {
      res.writeHead(status, { "content-type": "text/html; charset=utf-8", ...extra });
      res.end(html);
    };

    if (url.pathname === "/login" && req.method === "POST") {
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of req) {
        size += (chunk as Buffer).length;
        if (size > 4096) break;
        chunks.push(chunk as Buffer);
      }
      const params = new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
      const username = (params.get("username") ?? "").trim().replace(/[\r\n]/g, "").slice(0, 80);
      const passwordPresent = (params.get("password") ?? "").length > 0;
      params.delete("password");
      if (!username || !passwordPresent) {
        send(400, page("Sign in", `<form id="login" method="post" action="/login"><p>Enter both fields on this university page.</p><label>Username <input name="username"></label><label>Password <input name="password" type="password"></label><button type="submit">Sign in</button></form>`));
        return;
      }
      send(302, "", {
        location: "/dashboard",
        "set-cookie": `lms_user=${encodeURIComponent(username)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=28800`,
      });
      return;
    }

    if (url.pathname === "/logout" || url.pathname === "/expire") {
      send(302, "", { location: "/login", "set-cookie": "lms_user=; HttpOnly; Path=/; Max-Age=0" });
      return;
    }

    if (url.pathname === "/login" && user) {
      send(302, "", { location: "/dashboard" });
      return;
    }

    if (!user && url.pathname !== "/login") {
      send(302, "", { location: "/login" });
      return;
    }

    if (url.pathname === "/login") {
      send(200, page("Sign in", `<form id="login" method="post" action="/login"><h1>University sign in</h1><label>Username <input name="username"></label><label>Password <input name="password" type="password"></label><button type="submit">Sign in</button></form>`));
      return;
    }

    if (url.pathname === "/dashboard") {
      send(200, page("Dashboard", `<h1>My Courses</h1><p>Signed in as ${escapeHtml(user ?? "")}</p><a href="/courses">Course Management</a> <a href="/logout">Log out</a>`));
      return;
    }

    if (url.pathname === "/courses") {
      send(
        200,
        page(
          "Courses",
          `<h1>My Courses</h1><a href="/logout">Log out</a> <a href="/course/cs-301/assessments">Artificial Intelligence</a><table><tr data-portal-id="cs-301"><td>CS-301</td><td>Artificial Intelligence</td><td>BSCS 5</td><td>A</td></tr><tr data-portal-id="cs-305"><td>CS-305</td><td>Machine Learning</td><td>BSCS 5</td><td>B</td></tr></table>`,
        ),
      );
      return;
    }

    if (url.pathname === "/course/cs-301/assessments") {
      send(200, page("Assessments", `<h1>Assessments</h1><ul><li data-id="midterm">Midterm</li><li data-id="final">Final</li></ul><table><tr><td>2026-CS-001</td><td>Ahmed Khan</td><td><input aria-label="Ahmed Khan marks"></td></tr><tr><td>2026-CS-002</td><td>Sara Ali</td><td><input aria-label="Sara Ali marks"></td></tr></table><button type="button">Save marks</button>`));
      return;
    }

    if (url.pathname === "/course/cs-301/students") {
      send(200, page("Students", `<h1>Students</h1><ul><li data-id="st-1">Ayesha Khan</li><li data-id="st-2">Bilal Ahmed</li></ul>`));
      return;
    }

    send(404, page("Not found", "<p>This test portal page does not exist.</p>"));
  });

  await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", () => resolve()));
  const address = server.address();
  const bound = typeof address === "object" && address ? address.port : port;
  return {
    port: bound,
    origin: `http://127.0.0.1:${bound}`,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}
