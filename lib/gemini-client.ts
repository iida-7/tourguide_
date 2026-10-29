/**
 * Gemini AI 보조 판독 클라이언트 (4대 안전장치 내장)
 *
 * [4대 안전장치]
 * 1. 원문 대조: AI가 분석 대상으로 제시한 문장이 실제 원문에 없으면 즉시 폐기
 * 2. 선택지 한정: [입장 | 외관 | 차창 | 판단불가] 4가지 외 답변 금지
 * 3. 숫자 조작 방지: 금액 계산은 시스템 프로그램이 전담 (AI에 계산 일절 위임 안 함)
 * 4. 감정 코멘트 금지: 여행사 비방이나 주관적 소설을 배제하고 오직 사실과 키워드만 서술
 */

import type { AiReason } from './mock-result'

export interface GeminiVerdictResult {
  sentence: string
  line: number
  keyword: string
  verdict: '입장' | '외관' | '차창' | '판단불가'
  reason: string
}

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent'

/**
 * 모호한 일정 문장들을 Gemini AI에 배치 전달하여 4대 안전장치를 통과한 판독 결과 반환
 * 1순위: Next.js API 라우트 (/api/gemini-verify) -> .env의 GEMINI_API_KEY 사용
 * 2순위: 클라이언트 브라우저 직접 호출 (사용자가 입력해 localStorage에 저장한 키만 사용)
 */
export async function verifyWithGeminiAI(
  sentences: { line: number; text: string }[],
  userApiKey?: string,
): Promise<Record<number, AiReason>> {
  if (!sentences || sentences.length === 0) {
    return {}
  }

  // 1. 내부 API 엔드포인트 호출 시도 (.env의 GEMINI_API_KEY 사용)
  try {
    const apiRes = await fetch('/api/gemini-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sentences, userApiKey }),
    })

    if (apiRes.ok) {
      const data = await apiRes.json()
      if (data.verified && Object.keys(data.verified).length > 0) {
        return data.verified as Record<number, AiReason>
      }
    }
  } catch (apiErr) {
    console.warn('/api/gemini-verify 호출 중 예외, 브라우저 직접 호출로 폴백합니다.', apiErr)
  }

  // 2. 폴백: 브라우저 직접 호출
  const fallbackKey =
    userApiKey || (typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') : undefined)

  if (!fallbackKey) {
    return {}
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

반드시 아래 JSON 배열 형식으로만 응답하세요. 다른 설명이나 코드블록 기호는 절대 붙이지 마세요:
[
  {
    "line": 라인번호숫자,
    "keyword": "핵심키워드",
    "verdict": "입장|외관|차창|판단불가",
    "reason": "객관적 판정 이유"
  }
]
`

  try {
    const res = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': fallbackKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    })

    if (!res.ok) {
      console.warn('Gemini 직접 호출 실패:', res.status, res.statusText)
      return {}
    }

    const data = await res.json()
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!content) return {}

    let parsed: Array<{
      line: number
      keyword: string
      verdict: '입장' | '외관' | '차창' | '판단불가'
      reason: string
    }> = []

    try {
      parsed = JSON.parse(content)
    } catch {
      const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim()
      parsed = JSON.parse(cleaned)
    }

    const verified: Record<number, AiReason> = {}

    // 4대 안전장치 검증
    parsed.forEach((item) => {
      const original = sentences.find((s) => s.line === item.line)
      if (!original) return

      const validVerdicts = ['입장', '외관', '차창', '판단불가']
      if (!validVerdicts.includes(item.verdict)) return

      verified[item.line] = {
        sentence: original.text,
        line: item.line,
        keyword: item.keyword || '문맥 추정',
        verdict: item.verdict,
      }
    })

    return verified
  } catch (err) {
    console.error('Gemini 직접 판독 중 예외 발생:', err)
    return {}
  }
}
