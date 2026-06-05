import { useEffect, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

export default function PublicNavbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
    setIsMobileMenuOpen(false)
    if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      navigate('/')
    }
  }

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 h-[52px] flex items-center justify-between px-7 border-b transition-all duration-300 ${
        isScrolled || isMobileMenuOpen
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

      {/* Right controls */}
      <div className="flex items-center gap-4">
        {/* Desktop CTA Button */}
        <button
          onClick={() => navigate('/login')}
          className="hidden md:block text-[13px] font-medium text-brand-500 hover:opacity-75 transition-opacity"
        >
          Ingresar →
        </button>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu Panel */}
      {isMobileMenuOpen && (
        <div className="absolute top-[52px] left-0 right-0 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-lg px-7 py-5 flex flex-col gap-4 md:hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <a
            href="/#lp-dashboard"
            onClick={(e) => {
              handleNavClick(e, '#lp-dashboard')
              setIsMobileMenuOpen(false)
            }}
            className="text-[14px] font-medium text-slate-600 hover:text-slate-900 transition-colors py-1"
          >
            Dashboard
          </a>
          <a
            href="/#lp-comunicacion"
            onClick={(e) => {
              handleNavClick(e, '#lp-comunicacion')
              setIsMobileMenuOpen(false)
            }}
            className="text-[14px] font-medium text-slate-600 hover:text-slate-900 transition-colors py-1"
          >
            Comunicación
          </a>
          <a
            href="/#lp-cobranza"
            onClick={(e) => {
              handleNavClick(e, '#lp-cobranza')
              setIsMobileMenuOpen(false)
            }}
            className="text-[14px] font-medium text-slate-600 hover:text-slate-900 transition-colors py-1"
          >
            Cobranza
          </a>
          <a
            href="/#lp-modulos"
            onClick={(e) => {
              handleNavClick(e, '#lp-modulos')
              setIsMobileMenuOpen(false)
            }}
            className="text-[14px] font-medium text-slate-600 hover:text-slate-900 transition-colors py-1"
          >
            Módulos
          </a>
          <a
            href="/#lp-testimonios"
            onClick={(e) => {
              handleNavClick(e, '#lp-testimonios')
              setIsMobileMenuOpen(false)
            }}
            className="text-[14px] font-medium text-slate-600 hover:text-slate-900 transition-colors py-1"
          >
            Testimonios
          </a>
          <Link
            to="/pricing"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`text-[14px] font-medium transition-colors py-1 ${
              location.pathname === '/pricing'
                ? 'text-brand-600 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Precios
          </Link>
          <a
            href="/#lp-contacto"
            onClick={(e) => {
              handleNavClick(e, '#lp-contacto')
              setIsMobileMenuOpen(false)
            }}
            className="text-[14px] font-medium text-slate-600 hover:text-slate-900 transition-colors py-1"
          >
            Contacto
          </a>
          <hr className="border-slate-100 my-1" />
          <button
            onClick={() => {
              navigate('/login')
              setIsMobileMenuOpen(false)
            }}
            className="w-full text-center py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-[14px] font-semibold transition-colors shadow-sm"
          >
            Ingresar
          </button>
        </div>
      )}
    </nav>
  )
}

