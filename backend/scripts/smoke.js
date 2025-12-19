const http = require('http');

process.env.DATABASE_PATH = process.env.DATABASE_PATH || ':memory:';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'smoke-secret';

const app = require('../src/server');

async function main() {
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  async function request(pathname) {
    const res = await fetch(`${base}${pathname}`);
    const contentType = res.headers.get('content-type') || '';
    let body = null;

    if (contentType.includes('application/json')) {
      body = await res.json().catch(() => null);
    } else {
      body = await res.text().catch(() => null);
    }

    return { status: res.status, body };
  }

  try {
    const health = await request('/api/health');
    const me = await request('/api/me');
    const companies = await request('/api/companies');

    console.log(
      JSON.stringify(
        {
          health,
          me_status: me.status,
          companies_status: companies.status
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error('Smoke test failed:', error.message);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

main();
