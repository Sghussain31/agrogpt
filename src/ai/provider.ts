import { runInference } from '../lib/engine'

export type AIMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export type AIReply = {
  text: string
  source: 'mock' | 'endpoint'
}

function mockAnswer(q: string) {
  const s = q.toLowerCase()
  if (s.includes('today') || s.includes('action')) {
    return 'Daily action: Scout 10 plants at sunrise for early thrips/leaf curl. If threshold crossed, apply neem oil spray in the 6–8 AM window; otherwise delay pesticide and maintain steady irrigation.'
  }
  if (s.includes('water') || s.includes('irrig')) {
    return 'Irrigation: For red sandy loam, use shorter intervals with moderate volume. Prefer early morning; avoid waterlogging and check moisture 5–7 cm below surface before the next cycle.'
  }
  if (s.includes('fertil') || s.includes('npk')) {
    return 'Nutrition: Split fertilizer into smaller doses aligned with crop stage. Over‑nitrogen can increase pest pressure; adjust gradually and prefer soil‑moisture‑aware application.'
  }
  if (s.includes('pest') || s.includes('risk')) {
    return 'Pest risk: Warm nights + humidity increase thrips/aphid risk. Use sticky traps and inspect undersides of young leaves. Escalate to IPM spray only if 2-day risk stays medium/high.'
  }
  return 'I can help with pests, irrigation liters, fertilizer kg, finance entries, and market grading. Configure `VITE_AI_ENDPOINT` to connect a real AI backend.'
}

export async function askAgroGPT(prompt: string, context?: { page?: string; location?: string; soil?: string }) {
  const endpoint = import.meta.env.VITE_AI_ENDPOINT as string | undefined
  if (endpoint) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        prompt,
        context,
      }),
    })
    if (!res.ok) {
      throw new Error(`AI endpoint error (${res.status})`)
    }
    const data = (await res.json()) as { text?: string }
    return { text: data.text ?? 'No response text returned.', source: 'endpoint' } satisfies AIReply
  }

  try {
    await runInference({ prompt, context })
  } catch (err) {
    console.error("Inference engine error:", err)
  }

  return { text: mockAnswer(prompt), source: 'mock' } satisfies AIReply
}

