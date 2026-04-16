import { useCallback, useEffect, useMemo, useState } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { GlassCard } from '../components/GlassCard'
import { Mic, Plus, RefreshCw, Sparkles, Wallet, X } from 'lucide-react'
import { cn } from '../lib/cn'
import { useTranslation } from 'react-i18next'
import { addExpense, getLedgerEntries, initDatabase } from '../lib/repository'
import { syncData } from '../lib/syncEngine'
import type { LedgerRecord } from '../lib/db'

function inr(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n)
}

function formatLedgerDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })
}

function parseEntry(input: string): Pick<LedgerRecord, 'category' | 'amount'> | null {
  const cleaned = input.trim()
  if (!cleaned) return null
  const match = cleaned.match(/(\d+(?:[.,]\d+)?)\s*$/)
  if (!match) return null
  const amount = Number(match[1].replace(/,/g, ''))
  if (!Number.isFinite(amount) || amount <= 0) return null
  const category = cleaned.slice(0, match.index).trim() || 'Expense'
  return { category, amount: Math.round(amount) }
}

export function DigitalLedgerPage() {
  const { t } = useTranslation()
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [mode, setMode] = useState<'voice' | 'text'>('voice')
  const [text, setText] = useState('')
  const [rows, setRows] = useState<LedgerRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  const reload = useCallback(async () => {
    await initDatabase()
    const list = await getLedgerEntries()
    setRows(list)
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        await reload()
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [reload])

  const { income, expense, profit } = useMemo(() => {
    let income = 0
    let expense = 0
    for (const e of rows) {
      if (e.type === 'income') income += e.amount
      else expense += e.amount
    }
    return { income, expense, profit: income - expense }
  }, [rows])

  const chart = useMemo(
    () => [
      { w: 'W1', profit: 2800 },
      { w: 'W2', profit: 6100 },
      { w: 'W3', profit: 4300 },
      { w: 'W4', profit: profit },
      { w: 'W5', profit: profit + 2400 },
      { w: 'W6', profit: profit + 3900 },
    ],
    [profit],
  )

  async function addExpenseFromText(input: string) {
    const parsed = parseEntry(input)
    if (!parsed) return false
    await addExpense({
      category: parsed.category,
      amount: parsed.amount,
    })
    await reload()
    return true
  }

  async function handleSync() {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const { synced, failed } = await syncData()
      setSyncMsg(
        failed
          ? t('ledger.syncPartial', { synced, failed, defaultValue: `Synced ${synced}, failed ${failed}` })
          : t('ledger.syncOk', { synced, defaultValue: `Synced ${synced} row(s)` }),
      )
      await reload()
    } catch (e) {
      setSyncMsg(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="agro-h1">{t('ledger.title')}</div>
          <p className="subtle mt-2 max-w-2xl">
            {t('ledger.desc')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleSync()}
            disabled={syncing || loading}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw size={18} className={cn(syncing && 'animate-spin')} />
            {t('ledger.syncNow', { defaultValue: 'Sync' })}
          </button>
          <button
            type="button"
            onClick={() => setOverlayOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl border border-stroke-3 bg-secondary/12 px-4 py-2 text-sm font-semibold text-white shadow-glowSecondary hover:border-stroke-2"
          >
            <Plus size={18} />
            {t('ledger.addExpense')}
          </button>
        </div>
      </div>

      {syncMsg ? (
        <div className="rounded-2xl border border-stroke-2 bg-primary-700/10 px-4 py-2 text-sm text-white/80">{syncMsg}</div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="p-5" variant="strong">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5">
              <Wallet size={18} className="text-white/80" />
            </div>
            <div>
              <div className="agro-h2">{t('ledger.summary')}</div>
              <div className="subtle mt-0.5">{t('ledger.incomeVsExpense')}</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-white/55">{t('ledger.income')}</div>
              <div className="mt-1 text-sm font-semibold text-white">{inr(income)}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-white/55">{t('ledger.expense')}</div>
              <div className="mt-1 text-sm font-semibold text-white">{inr(expense)}</div>
            </div>
            <div className="rounded-2xl border border-stroke-2 bg-primary-700/15 p-3">
              <div className="text-xs text-white/55">{t('ledger.profit')}</div>
              <div className="mt-1 text-sm font-semibold text-white">{inr(profit)}</div>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/60">
            {t('ledger.tipVoice')}
          </div>
        </GlassCard>

        <GlassCard className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="agro-h2">{t('ledger.khata')}</div>
              <div className="subtle mt-1">{t('ledger.recentTransactions')}</div>
            </div>
            <span className="glass-chip">{t('ledger.thisMonth')}</span>
          </div>

          <div className="mt-4 divide-y divide-white/10 overflow-hidden rounded-3xl border border-white/10">
            {loading ? (
              <div className="bg-white/5 px-4 py-6 text-center text-sm text-white/60">…</div>
            ) : rows.length === 0 ? (
              <div className="bg-white/5 px-4 py-6 text-center text-sm text-white/60">
                {t('ledger.empty', { defaultValue: 'No entries yet.' })}
              </div>
            ) : (
              rows.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-3 bg-white/5 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">{e.category}</div>
                    <div className="mt-0.5 text-xs text-white/55">{formatLedgerDate(e.date)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {e.synced === 0 ? (
                      <span className="rounded-full border border-secondary/30 bg-secondary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-secondary">
                        {t('ledger.pending', { defaultValue: 'Pending' })}
                      </span>
                    ) : null}
                    <div
                      className={cn(
                        'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold',
                        e.type === 'income'
                          ? 'border-stroke-2 bg-primary-700/15 text-white'
                          : 'border-stroke-3 bg-secondary/10 text-white',
                      )}
                    >
                      {e.type === 'income' ? '+' : '-'}
                      {inr(e.amount)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="agro-h2">{t('ledger.profitProjection')}</div>
            <div className="subtle mt-1">{t('ledger.lineChartPlaceholder')}</div>
          </div>
          <span className="glass-chip border-stroke-2 bg-primary-700/12">
            {t('ledger.baseline')}: <span className="font-semibold text-white">{inr(profit)}</span>
          </span>
        </div>
        <div className="mt-4 h-[260px] w-full min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-3">
          <ResponsiveContainer width="99%" height="100%">
            <LineChart data={chart} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <XAxis dataKey="w" stroke="rgba(255,255,255,0.35)" tickLine={false} axisLine={false} />
              <YAxis
                stroke="rgba(255,255,255,0.35)"
                tickLine={false}
                axisLine={false}
                width={45}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(10, 14, 12, 0.85)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 16,
                }}
                labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
                itemStyle={{ color: 'rgba(255,255,255,0.9)' }}
                formatter={(v) => inr(Number(v))}
              />
              <Line
                type="monotone"
                dataKey="profit"
                stroke="#FFA000"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {overlayOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOverlayOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[900px] px-4 pb-4">
            <GlassCard className="overflow-hidden" variant="strong">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl border border-stroke-3 bg-secondary/12 shadow-glowSecondary">
                    <Sparkles size={18} className="text-secondary" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{t('ledger.addExpenseSimulated')}</div>
                    <div className="text-xs text-white/60">{t('ledger.voiceOrTextOverlay')}</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                  onClick={() => setOverlayOpen(false)}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="px-4 py-4">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('voice')}
                    className={cn(
                      'rounded-2xl border px-3 py-3 text-sm font-semibold',
                      mode === 'voice'
                        ? 'border-stroke-3 bg-secondary/12 text-white'
                        : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10',
                    )}
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      <Mic size={16} /> {t('common.voice')}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('text')}
                    className={cn(
                      'rounded-2xl border px-3 py-3 text-sm font-semibold',
                      mode === 'text'
                        ? 'border-stroke-2 bg-primary-700/18 text-white'
                        : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10',
                    )}
                  >
                    {t('common.text')}
                  </button>
                </div>

                <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4">
                  {mode === 'voice' ? (
                    <div className="text-center">
                      <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl border border-stroke-3 bg-secondary/12">
                        <Mic size={22} className="text-secondary" />
                      </div>
                      <div className="mt-3 text-sm font-semibold text-white">
                        {t('ledger.listeningPlaceholder')}
                      </div>
                      <div className="mt-1 text-xs text-white/60">
                        {t('ledger.exampleDiesel')}
                      </div>
                      <div className="mt-4 flex justify-center">
                        <button
                          type="button"
                          className="rounded-2xl border border-stroke-3 bg-secondary/12 px-4 py-2 text-xs font-semibold text-white shadow-glowSecondary hover:border-stroke-2"
                          onClick={() => {
                            void (async () => {
                              await addExpenseFromText('Diesel 1200')
                              setOverlayOpen(false)
                            })()
                          }}
                        >
                          {t('ledger.simulateDiesel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-white/80">{t('ledger.textEntry')}</div>
                      <input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={t('ledger.textEntryPlaceholder')}
                        className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white placeholder:text-white/40 outline-none focus:border-stroke-2"
                      />
                      <div className="text-[11px] text-white/55">
                        {t('ledger.overlayUiReady')}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-3">
                <button
                  type="button"
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
                  onClick={() => setOverlayOpen(false)}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  className="rounded-2xl border border-stroke-3 bg-secondary/12 px-4 py-2 text-sm font-semibold text-white shadow-glowSecondary hover:border-stroke-2"
                  onClick={() => {
                    if (mode === 'text') {
                      void (async () => {
                        const ok = await addExpenseFromText(text)
                        if (ok) setText('')
                        if (ok) setOverlayOpen(false)
                      })()
                      return
                    }
                    setOverlayOpen(false)
                  }}
                >
                  {t('common.save')}
                </button>
              </div>
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  )
}
