import { useEffect, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'

export default function PublicNavbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Helper to handle scrolling to hash or redirecting to home first
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, hash: string) => {
    if (location.pathname !== '/') {
      // If we are not on the landing page, navigate to landing page first with hash
      // React router will handle the navigation, but we might want to let the browser scroll
      // after navigation. We let standard router link redirection work.
    } else {
      // If we are on landing page, prevent default behavior and scroll smoothly
      e.preventDefault()
      const element = document.querySelector(hash)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  const handleLogoClick = () => {
    if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      navigate('/')
    }
  }

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 h-[52px] flex items-center justify-between px-7 border-b transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md border-slate-200/80 shadow-sm'
          : 'bg-white/82 backdrop-blur-md border-black/[0.09]'
      }`}
    >
      {/* Logo */}
      <button
        onClick={handleLogoClick}
        className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.3px] text-slate-900 hover:opacity-80 transition-opacity"
      >
        <span className="text-xl">🌸</span> Bloom Education
      </button>

      {/* Nav Links */}
      <div className="hidden md:flex items-center gap-7">
        <a
          href="/#lp-dashboard"
          onClick={(e) => handleNavClick(e, '#lp-dashboard')}
          className="text-[13px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          Dashboard
        </a>
        <a
          href="/#lp-comunicacion"
          onClick={(e) => handleNavClick(e, '#lp-comunicacion')}
          className="text-[13px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          Comunicación
        </a>
        <a
          href="/#lp-cobranza"
          onClick={(e) => handleNavClick(e, '#lp-cobranza')}
          className="text-[13px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          Cobranza
        </a>
        <a
          href="/#lp-modulos"
          onClick={(e) => handleNavClick(e, '#lp-modulos')}
          className="text-[13px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          Módulos
        </a>
        <a
          href="/#lp-testimonios"
          onClick={(e) => handleNavClick(e, '#lp-testimonios')}
          className="text-[13px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          Testimonios
        </a>
        <Link
          to="/pricing"
          className={`text-[13px] font-medium transition-colors ${
            location.pathname === '/pricing'
              ? 'text-brand-600 font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Precios
        </Link>
        <a
          href="/#lp-contacto"
          onClick={(e) => handleNavClick(e, '#lp-contacto')}
          className="text-[13px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          Contacto
        </a>
      </div>

      {/* CTA Button */}
      <button
        onClick={() => navigate('/login')}
        className="text-[13px] font-medium text-brand-500 hover:opacity-75 transition-opacity"
      >
        Ingresar →
      </button>
    </nav>
  )
}
