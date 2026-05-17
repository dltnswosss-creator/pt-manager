import { NextResponse } from "next/server";
import net from "net";
import dns from "dns/promises";

const HOST = "aws-1-ap-northeast-1.pooler.supabase.com";
const DB_URL = process.env.DATABASE_URL ?? "";

function tcpCheck(host: string, port: number, timeoutMs = 5000): Promise<string> {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    const timer = setTimeout(() => {
      sock.destroy();
      resolve(`TIMEOUT (${timeoutMs}ms)`);
    }, timeoutMs);

    sock.connect(port, host, () => {
      clearTimeout(timer);
      sock.destroy();
      resolve("OK");
    });

    sock.on("error", (e) => {
      clearTimeout(timer);
      resolve(`ERROR: ${e.message}`);
    });
  });
}

export async function GET() {
  const results: Record<string, string> = {};

  // 1. DNS
  try {
    const addrs = await dns.resolve4(HOST);
    results["dns"] = `OK: ${addrs.join(", ")}`;
  } catch (e: unknown) {
    results["dns"] = `FAIL: ${(e as Error).message}`;
  }

  // 2. TCP 6543 (transaction pooler)
  results["tcp_6543"] = await tcpCheck(HOST, 6543);

  // 3. TCP 5432 (session pooler)
  results["tcp_5432"] = await tcpCheck(HOST, 5432);

  // 4. Supabase REST API ping
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      const r = await fetch(`${url}/rest/v1/`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(5000),
      });
      results["supabase_rest"] = `HTTP ${r.status}`;
    } else {
      results["supabase_rest"] = "ENV MISSING";
    }
  } catch (e: unknown) {
    results["supabase_rest"] = `FAIL: ${(e as Error).message}`;
  }

  results["DATABASE_URL_prefix"] = DB_URL.substring(0, 60) + "...";

  return NextResponse.json(results);
}
