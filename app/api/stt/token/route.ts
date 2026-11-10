// 브라우저가 Soniox 실시간 STT WebSocket에 직접 연결할 수 있도록 임시 API 키를 발급한다.
// (Vercel 함수는 4.5MB 넘는 요청을 받지 못해 수업 전체 녹음을 서버로 보낼 수 없으므로,
//  오디오는 브라우저 → Soniox로 직접 스트리밍하고 서버는 키만 발급한다)
// 장기 키(SONIOX_API_KEY)는 서버에만 두고, 클라이언트에는 1회용·단기 키만 내려준다.
// 녹음 중 연결이 끊기면 SDK가 재연결할 때마다 이 엔드포인트를 다시 호출해 새 키를 받는다.

const SONIOX_TEMP_KEY_URL = "https://api.soniox.com/v1/auth/temporary-api-key";

export async function POST() {
  const apiKey = process.env.SONIOX_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "SONIOX_API_KEY가 설정되지 않았습니다" }, { status: 500 });
  }

  const res = await fetch(SONIOX_TEMP_KEY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      usage_type: "transcribe_websocket",
      expires_in_seconds: 60, // 연결을 여는 데만 쓰이고, 이미 열린 스트림은 만료와 무관하게 유지됨
      single_use: true,
      max_session_duration_seconds: 3 * 60 * 60, // 녹음을 끄지 않고 방치했을 때 과금 상한 (3시간)
      client_reference_id: "pt-manager-session-record",
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("Soniox 임시 키 발급 실패:", res.status, await res.text().catch(() => ""));
    return Response.json({ error: "음성 인식 연결 키 발급에 실패했습니다" }, { status: 502 });
  }

  const { api_key } = (await res.json()) as { api_key: string; expires_at: string };
  return Response.json({ api_key }, { headers: { "Cache-Control": "no-store" } });
}
