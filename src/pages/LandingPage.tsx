import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const navigate = useNavigate()
  const petalsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Scroll reveal
    const obs = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('lp-visible')
            obs.unobserve(e.target)
          }
        })
      },
      { threshold: 0.07 }
    )
    document.querySelectorAll('.lp-reveal').forEach(el => obs.observe(el))

    // Nav background on scroll
    const onScroll = () => {
      const nav = document.getElementById('lp-nav')
      if (nav)
        nav.style.background =
          window.scrollY > 10 ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.82)'
    }
    window.addEventListener('scroll', onScroll)

    // Floating petals
    if (petalsRef.current) {
      const chars = ['🌸', '🌺', '🌼', '🌷', '✿']
      chars.forEach(ch => {
        for (let j = 0; j < 4; j++) {
          const el = document.createElement('span')
          el.className = 'lp-petal'
          el.textContent = ch
          el.style.cssText = `left:${Math.random() * 100}%;animation-duration:${9 + Math.random() * 12}s;animation-delay:${Math.random() * 15}s;font-size:${10 + Math.random() * 8}px`
          petalsRef.current!.appendChild(el)
        }
      })
    }

    return () => {
      obs.disconnect()
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <>
      {/* ── SCOPED STYLES ────────────────────────────────────── */}
      <style>{`
        .lp-root {
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif;
          background: #fff;
          color: #1d1d1f;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }

        /* CSS variables scoped to landing */
        .lp-root {
          --lp-white:    #ffffff;
          --lp-bg:       #f5f5f7;
          --lp-ink:      #1d1d1f;
          --lp-ink2:     #424245;
          --lp-muted:    #6e6e73;
          --lp-border:   #d2d2d7;
          --lp-border-l: #e8e8ed;
          --lp-pink:     #ff375f;
          --lp-pink-l:   #fff0f3;
          --lp-violet:   #8b5cf6;
          --lp-blue:     #0071e3;
          --lp-blue-l:   #e8f2ff;
          --lp-green:    #1db954;
          --lp-green-l:  #edfbf2;
          --lp-amber:    #f59e0b;
          --lp-amber-l:  #fffbeb;
          --lp-teal:     #0d9488;
          --lp-serif:    -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
          --lp-ease:     cubic-bezier(.4, 0, .2, 1);
          --lp-spring:   cubic-bezier(.22, 1, .36, 1);
        }

        /* ── NAV ── */
        .lp-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 200; height: 52px;
          background: rgba(255,255,255,.82);
          backdrop-filter: saturate(180%) blur(20px);
          -webkit-backdrop-filter: saturate(180%) blur(20px);
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 28px;
          border-bottom: 1px solid rgba(0,0,0,.09);
          transition: background .3s;
        }
        .lp-nav-logo {
          display: flex; align-items: center; gap: 8px;
          text-decoration: none; color: var(--lp-ink);
          font-size: 17px; font-weight: 600; letter-spacing: -.3px;
          cursor: pointer; background: none; border: none;
        }
        .lp-nav-logo-icon { font-size: 20px; }
        .lp-nav-links { display: flex; }
        .lp-nav-links a {
          font-size: 13px; color: var(--lp-muted);
          text-decoration: none; padding: 0 14px; transition: color .2s;
        }
        .lp-nav-links a:hover { color: var(--lp-ink); }
        .lp-nav-cta {
          font-size: 13px; color: var(--lp-blue);
          text-decoration: none; padding: 0 14px; font-weight: 400;
          transition: opacity .2s; cursor: pointer; background: none; border: none;
        }
        .lp-nav-cta:hover { opacity: .7; }

        /* ── HERO ── */
        .lp-hero {
          min-height: 100vh;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          text-align: center;
          background: linear-gradient(180deg, #fff9fc 0%, #f5f0ff 40%, #e8f4ff 100%);
          padding: 120px 24px 80px;
          position: relative; overflow: hidden;
        }
        .lp-orb {
          position: absolute; border-radius: 50%; pointer-events: none;
        }
        .lp-orb-a { width: 700px; height: 700px; top: -200px; left: -100px; background: radial-gradient(circle, rgba(255,55,95,.08) 0%, transparent 65%); }
        .lp-orb-b { width: 600px; height: 600px; top: -100px; right: -150px; background: radial-gradient(circle, rgba(139,92,246,.09) 0%, transparent 65%); }
        .lp-orb-c { width: 500px; height: 500px; bottom: -100px; left: 50%; transform: translateX(-50%); background: radial-gradient(circle, rgba(0,113,227,.07) 0%, transparent 65%); }

        .lp-petals { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
        .lp-petal { position: absolute; opacity: 0; animation: lpPetalDrift linear infinite; }
        @keyframes lpPetalDrift {
          0%   { opacity: 0; transform: translateY(-30px) rotate(0deg); }
          10%  { opacity: .5; }
          90%  { opacity: .2; }
          100% { opacity: 0; transform: translateY(100vh) rotate(540deg); }
        }

        .lp-hero-tag {
          display: inline-flex; align-items: center; gap: 7px;
          background: rgba(255,55,95,.08); border: 1px solid rgba(255,55,95,.15);
          border-radius: 100px; padding: 5px 14px 5px 8px;
          font-size: 13px; font-weight: 600; color: var(--lp-pink);
          margin-bottom: 26px; letter-spacing: .2px;
          animation: lpFadeUp .8s var(--lp-spring) both;
        }
        .lp-tag-dot {
          width: 6px; height: 6px; border-radius: 50%; background: var(--lp-green);
          animation: lpPulse 2s infinite;
        }
        @keyframes lpPulse { 0%,100% { opacity:1;transform:scale(1); } 50% { opacity:.5;transform:scale(1.5); } }

        .lp-hero-h1 {
          font-family: var(--lp-serif);
          font-size: clamp(52px, 7.5vw, 96px);
          font-weight: 700; letter-spacing: -.025em; line-height: 1.03;
          color: var(--lp-ink); margin-bottom: 24px;
          animation: lpFadeUp .9s var(--lp-spring) .1s both;
        }
        .lp-hero-h1 .lp-grad {
          background: linear-gradient(135deg, #ff375f 0%, #8b5cf6 50%, #0071e3 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .lp-hero-sub {
          font-size: 21px; font-weight: 300; line-height: 1.6;
          color: var(--lp-muted); max-width: 580px; margin: 0 auto 40px;
          animation: lpFadeUp .9s var(--lp-spring) .2s both;
        }
        .lp-hero-actions {
          display: flex; align-items: center; justify-content: center; gap: 14px;
          animation: lpFadeUp .9s var(--lp-spring) .3s both;
        }
        .lp-btn-primary {
          background: var(--lp-blue); color: #fff; border: none; border-radius: 980px;
          padding: 15px 30px; font-size: 17px; font-weight: 400;
          font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
          cursor: pointer; display: inline-flex; align-items: center; gap: 7px;
          box-shadow: 0 4px 20px rgba(0,113,227,.3);
          transition: background .2s, transform .2s var(--lp-spring), box-shadow .2s;
        }
        .lp-btn-primary:hover { background: #0077ed; transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,113,227,.4); }
        .lp-btn-secondary {
          background: rgba(0,113,227,.08); color: var(--lp-blue);
          border: 1px solid rgba(0,113,227,.2); border-radius: 980px;
          padding: 14px 28px; font-size: 17px; font-weight: 400;
          font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
          cursor: pointer; display: inline-flex; align-items: center; gap: 7px;
          transition: background .2s, transform .2s;
        }
        .lp-btn-secondary:hover { background: rgba(0,113,227,.13); transform: translateY(-1px); }

        .lp-hero-proof {
          display: flex; align-items: center; justify-content: center; gap: 20px;
          margin-top: 52px; padding-top: 40px; border-top: 1px solid var(--lp-border-l);
          animation: lpFadeUp .9s var(--lp-spring) .4s both; flex-wrap: wrap;
        }
        .lp-proof-item { text-align: center; }
        .lp-proof-num { font-family: var(--lp-serif); font-size: 36px; font-weight: 700; letter-spacing: -.02em; line-height: 1; }
        .lp-proof-lbl { font-size: 13px; color: var(--lp-muted); margin-top: 3px; }
        .lp-proof-div { width: 1px; height: 36px; background: var(--lp-border); }

        /* ── SECTIONS ── */
        .lp-sec { padding: 120px 24px; text-align: center; }
        .lp-sec-eye { font-size: 15px; font-weight: 600; color: var(--lp-pink); letter-spacing: .2px; margin-bottom: 10px; }
        .lp-sec-h {
          font-family: var(--lp-serif); font-size: clamp(38px, 5vw, 64px);
          font-weight: 700; letter-spacing: -.022em; line-height: 1.07;
          color: var(--lp-ink); margin-bottom: 18px;
        }
        .lp-sec-sub { font-size: 19px; font-weight: 300; color: var(--lp-muted); max-width: 560px; margin: 0 auto; }
        .lp-feat-inner { max-width: 960px; margin: 0 auto; text-align: center; }

        /* ── FEATURE: DASHBOARD ── */
        .lp-feat-dash { background: var(--lp-white); padding: 100px 24px; }
        .lp-feat-comm { background: var(--lp-bg); padding: 100px 24px; }
        .lp-feat-cobro { background: var(--lp-white); padding: 100px 24px; }

        .lp-dash {
          background: var(--lp-white); border-radius: 20px; overflow: hidden;
          box-shadow: 0 2px 0 var(--lp-border-l), 0 20px 60px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.04);
          border: 1px solid var(--lp-border-l); margin-top: 56px;
        }
        .lp-dash-bar {
          background: var(--lp-bg); padding: 14px 18px;
          display: flex; align-items: center; gap: 7px;
          border-bottom: 1px solid var(--lp-border-l);
        }
        .lp-wdot { width: 12px; height: 12px; border-radius: 50%; }
        .lp-dash-bar-title { font-size: 13px; color: var(--lp-muted); margin-left: 6px; font-weight: 500; }
        .lp-dash-body { padding: 24px; display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; }
        .lp-dstat { background: var(--lp-bg); border-radius: 14px; padding: 20px; border: 1px solid var(--lp-border-l); }
        .lp-dstat-num { font-family: var(--lp-serif); font-size: 38px; font-weight: 700; letter-spacing: -.02em; line-height: 1; margin-bottom: 4px; }
        .lp-dstat-lbl { font-size: 12px; color: var(--lp-muted); }
        .lp-dash-row2 { grid-column: span 4; display: grid; grid-template-columns: 2fr 1fr; gap: 14px; }
        .lp-dchart { background: var(--lp-bg); border-radius: 14px; padding: 22px; border: 1px solid var(--lp-border-l); }
        .lp-dchart-title { font-size: 13px; color: var(--lp-muted); font-weight: 600; margin-bottom: 18px; }
        .lp-dbars { display: flex; align-items: flex-end; gap: 8px; height: 72px; }
        .lp-dbar { flex: 1; border-radius: 5px 5px 0 0; }
        .lp-dlist { background: var(--lp-bg); border-radius: 14px; padding: 20px; border: 1px solid var(--lp-border-l); }
        .lp-dlist-title { font-size: 13px; color: var(--lp-muted); font-weight: 600; margin-bottom: 14px; }
        .lp-drow { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--lp-border-l); }
        .lp-drow:last-child { border-bottom: none; }
        .lp-dav { width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; color: #fff; }
        .lp-dname { font-size: 12px; color: var(--lp-ink2); flex: 1; font-weight: 500; }
        .lp-damt { font-size: 12px; font-weight: 700; }

        /* ── FEATURE: COMUNICACIÓN ── */
        .lp-comm-mock {
          background: #fff; border-radius: 20px; overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.04);
          border: 1px solid var(--lp-border-l); margin-top: 56px; text-align: left;
          max-width: 640px; margin-left: auto; margin-right: auto;
        }
        .lp-comm-bar { background: var(--lp-bg); padding: 14px 20px; display: flex; align-items: center; gap: 7px; border-bottom: 1px solid var(--lp-border-l); }
        .lp-comm-body { padding: 24px 28px; }
        .lp-cmsg { padding: 14px 18px; border-radius: 16px; margin-bottom: 12px; }
        .lp-cmsg-school { background: var(--lp-bg); border: 1px solid var(--lp-border-l); }
        .lp-cmsg-school .lp-sender { font-size: 11px; color: var(--lp-muted); font-weight: 600; margin-bottom: 5px; letter-spacing: .2px; text-transform: uppercase; }
        .lp-cmsg-school .lp-txt { font-size: 15px; color: var(--lp-ink); line-height: 1.45; }
        .lp-urgente-badge { display: inline-block; background: var(--lp-pink); color: #fff; font-size: 10px; font-weight: 700; padding: 2px 9px; border-radius: 100px; margin-bottom: 7px; letter-spacing: .5px; }
        .lp-cmsg-parent { background: var(--lp-blue); margin-left: 48px; border-radius: 16px 16px 4px 16px; }
        .lp-cmsg-parent .lp-txt { font-size: 15px; color: #fff; line-height: 1.45; }
        .lp-cmsg-parent .lp-meta { font-size: 11px; color: rgba(255,255,255,.55); margin-top: 5px; text-align: right; }
        .lp-comm-footer { padding: 12px 24px; background: var(--lp-bg); border-top: 1px solid var(--lp-border-l); font-size: 13px; color: var(--lp-muted); text-align: center; }

        /* ── FEATURE: COBRANZA ── */
        .lp-cobro-mock {
          background: #fff; border-radius: 20px; overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.04);
          border: 1px solid var(--lp-border-l); margin-top: 56px; text-align: left;
        }
        .lp-cobro-head { padding: 26px 28px 20px; border-bottom: 1px solid var(--lp-border-l); }
        .lp-cobro-title { font-family: var(--lp-serif); font-size: 22px; font-weight: 700; color: var(--lp-ink); letter-spacing: -.02em; }
        .lp-cobro-meta { font-size: 13px; color: var(--lp-muted); margin-top: 3px; }
        .lp-cobro-stats { display: grid; grid-template-columns: 1fr 1fr 1fr; border-bottom: 1px solid var(--lp-border-l); }
        .lp-cstat-cell { padding: 20px 24px; text-align: center; }
        .lp-cstat-cell + .lp-cstat-cell { border-left: 1px solid var(--lp-border-l); }
        .lp-cstat-n { font-family: var(--lp-serif); font-size: 26px; font-weight: 700; letter-spacing: -.02em; line-height: 1; }
        .lp-cstat-l { font-size: 12px; color: var(--lp-muted); margin-top: 4px; }
        .lp-cobro-rows { padding: 8px 28px 20px; }
        .lp-crow { display: flex; align-items: center; gap: 14px; padding: 13px 0; border-bottom: 1px solid var(--lp-border-l); }
        .lp-crow:last-child { border-bottom: none; }
        .lp-cav { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #fff; }
        .lp-cinfo { flex: 1; }
        .lp-cname { font-size: 15px; font-weight: 600; color: var(--lp-ink); }
        .lp-cchild { font-size: 12px; color: var(--lp-muted); margin-top: 2px; }
        .lp-camt { font-size: 16px; font-weight: 700; color: var(--lp-ink2); margin-right: 10px; }
        .lp-badge-paid { background: var(--lp-green-l); color: #166534; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 100px; border: 1px solid rgba(29,185,84,.2); }
        .lp-badge-pend { background: var(--lp-amber-l); color: #92400e; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 100px; border: 1px solid rgba(245,158,11,.2); }
        .lp-badge-due  { background: #fff0f3; color: #9f1239; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 100px; border: 1px solid rgba(255,55,95,.2); }

        /* ── BENTO ── */
        .lp-bento-sec { background: var(--lp-bg); padding: 80px 24px; text-align: center; }
        .lp-bento { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; max-width: 1100px; margin: 56px auto 0; text-align: left; }
        .lp-bc { border-radius: 20px; padding: 36px 38px; overflow: hidden; position: relative; transition: transform .3s var(--lp-spring), box-shadow .3s; }
        .lp-bc:hover { transform: translateY(-4px); box-shadow: 0 16px 48px rgba(0,0,0,.1); }
        .lp-bc.lp-wide { grid-column: span 2; }
        .lp-bc-rose   { background: #fff0f3; border: 1px solid rgba(255,55,95,.12); }
        .lp-bc-violet { background: #f5f0ff; border: 1px solid rgba(139,92,246,.12); }
        .lp-bc-blue   { background: #e8f2ff; border: 1px solid rgba(0,113,227,.12); }
        .lp-bc-green  { background: #edfbf2; border: 1px solid rgba(29,185,84,.12); }
        .lp-bc-amber  { background: #fffbeb; border: 1px solid rgba(245,158,11,.12); }
        .lp-bc-slate  { background: #f8f8fa; border: 1px solid var(--lp-border-l); }
        .lp-bc-eye { font-size: 12px; font-weight: 700; letter-spacing: .8px; text-transform: uppercase; margin-bottom: 10px; opacity: .65; }
        .lp-bc-rose   .lp-bc-eye { color: var(--lp-pink); }
        .lp-bc-violet .lp-bc-eye { color: var(--lp-violet); }
        .lp-bc-blue   .lp-bc-eye { color: var(--lp-blue); }
        .lp-bc-green  .lp-bc-eye { color: var(--lp-green); }
        .lp-bc-amber  .lp-bc-eye { color: var(--lp-amber); }
        .lp-bc-slate  .lp-bc-eye { color: var(--lp-muted); }
        .lp-bc-h { font-family: var(--lp-serif); font-size: clamp(22px,2.2vw,28px); font-weight: 700; letter-spacing: -.018em; line-height: 1.12; margin-bottom: 10px; color: var(--lp-ink); }
        .lp-bc-p { font-size: 14px; font-weight: 300; line-height: 1.65; color: var(--lp-ink2); }
        .lp-bc-stat-row { display: flex; gap: 20px; margin-top: 22px; flex-wrap: wrap; }
        .lp-bcs-num { font-family: var(--lp-serif); font-size: 36px; font-weight: 700; letter-spacing: -.02em; line-height: 1; }
        .lp-bc-rose   .lp-bcs-num { color: var(--lp-pink); }
        .lp-bc-violet .lp-bcs-num { color: var(--lp-violet); }
        .lp-bc-blue   .lp-bcs-num { color: var(--lp-blue); }
        .lp-bc-green  .lp-bcs-num { color: var(--lp-green); }
        .lp-bc-amber  .lp-bcs-num { color: var(--lp-amber); }
        .lp-bcs-lbl { font-size: 12px; color: var(--lp-muted); margin-top: 3px; }
        .lp-bc-list { list-style: none; margin-top: 20px; }
        .lp-bc-list li { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,.05); font-size: 14px; color: var(--lp-ink2); }
        .lp-bc-list li:last-child { border-bottom: none; }
        .lp-bcdot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .lp-bc-bignum { font-family: var(--lp-serif); font-size: 80px; font-weight: 700; letter-spacing: -.03em; line-height: 1; margin-top: 16px; opacity: .18; }
        .lp-minibars { display: flex; align-items: flex-end; gap: 5px; height: 52px; margin-top: 20px; }
        .lp-mbar { flex: 1; border-radius: 4px 4px 0 0; }

        /* ── TESTIMONIALS ── */
        .lp-testi-sec { background: var(--lp-white); padding: 120px 24px; text-align: center; }
        .lp-tgrid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; max-width: 1100px; margin: 60px auto 0; }
        .lp-tcard {
          background: var(--lp-bg); border: 1px solid var(--lp-border-l); border-radius: 20px; padding: 36px;
          transition: transform .3s var(--lp-spring), box-shadow .3s, border-color .3s;
        }
        .lp-tcard:hover { transform: translateY(-4px); box-shadow: 0 16px 48px rgba(0,0,0,.08); border-color: var(--lp-border); }
        .lp-tstars { display: flex; gap: 2px; margin-bottom: 20px; }
        .lp-tstar { font-size: 15px; color: #ff9f0a; }
        .lp-tquote { font-family: var(--lp-serif); font-size: 19px; font-weight: 600; line-height: 1.45; color: var(--lp-ink); margin-bottom: 24px; letter-spacing: -.015em; }
        .lp-tauthor { display: flex; align-items: center; gap: 12px; }
        .lp-tav { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 700; color: #fff; flex-shrink: 0; }
        .lp-tname { font-size: 15px; font-weight: 600; color: var(--lp-ink); }
        .lp-trole { font-size: 13px; color: var(--lp-muted); margin-top: 2px; }

        /* ── CTA ── */
        .lp-cta-sec {
          background: linear-gradient(180deg, #fdf5ff 0%, #ffe8f0 40%, #e8f2ff 100%);
          padding: 160px 24px; text-align: center; position: relative; overflow: hidden;
        }
        .lp-cta-orb-a { position: absolute; width: 600px; height: 600px; border-radius: 50%; top: -200px; left: -100px; background: radial-gradient(circle, rgba(255,55,95,.1) 0%, transparent 65%); pointer-events: none; }
        .lp-cta-orb-b { position: absolute; width: 500px; height: 500px; border-radius: 50%; bottom: -150px; right: -100px; background: radial-gradient(circle, rgba(0,113,227,.1) 0%, transparent 65%); pointer-events: none; }
        .lp-cta-h {
          font-family: var(--lp-serif); font-size: clamp(48px, 6.5vw, 84px);
          font-weight: 700; letter-spacing: -.025em; line-height: 1.02;
          color: var(--lp-ink); margin-bottom: 22px; position: relative;
        }
        .lp-cta-h .lp-grad {
          background: linear-gradient(135deg, #ff375f 0%, #8b5cf6 55%, #0071e3 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .lp-cta-sub { font-size: 21px; font-weight: 300; color: var(--lp-muted); max-width: 520px; margin: 0 auto 44px; position: relative; }
        .lp-cta-actions { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; position: relative; }
        .lp-cta-note { font-size: 14px; color: var(--lp-muted); margin-top: 22px; position: relative; }
        .lp-cta-note a { color: var(--lp-blue); text-decoration: none; }
        .lp-cta-note a:hover { text-decoration: underline; }

        /* ── FOOTER ── */
        .lp-footer { background: var(--lp-bg); border-top: 1px solid var(--lp-border-l); padding: 40px 28px; }
        .lp-foot-inner { max-width: 1100px; margin: 0 auto; }
        .lp-foot-top { display: flex; justify-content: space-between; align-items: center; padding-bottom: 24px; border-bottom: 1px solid var(--lp-border-l); margin-bottom: 20px; flex-wrap: wrap; gap: 16px; }
        .lp-foot-brand { font-size: 17px; font-weight: 600; color: var(--lp-ink); display: flex; align-items: center; gap: 8px; }
        .lp-foot-links { display: flex; gap: 24px; flex-wrap: wrap; }
        .lp-foot-links a { font-size: 13px; color: var(--lp-muted); text-decoration: none; transition: color .2s; }
        .lp-foot-links a:hover { color: var(--lp-ink); }
        .lp-foot-copy { font-size: 12px; color: var(--lp-muted); display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; }

        /* ── SCROLL REVEAL ── */
        @keyframes lpFadeUp { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
        .lp-reveal { opacity: 0; transform: translateY(32px); transition: opacity .9s var(--lp-spring), transform .9s var(--lp-spring); }
        .lp-reveal.lp-visible { opacity: 1; transform: translateY(0); }
        .lp-d1 { transition-delay: .06s; }
        .lp-d2 { transition-delay: .12s; }
        .lp-d3 { transition-delay: .18s; }

        /* ── RESPONSIVE ── */
        @media(max-width:1024px) {
          .lp-bento { grid-template-columns: 1fr 1fr; }
          .lp-bc.lp-wide { grid-column: span 1; }
          .lp-tgrid { grid-template-columns: 1fr 1fr; }
          .lp-nav-links { display: none; }
          .lp-dash-body { grid-template-columns: 1fr 1fr; }
          .lp-dash-row2 { grid-column: span 2; }
          .lp-cobro-stats { grid-template-columns: 1fr 1fr; }
        }
        @media(max-width:640px) {
          .lp-bento { grid-template-columns: 1fr; }
          .lp-tgrid { grid-template-columns: 1fr; }
          .lp-hero-proof { flex-direction: column; gap: 16px; }
          .lp-proof-div { width: 40px; height: 1px; }
          .lp-cta-actions { flex-direction: column; align-items: center; }
          .lp-dash-body { grid-template-columns: 1fr; }
          .lp-dash-row2 { grid-column: span 1; }
          .lp-cobro-stats { grid-template-columns: 1fr; }
          .lp-foot-top { flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      <div className="lp-root">

        {/* ── NAV ── */}
        <nav className="lp-nav" id="lp-nav">
          <button className="lp-nav-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            Bloom Education
          </button>
          <div className="lp-nav-links">
            <a href="#lp-dashboard">Dashboard</a>
            <a href="#lp-comunicacion">Comunicación</a>
            <a href="#lp-cobranza">Cobranza</a>
            <a href="#lp-modulos">Módulos</a>
            <a href="#lp-testimonios">Testimonios</a>
          </div>
          <button className="lp-nav-cta" onClick={() => navigate('/login')}>
            Ingresar →
          </button>
        </nav>

        {/* ── HERO ── */}
        <section className="lp-hero">
          <div className="lp-orb lp-orb-a" />
          <div className="lp-orb lp-orb-b" />
          <div className="lp-orb lp-orb-c" />
          <div className="lp-petals" ref={petalsRef} />

          <h1 className="lp-hero-h1">
            Menos papeleo,<br />
            <span className="lp-grad">Más sonrisas</span>
          </h1>

          <p className="lp-hero-sub">
            La plataforma que gestiona todo tu jardín infantil — para que puedas enfocarte en lo que más importa: los niños.
          </p>

          <div className="lp-hero-actions">
            <button className="lp-btn-primary" style={{ backgroundColor: 'var(--lp-ink)', boxShadow: 'none' }} onClick={() => navigate('/login')}>
              Ingresa a la Demo
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>

          <div className="lp-hero-proof">
            <div className="lp-proof-item">
              <div className="lp-proof-num" style={{ color: 'var(--lp-pink)' }}>+240</div>
              <div className="lp-proof-lbl">educadoras activas</div>
            </div>
            <div className="lp-proof-div" />
            <div className="lp-proof-item">
              <div className="lp-proof-num" style={{ color: 'var(--lp-violet)' }}>8</div>
              <div className="lp-proof-lbl">módulos integrados</div>
            </div>
            <div className="lp-proof-div" />
            <div className="lp-proof-item">
              <div className="lp-proof-num" style={{ color: 'var(--lp-blue)' }}>30</div>
              <div className="lp-proof-lbl">días gratis</div>
            </div>
            <div className="lp-proof-div" />
            <div className="lp-proof-item">
              <div className="lp-proof-num" style={{ color: 'var(--lp-green)' }}>94%</div>
              <div className="lp-proof-lbl">satisfacción</div>
            </div>
          </div>
        </section>

        {/* ── FEATURE: DASHBOARD ── */}
        <section className="lp-feat-dash lp-sec" id="lp-dashboard">
          <div className="lp-feat-inner">
            <p className="lp-sec-eye lp-reveal" style={{ color: 'var(--lp-blue)' }}>Tu jardín, de un vistazo</p>
            <h2 className="lp-sec-h lp-reveal lp-d1">Todo lo que necesitas<br />saber. Cada mañana.</h2>
            <p className="lp-sec-sub lp-reveal lp-d2">Un dashboard que resume niños, cobros, comunicados y personal en una sola pantalla limpia.</p>
            <div className="lp-dash lp-reveal lp-d3">
              <div className="lp-dash-bar">
                <div className="lp-wdot" style={{ background: '#ff5f57' }} />
                <div className="lp-wdot" style={{ background: '#febc2e' }} />
                <div className="lp-wdot" style={{ background: '#28c840' }} />
                <span className="lp-dash-bar-title">Bloom Education — Dashboard</span>
              </div>
              <div className="lp-dash-body">
                <div className="lp-dstat"><div className="lp-dstat-num" style={{ color: 'var(--lp-pink)' }}>485</div><div className="lp-dstat-lbl">Estudiantes activos</div></div>
                <div className="lp-dstat"><div className="lp-dstat-num" style={{ color: 'var(--lp-violet)' }}>34</div><div className="lp-dstat-lbl">Funcionarios</div></div>
                <div className="lp-dstat"><div className="lp-dstat-num" style={{ color: 'var(--lp-green)' }}>87%</div><div className="lp-dstat-lbl">Cobranza mes</div></div>
                <div className="lp-dstat"><div className="lp-dstat-num" style={{ color: 'var(--lp-amber)' }}>10</div><div className="lp-dstat-lbl">Cursos activos</div></div>
                <div className="lp-dash-row2">
                  <div className="lp-dchart">
                    <div className="lp-dchart-title">Recaudación — últimos 6 meses</div>
                    <div className="lp-dbars">
                      <div className="lp-dbar" style={{ height: '52%', background: 'rgba(255,55,95,.15)' }} />
                      <div className="lp-dbar" style={{ height: '68%', background: 'rgba(255,55,95,.2)' }} />
                      <div className="lp-dbar" style={{ height: '58%', background: 'rgba(255,55,95,.2)' }} />
                      <div className="lp-dbar" style={{ height: '79%', background: 'rgba(255,55,95,.28)' }} />
                      <div className="lp-dbar" style={{ height: '63%', background: 'rgba(255,55,95,.28)' }} />
                      <div className="lp-dbar" style={{ height: '100%', background: 'linear-gradient(180deg,var(--lp-pink),var(--lp-violet))' }} />
                    </div>
                  </div>
                  <div className="lp-dlist">
                    <div className="lp-dlist-title">Cobros recientes</div>
                    <div className="lp-drow"><div className="lp-dav" style={{ background: 'linear-gradient(135deg,#ff375f,#8b5cf6)' }}>FL</div><span className="lp-dname">Francisco López</span><span className="lp-damt" style={{ color: 'var(--lp-green)' }}>$85.000</span></div>
                    <div className="lp-drow"><div className="lp-dav" style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>RT</div><span className="lp-dname">Rosa Torres</span><span className="lp-damt" style={{ color: 'var(--lp-amber)' }}>Pendiente</span></div>
                    <div className="lp-drow"><div className="lp-dav" style={{ background: 'linear-gradient(135deg,#1db954,#0d9488)' }}>EH</div><span className="lp-dname">Elena Herrera</span><span className="lp-damt" style={{ color: 'var(--lp-green)' }}>$85.000</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURE: COMUNICACIÓN ── */}
        <section className="lp-feat-comm lp-sec" id="lp-comunicacion">
          <div className="lp-feat-inner">
            <p className="lp-sec-eye lp-reveal" style={{ color: 'var(--lp-violet)' }}>Sin llamadas. Sin cuadernos.</p>
            <h2 className="lp-sec-h lp-reveal lp-d1">Habla con las familias<br />cuando ellas puedan leer.</h2>
            <p className="lp-sec-sub lp-reveal lp-d2">Comunicados, avisos urgentes y confirmaciones de lectura — en un canal organizado que todos entienden.</p>
            <div className="lp-comm-mock lp-reveal lp-d3">
              <div className="lp-comm-bar">
                <div className="lp-wdot" style={{ background: '#ff5f57' }} />
                <div className="lp-wdot" style={{ background: '#febc2e' }} />
                <div className="lp-wdot" style={{ background: '#28c840' }} />
                <span style={{ fontSize: 13, color: 'var(--lp-muted)', marginLeft: 8, fontWeight: 500 }}>Bloom Education — Mensajes</span>
              </div>
              <div className="lp-comm-body">
                <div className="lp-cmsg lp-cmsg-school">
                  <div className="lp-urgente-badge">URGENTE</div>
                  <div className="lp-sender">Jardín Las Rosas · Hoy 08:30</div>
                  <div className="lp-txt">Buenos días familias. Mañana <strong>no hay clases</strong> por consejo de profesores. Los esperamos el jueves con normalidad. 🌸</div>
                </div>
                <div className="lp-cmsg lp-cmsg-parent">
                  <div className="lp-txt">Gracias por avisar con tiempo 😊 ¿Se recupera la hora de psicomotricidad?</div>
                  <div className="lp-meta">Cecilia M. (mamá de Sofía) · 08:47 ✓✓</div>
                </div>
                <div className="lp-cmsg lp-cmsg-school">
                  <div className="lp-sender">Tía Carmen · 08:52</div>
                  <div className="lp-txt">Sí Cecilia, la recuperamos el viernes. ¡Buen día a todos! 💛</div>
                </div>
              </div>
              <div className="lp-comm-footer">Leído por 34 de 38 apoderados · Hace 5 min</div>
            </div>
          </div>
        </section>

        {/* ── FEATURE: COBRANZA ── */}
        <section className="lp-feat-cobro lp-sec" id="lp-cobranza">
          <div className="lp-feat-inner">
            <p className="lp-sec-eye lp-reveal" style={{ color: 'var(--lp-green)' }}>Sin planillas Excel. Sin olvidos.</p>
            <h2 className="lp-sec-h lp-reveal lp-d1">La cobranza que siempre<br />quisiste tener.</h2>
            <p className="lp-sec-sub lp-reveal lp-d2">Mensualidades, alertas automáticas de vencimiento y registro de cada pago — en segundos.</p>
            <div className="lp-cobro-mock lp-reveal lp-d3">
              <div className="lp-cobro-head">
                <div className="lp-cobro-title">Cobranza — Marzo 2025</div>
                <div className="lp-cobro-meta">38 apoderados · Actualizado hace 2 minutos</div>
              </div>
              <div className="lp-cobro-stats">
                <div className="lp-cstat-cell"><div className="lp-cstat-n" style={{ color: 'var(--lp-green)' }}>$3.230.000</div><div className="lp-cstat-l">Recaudado ✓</div></div>
                <div className="lp-cstat-cell"><div className="lp-cstat-n" style={{ color: 'var(--lp-amber)' }}>$340.000</div><div className="lp-cstat-l">Pendiente ⏳</div></div>
                <div className="lp-cstat-cell"><div className="lp-cstat-n" style={{ color: 'var(--lp-pink)' }}>$85.000</div><div className="lp-cstat-l">Vencido !</div></div>
              </div>
              <div className="lp-cobro-rows">
                {[
                  { av: 'FL', avBg: 'linear-gradient(135deg,#ff375f,#8b5cf6)', name: 'Francisco López', child: 'Sofía · Pre-kínder A', badge: 'paid' },
                  { av: 'RT', avBg: 'linear-gradient(135deg,#f59e0b,#f97316)', name: 'Rosa Torres', child: 'Mateo · Kínder A', badge: 'pend' },
                  { av: 'MR', avBg: 'linear-gradient(135deg,#ff375f,#ff6b6b)', name: 'Marco Reyes', child: 'Valentina · 1° A', badge: 'due' },
                  { av: 'EH', avBg: 'linear-gradient(135deg,#1db954,#0d9488)', name: 'Elena Herrera', child: 'Benjamín · 1° A', badge: 'paid' },
                ].map(({ av, avBg, name, child, badge }) => (
                  <div className="lp-crow" key={name}>
                    <div className="lp-cav" style={{ background: avBg }}>{av}</div>
                    <div className="lp-cinfo"><div className="lp-cname">{name}</div><div className="lp-cchild">{child}</div></div>
                    <span className="lp-camt">$85.000</span>
                    <span className={`lp-badge-${badge}`}>{badge === 'paid' ? 'Pagado ✓' : badge === 'pend' ? 'Pendiente' : 'Vencido !'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── BENTO ── */}
        <section className="lp-bento-sec" id="lp-modulos">
          <p className="lp-sec-eye lp-reveal">Todo incluido</p>
          <h2 className="lp-sec-h lp-reveal lp-d1">8 módulos.<br />Una sola plataforma.</h2>
          <p className="lp-sec-sub lp-reveal lp-d2">Todo lo que necesita un jardín infantil moderno — desde el primer día.</p>
          <div className="lp-bento">
            <div className="lp-bc lp-bc-rose lp-wide lp-reveal">
              <div className="lp-bc-eye">Gestión completa</div>
              <div className="lp-bc-h">Estudiantes, cursos y matrículas</div>
              <div className="lp-bc-p">Fichas individuales, asignación de cursos, historial completo. Todo organizado, siempre accesible.</div>
              <div className="lp-bc-stat-row">
                <div><div className="lp-bcs-num">485</div><div className="lp-bcs-lbl">Estudiantes</div></div>
                <div><div className="lp-bcs-num">10</div><div className="lp-bcs-lbl">Cursos</div></div>
                <div><div className="lp-bcs-num">94%</div><div className="lp-bcs-lbl">Matrícula</div></div>
              </div>
            </div>
            <div className="lp-bc lp-bc-violet lp-reveal lp-d1">
              <div className="lp-bc-eye">Comunicación</div>
              <div className="lp-bc-h">Padres siempre informados</div>
              <div className="lp-bc-p">Comunicados instantáneos, citaciones y confirmaciones de lectura en tiempo real.</div>
              <div className="lp-bc-bignum" style={{ color: 'var(--lp-violet)' }}>∞</div>
            </div>
            <div className="lp-bc lp-bc-slate lp-reveal lp-d2">
              <div className="lp-bc-eye">Personal</div>
              <div className="lp-bc-h">Tu equipo, bien gestionado</div>
              <div className="lp-bc-p">Contratos, cargos y datos laborales de cada funcionaria en un solo lugar.</div>
              <ul className="lp-bc-list">
                <li><span className="lp-bcdot" style={{ background: 'var(--lp-muted)' }} />Planta · Contrata · Honorarios</li>
                <li><span className="lp-bcdot" style={{ background: 'var(--lp-muted)' }} />Historial de contratos</li>
                <li><span className="lp-bcdot" style={{ background: 'var(--lp-muted)' }} />Sueldos y fechas de ingreso</li>
              </ul>
            </div>
            <div className="lp-bc lp-bc-green lp-reveal">
              <div className="lp-bc-eye">Cobranza</div>
              <div className="lp-bc-h">Cobros sin estrés</div>
              <div className="lp-bc-p">Mensualidades, alertas automáticas y registro de cada pago.</div>
              <div className="lp-bc-stat-row">
                <div><div className="lp-bcs-num">87%</div><div className="lp-bcs-lbl">Pagado</div></div>
                <div><div className="lp-bcs-num">0</div><div className="lp-bcs-lbl">Olvidos</div></div>
              </div>
            </div>
            <div className="lp-bc lp-bc-amber lp-reveal lp-d1">
              <div className="lp-bc-eye">Proveedores</div>
              <div className="lp-bc-h">Facturas y pagos ordenados</div>
              <div className="lp-bc-p">Gestiona todas tus cuentas por pagar sin papeles.</div>
              <ul className="lp-bc-list">
                <li><span className="lp-bcdot" style={{ background: 'var(--lp-amber)' }} />Registro de facturas</li>
                <li><span className="lp-bcdot" style={{ background: 'var(--lp-amber)' }} />Alertas de vencimiento</li>
                <li><span className="lp-bcdot" style={{ background: 'var(--lp-amber)' }} />Historial de pagos</li>
              </ul>
            </div>
            <div className="lp-bc lp-bc-blue lp-reveal lp-d2">
              <div className="lp-bc-eye">Dashboard</div>
              <div className="lp-bc-h">Todo el jardín en una pantalla</div>
              <div className="lp-bc-p">Estadísticas en tiempo real de cada módulo, desde cualquier dispositivo.</div>
              <div className="lp-minibars">
                {[40, 62, 50, 75, 60, 100, 80].map((h, i) => (
                  <div key={i} className="lp-mbar" style={{ height: `${h}%`, background: h === 100 ? 'var(--lp-blue)' : `rgba(0,113,227,${0.15 + i * 0.03})` }} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section className="lp-testi-sec" id="lp-testimonios">
          <p className="lp-sec-eye lp-reveal">Educadoras que confían</p>
          <h2 className="lp-sec-h lp-reveal lp-d1">Lo que dicen<br />quienes ya florecieron.</h2>
          <div className="lp-tgrid">
            {[
              { av: 'CM', avBg: 'linear-gradient(135deg,#ff375f,#8b5cf6)', quote: '"Antes pasaba horas en planillas de Excel. Ahora en cinco minutos tengo el cobro del mes listo."', name: 'Carmen Molina', role: 'Directora · Jardín Las Estrellas, Santiago', delay: '' },
              { av: 'PV', avBg: 'linear-gradient(135deg,#1db954,#0d9488)', quote: '"Los apoderados responden los comunicados al instante. Sé quién lo leyó y a qué hora. Es otra dimensión."', name: 'Patricia Vera', role: 'Educadora · Jardín San Mateo, Valparaíso', delay: 'lp-d1' },
              { av: 'AR', avBg: 'linear-gradient(135deg,#0071e3,#8b5cf6)', quote: '"Me costó media tarde aprenderla. Desde entonces no podría imaginar mi jardín sin Bloom Education."', name: 'Ana Rojas', role: 'Directora · Jardín Arco Iris, Concepción', delay: 'lp-d2' },
            ].map(({ av, avBg, quote, name, role, delay }) => (
              <div className={`lp-tcard lp-reveal ${delay}`} key={name}>
                <div className="lp-tstars">{[1, 2, 3, 4, 5].map(i => <span key={i} className="lp-tstar">★</span>)}</div>
                <div className="lp-tquote">{quote}</div>
                <div className="lp-tauthor">
                  <div className="lp-tav" style={{ background: avBg }}>{av}</div>
                  <div><div className="lp-tname">{name}</div><div className="lp-trole">{role}</div></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="lp-cta-sec">
          <div className="lp-cta-orb-a" />
          <div className="lp-cta-orb-b" />
          <h2 className="lp-cta-h lp-reveal">Tu jardín merece<br /><span className="lp-grad">florecer.</span></h2>
          <p className="lp-cta-sub lp-reveal">30 días gratis. Sin tarjeta de crédito. Configuración asistida por nuestro equipo en Chile.</p>
          <div className="lp-cta-actions lp-reveal">
            <button
              className="lp-btn-primary"
              style={{ fontSize: 19, padding: '18px 44px', boxShadow: '0 8px 32px rgba(0,113,227,.35)' }}
              onClick={() => navigate('/login')}
            >
              Crear mi cuenta gratis
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9h12M10 5l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
          <p className="lp-cta-note">¿Preguntas? <a href="mailto:hola@bloom.education">Escríbenos →</a></p>
        </section>

        {/* ── FOOTER ── */}
        <footer className="lp-footer">
          <div className="lp-foot-inner">
            <div className="lp-foot-top">
              <div className="lp-foot-brand">🌸 Bloom Education</div>
              <div className="lp-foot-links">
                <a href="#">Privacidad</a>
                <a href="#">Términos de uso</a>
                <a href="#">Soporte</a>
                <a href="#">Contacto</a>
              </div>
            </div>
            <div className="lp-foot-copy">
              <span>Copyright © 2025 Bloom Education. Todos los derechos reservados. Hecho en Chile 🇨🇱</span>
              <span>Santiago, Chile</span>
            </div>
          </div>
        </footer>

      </div>
    </>
  )
}
