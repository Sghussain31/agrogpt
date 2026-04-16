import { useMemo, useState } from 'react'
import { Droplets, FlaskConical, SprayCan, Tractor } from 'lucide-react'
import { GlassCard } from '../components/GlassCard'
import { cn } from '../lib/cn'
import { useTranslation } from 'react-i18next'

type Method = 'Spray' | 'Ground'

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

export function PrecisionPlanningPage() {
  const { t } = useTranslation()
  const [acres, setAcres] = useState(2.0)
  const [method, setMethod] = useState<Method>('Spray')

  const output = useMemo(() => {
    // Pragmatic defaults (placeholders) for a production-ready UI.
    const waterPerAcre = method === 'Spray' ? 180 : 260 // liters
    const fertPerAcre = method === 'Spray' ? 22 : 30 // kg
    const liters = Math.round(acres * waterPerAcre)
    const fertKg = Math.round(acres * fertPerAcre)
    const notes =
      method === 'Spray'
        ? t('planning.notes.spray')
        : t('planning.notes.ground')

    return { liters, fertKg, notes }
  }, [acres, method])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="agro-h1">{t('planning.title')}</div>
          <p className="subtle mt-2 max-w-2xl">
            {t('planning.desc')}
          </p>
        </div>
        <span className="glass-chip">
          {t('planning.landSize')}: <span className="font-semibold text-white">{acres.toFixed(1)} {t('planning.acres')}</span>
        </span>
      </div>

      <GlassCard className="p-6 sm:p-8" variant="strong">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <div className="agro-h2">{t('planning.inputCalculator')}</div>
            <div className="subtle mt-1">{t('planning.sliderHint')}</div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-baseline justify-between">
                <div className="text-sm font-semibold text-white">{t('planning.landSize')}</div>
                <div className="text-2xl font-semibold text-white">{acres.toFixed(1)}</div>
              </div>
              <input
                type="range"
                min={0.5}
                max={25}
                step={0.1}
                value={acres}
                onChange={(e) => setAcres(clamp(parseFloat(e.target.value), 0.5, 25))}
                className="mt-4 w-full accent-[#2E7D32]"
              />
              <div className="mt-2 flex justify-between text-xs text-white/45">
                <span>0.5</span>
                <span>25</span>
              </div>
            </div>

            <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm font-semibold text-white">{t('planning.applicationMethod')}</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {([
                  { label: 'Spray', icon: <SprayCan size={16} /> },
                  { label: 'Ground', icon: <Tractor size={16} /> },
                ] as const).map((x) => (
                  <button
                    key={x.label}
                    type="button"
                    onClick={() => setMethod(x.label)}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-semibold transition',
                      method === x.label
                        ? 'border-stroke-2 bg-primary-700/20 text-white shadow-glowPrimary'
                        : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10',
                    )}
                  >
                    {x.icon}
                    {t(`planning.method.${x.label}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <GlassCard className="p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5">
                  <Droplets size={18} className="text-primary-300" />
                </div>
                <div>
                  <div className="agro-h2">{t('planning.exactWater')}</div>
                  <div className="subtle mt-0.5">{t('planning.litersRequired')}</div>
                </div>
              </div>
              <div className="mt-4 text-4xl font-semibold tracking-tight text-white">
                {output.liters.toLocaleString()}
                <span className="ml-2 text-base font-semibold text-white/60">L</span>
              </div>
              <div className="subtle mt-2">{t('planning.adjustedFor')} {t(`planning.method.${method}`).toLowerCase()} {t('planning.application')}.</div>
            </GlassCard>

            <GlassCard className="p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5">
                  <FlaskConical size={18} className="text-secondary" />
                </div>
                <div>
                  <div className="agro-h2">{t('planning.exactFertilizer')}</div>
                  <div className="subtle mt-0.5">{t('planning.kgRequired')}</div>
                </div>
              </div>
              <div className="mt-4 text-4xl font-semibold tracking-tight text-white">
                {output.fertKg.toLocaleString()}
                <span className="ml-2 text-base font-semibold text-white/60">kg</span>
              </div>
              <div className="subtle mt-2">{t('planning.placeholderDose')}</div>
            </GlassCard>

            <GlassCard className="p-5">
              <div className="agro-h2">{t('planning.applicationMethod')}</div>
              <div className="mt-3 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm leading-relaxed text-white/75">
                {output.notes}
              </div>
            </GlassCard>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}

