// Mobile bottom navigation — src/components/BottomNav.jsx (new file)
// Scan · Search · Plan · Profile. Hidden on ≥md (desktop uses the top nav).
// Labels come from i18n keys nav.* (see i18n-additions.md).
import { useT } from '../i18n'
import { BarcodeIcon } from './ZocoBrand'

function Item({ active, label, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center gap-1 pt-1 min-h-[44px]"
      aria-current={active ? 'page' : undefined}
    >
      <span className={`flex items-center justify-center w-11 h-7 rounded-full ${active ? 'bg-mint text-deep' : 'text-mute'}`}>
        {children}
      </span>
      <span className={`text-[10.5px] ${active ? 'font-bold text-deep' : 'font-semibold text-mute'}`}>
        {label}
      </span>
    </button>
  )
}

export default function BottomNav({ active, onScan, onSearch, onPlan, onProfile, onHelp }) {
  const { t } = useT()
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-line flex px-2 pt-2 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
      <Item active={active === 'scan'} label={t('nav.scan')} onClick={onScan}>
        <BarcodeIcon className="w-[19px] h-[19px]" strokeWidth={active === 'scan' ? 2.2 : 2} />
      </Item>
      <Item active={active === 'search'} label={t('nav.search')} onClick={onSearch}>
        <svg className="w-[19px] h-[19px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </Item>
      <Item active={active === 'plan'} label={t('nav.plan')} onClick={onPlan}>
        <svg className="w-[19px] h-[19px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10h18M7 15h2m4 0h4M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" />
        </svg>
      </Item>
      <Item active={active === 'profile'} label={t('nav.profile')} onClick={onProfile}>
        <svg className="w-[19px] h-[19px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </Item>
      <Item active={active === 'help'} label={t('nav.help')} onClick={onHelp}>
        <svg className="w-[19px] h-[19px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 3.5M12 17h.01" />
        </svg>
      </Item>
    </nav>
  )
}
