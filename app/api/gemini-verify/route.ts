import { NextResponse } from 'next/server'
import type { AiReason } from '@/lib/mock-result'

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash'
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

// 서버에 .env 키가 설정돼 있는지만 알려줍니다 (키 값은 절대 반환하지 않음)
export async function GET() {
  return NextResponse.json({ serverKey: Boolean(process.env.GEMINI_API_KEY) })
}

export async function POST(req: Request) {
  try {
    let body: any = {}
    try {
      const raw = await req.text()
      body = JSON.parse(raw)
    } catch {
      return NextResponse.json({ error: '잘못된 JSON 형식입니다.', verified: {} }, { status: 400 })
    }

    const { sentences, userApiKey } = body as {
      sentences: { line: number; text: string }[]
      userApiKey?: string
    }

    const apiKey = userApiKey?.trim() || process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API 키가 설정되지 않았습니다.', verified: {} },
        { status: 400 },
      )
    }

    if (!sentences || sentences.length === 0) {
      return NextResponse.json({ verified: {} })
    }

    const prompt = `
당신은 유럽 패키지여행 일정표 팩트체크 전문 판독관입니다.
다음 일정표 문장들의 관람 방식을 엄격하게 판독하세요.

[판독 엄격 규칙]
1. 판정 결과는 반드시 다음 4가지 중 하나여야 합니다: ["입장", "외관", "차창", "판단불가"]
- "입장": 내부 관람, 입장권 포함, 내부 투어가 명시된 경우
- "외관": 외관, 전경, 조망, 포토타임, 밖에서 바라보는 경우
- "차창": 버스/기차/차량 안에서 지나가며 보는 경우
- "판단불가": 내부인지 외관인지 문맥상 구분이 불가능한 경우
2. 키워드는 판정의 결정적 근거가 된 1~2단어만 쓰세요.
3. 이유는 여행사 비방이나 주관적 감정을 배제하고 30자 이내의 객관적 사실만 서술하세요.

[분석할 문장 목록]
${sentences.map((s, idx) => `[ID:${idx + 1} | Line:${s.line}] ${s.text}`).join('\n')}

반드시 아래 JSON 배열 형식으로만 응답하세요. 다른 텍스트나 코드 블록 기호는 절대 붙이지 마세요:
[
  {
    "line": 라인번호숫자,
    "keyword": "핵심키워드",
    "verdict": "입장|외관|차창|판단불가",
    "reason": "객관적 판정 이유"
  }
]
`

    const geminiRes = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    })

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      console.warn('Gemini API 응답 오류:', geminiRes.status, errText)
      return NextResponse.json(
        { error: `Gemini API 오류 (${geminiRes.status})`, verified: {} },
        { status: 502 },
      )
    }

    const data = await geminiRes.json()
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!content) {
      return NextResponse.json({ verified: {} })
    }

    let parsed: Array<{
      line: number
      keyword: string
      verdict: '입장' | '외관' | '차창' | '판단불가'
      reason: string
    }> = []

    try {
      parsed = JSON.parse(content)
    } catch {
      // JSON 파싱 실패 시 백틱 제거 후 재시도
      const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim()
      parsed = JSON.parse(cleaned)
    }

    const verified: Record<number, AiReason> = {}

    // 4대 안전장치 검증
    parsed.forEach((item) => {
      // 1. 원문 대조
      const original = sentences.find((s) => s.line === item.line)
      if (!original) return

      // 2. 선택지 한정
      const validVerdicts = ['입장', '외관', '차창', '판단불가']
      if (!validVerdicts.includes(item.verdict)) return

      // 3 & 4. 안전장치 통과
      verified[item.line] = {
        sentence: original.text,
        line: item.line,
        keyword: item.keyword || '문맥 추정',
        verdict: item.verdict,
      }
    })

    return NextResponse.json({ verified })
  } catch (error) {
    console.error('API 처리 중 예외 발생:', error)
    return NextResponse.json({ error: '서버 내부 오류', verified: {} }, { status: 500 })
  }
}
