import { Camera, CameraOff, Circle, Scan, ShieldAlert, TestTubeDiagonal, Trash2, Wand2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GlassCard } from '../components/GlassCard'
import { cn } from '../lib/cn'
import { useTranslation } from 'react-i18next'
import { addScan, clearAllScans, getRecentScans, initDatabase } from '../lib/repository'

type Mode = 'Disease Detection' | 'Soil Analysis' | 'AR Application Guide'

type UiScan = {
  id: number
  mode: Mode
  title: string
  meta: string
  createdAt: number
  thumbUrl: string
}

export function FieldVisionPage() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<Mode>('Disease Detection')
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const thumbUrlsRef = useRef<string[]>([])

  const [scans, setScans] = useState<UiScan[]>([])

  const sortedScans = useMemo(
    () => [...scans].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8),
    [scans],
  )

  const loadScans = useCallback(async () => {
    await initDatabase()
    thumbUrlsRef.current.forEach((u) => URL.revokeObjectURL(u))
    thumbUrlsRef.current = []
    const rows = await getRecentScans(24)
    const next: UiScan[] = []
    for (const r of rows) {
      if (r.id == null) continue
      const url = URL.createObjectURL(r.imageBlob)
      thumbUrlsRef.current.push(url)
      let parsed: { mode: Mode; title: string; meta: string }
      try {
        parsed = JSON.parse(r.resultJson) as { mode: Mode; title: string; meta: string }
      } catch {
        parsed = {
          mode: 'Disease Detection',
          title: t('fieldVision.leafScan'),
          meta: new Date(r.timestamp).toLocaleString(),
        }
      }
      next.push({
        id: r.id,
        ...parsed,
        createdAt: r.timestamp,
        thumbUrl: url,
      })
    }
    setScans(next)
  }, [t])

  useEffect(() => {
    void loadScans()
  }, [loadScans])

  useEffect(() => {
    return () => {
      thumbUrlsRef.current.forEach((u) => URL.revokeObjectURL(u))
      thumbUrlsRef.current = []
      if (streamRef.current) {
        for (const tr of streamRef.current.getTracks()) tr.stop()
        streamRef.current = null
      }
    }
  }, [])

  async function startCamera() {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      const v = videoRef.current
      if (v) {
        v.srcObject = stream
        await v.play()
      }
      setCameraOn(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Camera permission denied or unavailable.'
      setCameraError(msg)
      setCameraOn(false)
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop()
      streamRef.current = null
    }
    setCameraOn(false)
  }

  async function capture() {
    const v = videoRef.current
    const c = canvasRef.current
    if (!v || !c) return

    const w = v.videoWidth || 1280
    const h = v.videoHeight || 720

    const maxW = 520
    const scale = Math.min(1, maxW / w)
    c.width = Math.round(w * scale)
    c.height = Math.round(h * scale)

    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.drawImage(v, 0, 0, c.width, c.height)
    const dataUrl = c.toDataURL('image/jpeg', 0.72)

    const now = Date.now()
    const title =
      mode === 'Disease Detection'
        ? t('fieldVision.leafScan')
        : mode === 'Soil Analysis'
          ? t('fieldVision.soilScan')
          : t('fieldVision.arGuideSnapshot')
    const meta = new Date(now).toLocaleString()
    const res = await fetch(dataUrl)
    const imageBlob = await res.blob()
    const resultJson = JSON.stringify({ mode, title, meta })
    await addScan({ imageBlob, resultJson, timestamp: now })
    await loadScans()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="agro-h1">{t('fieldVision.title')}</div>
          <p className="subtle mt-2 max-w-2xl">
            {t('fieldVision.desc')}
          </p>
        </div>
        <span className="glass-chip">
          <Scan size={14} className="text-primary-300" /> {t('fieldVision.mode')}: {t(`fieldVision.mode.${mode}`)}
        </span>
      </div>

      <GlassCard className="relative overflow-hidden p-4 sm:p-6" variant="strong">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary-500/18 via-transparent to-secondary/10" />
        <div className="relative grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/30">
            <div className="absolute inset-0 opacity-60">
              <div className="h-full w-full bg-[radial-gradient(circle_at_30%_30%,rgba(46,125,50,0.25),transparent_45%),radial-gradient(circle_at_70%_60%,rgba(255,160,0,0.18),transparent_45%)]" />
            </div>

            {/* Viewfinder */}
            <div className="absolute inset-0 p-4">
              <div className="h-full w-full rounded-[28px] border border-white/15">
                <div className="relative h-full w-full">
                  <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/70">
                    {t('fieldVision.live')}
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="text-xs text-white/55">{t('fieldVision.lighting')}</div>
                      <div className="mt-1 text-sm font-semibold text-white">{t('fieldVision.good')}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="text-xs text-white/55">{t('fieldVision.stability')}</div>
                      <div className="mt-1 text-sm font-semibold text-white">{t('fieldVision.stable')}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="text-xs text-white/55">{t('fieldVision.focus')}</div>
                      <div className="mt-1 text-sm font-semibold text-white">{t('fieldVision.auto')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative h-[360px] sm:h-[440px]">
              <video
                ref={videoRef}
                className={cn(
                  'absolute inset-0 h-full w-full object-cover',
                  cameraOn ? 'opacity-100' : 'opacity-0',
                )}
                playsInline
                muted
              />
              <div className="relative grid h-full place-items-center">
                {!cameraOn ? (
                  <div className="grid place-items-center gap-2 px-6 text-center">
                    <div className="grid h-14 w-14 place-items-center rounded-3xl border border-white/10 bg-white/5">
                      {cameraError ? (
                        <CameraOff size={22} className="text-secondary" />
                      ) : (
                        <Camera size={22} className="text-white/75" />
                      )}
                    </div>
                    <div className="text-sm font-semibold text-white">
                      {cameraError ? t('fieldVision.cameraUnavailable') : t('fieldVision.enableCamera')}
                    </div>
                    <div className="text-xs text-white/55">
                      {cameraError
                        ? cameraError
                        : t('fieldVision.permissionRequired')}
                    </div>
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        className="rounded-2xl border border-stroke-2 bg-primary-700/20 px-4 py-2 text-xs font-semibold text-white shadow-glowPrimary hover:border-stroke-3"
                        onClick={() => void startCamera()}
                      >
                        {t('fieldVision.startCamera')}
                      </button>
                      <button
                        type="button"
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
                        onClick={() => setCameraError(null)}
                      >
                        {t('fieldVision.reset')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pointer-events-none absolute inset-x-0 top-0 p-4">
                    <div className="mx-auto w-fit rounded-full border border-white/15 bg-black/35 px-3 py-1 text-xs text-white/70 backdrop-blur-xl">
                      {t('fieldVision.cameraActive')}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mode switcher */}
            <div className="p-3 border-t border-white/10 bg-black/20">
              <div className="flex flex-col gap-2 rounded-3xl border border-white/10 bg-black/40 p-2 backdrop-blur-xl">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => (cameraOn ? stopCamera() : void startCamera())}
                    className={cn(
                      'flex-1 rounded-2xl border px-3 py-2 text-xs font-semibold transition sm:text-sm',
                      cameraOn
                        ? 'border-stroke-3 bg-secondary/10 text-white hover:border-stroke-2'
                        : 'border-stroke-2 bg-primary-700/20 text-white shadow-glowPrimary hover:border-stroke-3',
                    )}
                  >
                    {cameraOn ? t('fieldVision.stopCamera') : t('fieldVision.startCamera')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void capture()}
                    disabled={!cameraOn}
                    className={cn(
                      'flex-1 rounded-2xl border px-3 py-2 text-xs font-semibold transition sm:text-sm',
                      cameraOn
                        ? 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                        : 'cursor-not-allowed border-white/10 bg-white/5 text-white/40',
                    )}
                    aria-label="Capture scan"
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      <Circle size={16} className={cameraOn ? 'text-secondary' : 'text-white/40'} />
                      {t('fieldVision.capture')}
                    </span>
                  </button>
                </div>

                <div className="flex gap-2">
                {([
                  { label: 'Disease Detection', icon: <ShieldAlert size={16} /> },
                  { label: 'Soil Analysis', icon: <TestTubeDiagonal size={16} /> },
                  { label: 'AR Application Guide', icon: <Wand2 size={16} /> },
                ] as const).map((x) => (
                  <button
                    key={x.label}
                    type="button"
                    onClick={() => setMode(x.label)}
                    className={cn(
                      'flex-1 rounded-2xl border px-3 py-2 text-xs font-semibold transition sm:text-sm',
                      mode === x.label
                        ? 'border-stroke-2 bg-primary-700/20 text-white shadow-glowPrimary'
                        : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10',
                    )}
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      {x.icon}
                      <span className="hidden sm:inline">{t(`fieldVision.mode.${x.label}`)}</span>
                      <span className="sm:hidden">{t(`fieldVision.modeShort.${x.label}`)}</span>
                    </span>
                  </button>
                ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <GlassCard className="p-5">
              <div className="agro-h2">{t('fieldVision.scanGuidance')}</div>
              <div className="subtle mt-1">
                {t('fieldVision.currentMode')}: <span className="text-white/80">{t(`fieldVision.mode.${mode}`)}</span>
              </div>
              <div className="mt-4 space-y-3 text-sm text-white/75">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  {t('fieldVision.guide1')}
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  {t('fieldVision.guide2')}
                </div>
                <div className="rounded-2xl border border-stroke-3 bg-secondary/10 p-3">
                  {t('fieldVision.guide3')}
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="agro-h2">{t('fieldVision.history')}</div>
                  <div className="subtle mt-1">{t('fieldVision.recentScans')}</div>
                </div>
                <button
                  type="button"
                  className="glass-chip border-stroke-1 bg-glass-2 hover:border-stroke-2"
                  onClick={() => void (async () => {
                    await clearAllScans()
                    await loadScans()
                  })()}
                >
                  <Trash2 size={14} />
                  {t('common.clear')}
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {sortedScans.length === 0 ? (
                  <div className="col-span-2 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                    {t('fieldVision.noScans')}{' '}
                    <span className="font-semibold text-white">{t('fieldVision.capture')}</span>.
                  </div>
                ) : null}
                {sortedScans.map((h) => (
                  <div
                    key={h.id}
                    className={cn('rounded-3xl border bg-white/5 p-3', 'border-white/10')}
                  >
                    <div className="text-sm font-semibold text-white">
                      {h.title} <span className="text-xs font-semibold text-white/50">· {t(`fieldVision.mode.${h.mode}`)}</span>
                    </div>
                    <div className="mt-1 text-xs text-white/60">{h.meta}</div>
                    <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                      <img src={h.thumbUrl} alt="" className="h-24 w-full object-cover" />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      </GlassCard>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}

