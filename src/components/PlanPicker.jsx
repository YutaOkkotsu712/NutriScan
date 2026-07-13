// Subscription plan picker — the 3 launch tiers (Monthly / Quarterly / Yearly).
// Tapping a tier opens Razorpay checkout for that plan (onPick(planKey)).
//
// PLAY STORE COMPLIANCE: a purchase, so hidden on native — the Android app
// shows the web-only note instead (website-only billing).
import { useT } from '../i18n'
import { PLANS } from '../utils/plans'
import { isNativeApp } from '../utils/platform'

export default function PlanPicker({ onPick, busy }) {
  const { t } = useT()

  if (isNativeApp()) {
    return <p className="text-sm text-moss leading-relaxed text-center px-2">{t('auth.webOnlyPurchase')}</p>
  }

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {PLANS.map((p) => (
        <button
          key={p.key}
          onClick={() => onPick(p.key)}
          disabled={busy}
          className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border transition-all active:scale-[.98] disabled:opacity-50 ${
            p.highlight ? 'border-brand bg-mint/60 shadow-sm' : 'border-edge bg-white'
          }`}
        >
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-[15px] text-ink">{t(`plan.${p.key}`)}</span>
              {p.badgeKey && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-marigold text-spice">
                  {t(p.badgeKey)}
                </span>
              )}
            </div>
            <span className="text-[12px] text-moss">{t(p.periodKey)}</span>
          </div>
          <span className="font-display font-extrabold text-[19px] text-brand shrink-0 ml-3">{p.price}</span>
        </button>
      ))}
    </div>
  )
}
