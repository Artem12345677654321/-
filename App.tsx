import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Heart, ArrowRight, Search as SearchIcon, X } from 'lucide-react';
import { LiveVoiceAgent } from './components/LiveVoiceAgent';
import { SmartSearch } from './components/SmartSearch';

// Declare GSAP globals
declare global {
  interface Window {
    gsap: any;
    ScrollTrigger: any;
  }
}

// --- CONFIG (AUDIT COMPLIANT) ---
const CONFIG = {
    // Scroll Physics
    SMOOTH_FACTOR: 0.1,         // Lerp interpolation factor
    
    // UI Thresholds
    HEADER_SCROLL_OFFSET: 50,
    
    // Animation Timings (in seconds)
    INTRO_LINE_DURATION: 1.5,
    INTRO_COUNTER_DURATION: 2.5,
    INTRO_REVEAL_DELAY: 1.0,
    INTRO_SHUTTER_DURATION: 1.4,
};

const SECTIONS = [
  { 
    id: 'collections', 
    title: 'Collections', 
    num: '01',
    img: 'https://images.unsplash.com/photo-1600166898405-da9535204843?q=80&w=1000&auto=format&fit=crop' 
  },
  { 
    id: 'atelier', 
    title: 'Atelier', 
    num: '02',
    img: 'https://images.unsplash.com/photo-1615529182904-14819c35db37?q=80&w=1000&auto=format&fit=crop' 
  },
  { 
    id: 'technologies', 
    title: 'Technologies', 
    num: '03',
    img: 'https://images.unsplash.com/photo-1618220179428-22790b461013?q=80&w=1000&auto=format&fit=crop' 
  },
  { 
    id: 'contact', 
    title: 'Contact', 
    num: '04',
    img: 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?q=80&w=1000&auto=format&fit=crop' 
  },
];

const App: React.FC = () => {
  const [isReady, setIsReady] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeMenuIndex, setActiveMenuIndex] = useState(0);
  const [menuMetrics, setMenuMetrics] = useState({ height: 0, gap: 0, centerOffset: 0 });

  // --- REFS ---
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const cursorOutlineRef = useRef<HTMLDivElement>(null);
  const hoverImageRef = useRef<HTMLImageElement>(null);
  const horizontalWrapperRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  
  const menuCol1Ref = useRef<HTMLDivElement>(null);
  const menuCol2Ref = useRef<HTMLDivElement>(null);

  const cursorX = useRef<any>(null);
  const cursorY = useRef<any>(null);
  const introCounterRef = useRef<HTMLDivElement>(null);

  // Scroll State
  const currentScrollRef = useRef(0);
  const targetScrollRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const isTouchDevice = () => {
    return (typeof window !== 'undefined') && (('ontouchstart' in window) || (navigator.maxTouchPoints > 0));
  };

  // --- 1. CORE SCROLL ENGINE (Virtual Scroll v11.0) ---
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    const isMobile = isTouchDevice();
    const scrollContent = scrollContentRef.current;

    if (isMobile || !scrollContent) {
        // --- MOBILE: NATIVE SCROLL ---
        console.log("System: Mobile detected. Native Scroll Active.");
        if (scrollContent) {
            scrollContent.style.position = 'relative';
        }
        document.body.style.height = 'auto';
        document.body.style.overflowY = 'auto';
        
        // Simple header toggle for mobile
        const onNativeScroll = () => {
            if (window.scrollY > CONFIG.HEADER_SCROLL_OFFSET) {
                headerRef.current?.classList.add('scrolled');
            } else {
                headerRef.current?.classList.remove('scrolled');
            }
        };
        // PERFORMANCE AUDIT: Passive listener for main thread optimization
        window.addEventListener('scroll', onNativeScroll, { passive: true });
        runIntro();
        return () => window.removeEventListener('scroll', onNativeScroll);
    } 
    
    // --- DESKTOP: VIRTUAL SCROLL (Wheel Hijack) ---
    console.log("System: Desktop. Initializing Virtual Scroll Engine v11.0 (Wheel-Driven)");
    
    // 1. Setup Fixed Content
    scrollContent.style.position = 'fixed';
    scrollContent.style.top = '0';
    scrollContent.style.left = '0';
    scrollContent.style.width = '100%';
    scrollContent.style.overflow = 'visible';
    
    // 2. Sync Body Height (Create "Fake" Scrollbar)
    const resizeObserver = new ResizeObserver(() => {
        document.body.style.height = `${scrollContent.scrollHeight}px`;
        if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    });
    resizeObserver.observe(scrollContent);

    // 3. LISTEN TO WHEEL (Replaces Native Scroll)
    // CRITICAL: We intercept wheel to prevent browser-smooth-scroll conflicts (Jitter Fix)
    const onWheel = (e: WheelEvent) => {
        e.preventDefault(); // Stop native scroll logic completely
        targetScrollRef.current += e.deltaY;
        
        // Clamp
        const maxScroll = scrollContent.scrollHeight - window.innerHeight;
        targetScrollRef.current = Math.max(0, Math.min(targetScrollRef.current, maxScroll));
        
        // Header Logic (Updates immediately on input)
        if (targetScrollRef.current > CONFIG.HEADER_SCROLL_OFFSET) {
            headerRef.current?.classList.add('scrolled');
        } else {
            headerRef.current?.classList.remove('scrolled');
        }
    };
    // PERFORMANCE AUDIT: Passive false required to preventDefault
    document.body.addEventListener('wheel', onWheel, { passive: false });

    // 4. Animation Loop (Lerp)
    const animate = () => {
        // Interpolate
        currentScrollRef.current += (targetScrollRef.current - currentScrollRef.current) * CONFIG.SMOOTH_FACTOR;
        
        // Apply transform using floating point for subpixel rendering
        if (scrollContent) {
            scrollContent.style.transform = `translate3d(0, -${currentScrollRef.current}px, 0)`;
        }

        if (window.ScrollTrigger) window.ScrollTrigger.update();
        rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    // 5. GSAP ScrollerProxy
    const checkGSAP = setInterval(() => {
        if (window.gsap && window.ScrollTrigger) {
            clearInterval(checkGSAP);
            
            window.gsap.registerPlugin(window.ScrollTrigger);
            
            // STRICT AUDIT: Only define proxy if NOT mobile
            if (!isMobile) {
                window.ScrollTrigger.scrollerProxy(document.body, {
                    scrollTop(value: number) {
                        if (arguments.length) {
                            targetScrollRef.current = value; // Update our target
                        }
                        return currentScrollRef.current; // Return OUR interpolated position (not window.scrollY)
                    },
                    getBoundingClientRect() {
                        return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
                    },
                    pinType: "transform" // Critical for fixed content
                });
                
                window.ScrollTrigger.defaults({ scroller: document.body });
            }
            
            runIntro();
        }
    }, 100);

    return () => {
        document.body.removeEventListener('wheel', onWheel);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        resizeObserver.disconnect();
        clearInterval(checkGSAP);
        document.body.style.height = 'auto';
        if (scrollContent) scrollContent.style.transform = 'none';
    };
  }, []);

  // --- 2. INTRO LOGIC ---
  const runIntro = () => {
    // Intro removes itself from DOM via React state (setShowIntro) in onComplete
    const tl = window.gsap.timeline({
      onComplete: () => {
        setIsReady(true);
        setShowIntro(false); // DOM Cleanup
        // Ensure scroll triggers are recalculated after intro
        window.ScrollTrigger.refresh();
      }
    });

    const counterObj = { val: 0 };

    tl
    .set('.shutter', { display: 'none', scaleY: 1 })
    .set('.intro-overlay', { display: 'flex' })
    .set('.intro-line', { scaleX: 0, transformOrigin: 'center' })
    .set('.intro-text-top', { yPercent: 100 }) 
    .set('.intro-text-bottom', { yPercent: -100 })

    .to('.intro-line', { scaleX: 1, duration: CONFIG.INTRO_LINE_DURATION, ease: 'power3.inOut' })
    .to(counterObj, {
        val: 100,
        duration: CONFIG.INTRO_COUNTER_DURATION,
        ease: 'expo.inOut',
        onUpdate: () => {
            if (introCounterRef.current) {
                introCounterRef.current.innerText = Math.floor(counterObj.val).toString();
            }
        }
    }, "<")

    .to('.intro-text-top', { yPercent: 0, duration: 1.2, ease: 'power4.out' }, `-=${CONFIG.INTRO_REVEAL_DELAY}`)
    .to('.intro-text-bottom', { yPercent: 0, duration: 1.2, ease: 'power4.out' }, "<")
    .to({}, { duration: 0.3 })
    .to('.intro-logo-container', { scale: 1.5, opacity: 0, filter: 'blur(10px)', duration: 0.8, ease: 'power2.in' })
    .to(introCounterRef.current, { opacity: 0, scale: 1.1, duration: 0.5 }, "<")
    .to('.intro-line', { scaleX: 0, duration: 0.5, ease: 'power2.in' }, "<")
    .set('.shutter', { display: 'block' }) 
    .set('.intro-overlay', { backgroundColor: 'transparent', pointerEvents: 'none' }) 
    .to('.shutter.top', { scaleY: 0, duration: CONFIG.INTRO_SHUTTER_DURATION, ease: 'power4.inOut' })
    .to('.shutter.bottom', { scaleY: 0, duration: CONFIG.INTRO_SHUTTER_DURATION, ease: 'power4.inOut' }, "<")
    .to('.hero-char', { y: 0, opacity: 1, stagger: 0.04, duration: 1.2, ease: "power3.out" }, "-=0.8");
  };

  // --- 3. SCROLL ANIMATIONS ---
  useLayoutEffect(() => {
    if (!isReady || !window.gsap) return;

    window.ScrollTrigger.refresh();
    const ctx = window.gsap.context(() => {
      
      // Parallax
      window.gsap.utils.toArray('.parallax-img').forEach((img: any) => {
        window.gsap.to(img, {
          yPercent: 20,
          ease: "none",
          scrollTrigger: {
            trigger: img.parentElement,
            start: "top bottom",
            end: "bottom top",
            scrub: true
          }
        });
      });

      // Text Reveal
      window.gsap.utils.toArray('.reveal-text').forEach((text: any) => {
        window.gsap.fromTo(text, 
          { y: 60, opacity: 0 },
          {
            y: 0, opacity: 1, duration: 1.2, ease: "power3.out",
            scrollTrigger: {
              trigger: text,
              start: "top 90%",
              toggleActions: "play none none reverse"
            }
          }
        );
      });

      // Image Reveal
      window.gsap.utils.toArray('.reveal-img').forEach((container: any) => {
         window.gsap.fromTo(container, 
            { scale: 0.95, opacity: 0, filter: 'blur(10px)' },
            {
               scale: 1, opacity: 1, filter: 'blur(0px)',
               duration: 1.5, ease: "power2.out",
               scrollTrigger: {
                  trigger: container,
                  start: "top 85%",
                  toggleActions: "play none none reverse"
               }
            }
         );
      });

      // List Reveal
      window.gsap.utils.toArray('.reveal-list').forEach((list: any) => {
        const items = list.querySelectorAll('li');
        window.gsap.fromTo(items,
            { y: 30, opacity: 0 },
            {
                y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: "power2.out",
                scrollTrigger: {
                    trigger: list,
                    start: "top 85%",
                    toggleActions: "play none none reverse"
                }
            }
        );
      });

      // Horizontal Scroll
      const sectionsContainer = horizontalWrapperRef.current;
      if (sectionsContainer) {
        const totalWidth = sectionsContainer.scrollWidth;
        const viewportWidth = window.innerWidth;
        if (totalWidth > viewportWidth) {
            const xMove = -(totalWidth - viewportWidth);
            const horizontalTween = window.gsap.to(sectionsContainer, {
                x: xMove,
                ease: "none",
                scrollTrigger: {
                    trigger: ".horizontal-section-trigger",
                    pin: true,
                    scrub: 1,
                    end: () => "+=" + (totalWidth - viewportWidth), 
                    invalidateOnRefresh: true,
                }
            });
            window.gsap.utils.toArray('.horizontal-item').forEach((item: any) => {
                window.gsap.fromTo(item,
                    { opacity: 0, scale: 0.9, x: 50 },
                    {
                        opacity: 1, scale: 1, x: 0,
                        duration: 1,
                        ease: "power2.out",
                        scrollTrigger: {
                            trigger: item,
                            containerAnimation: horizontalTween,
                            start: "left 85%",
                            toggleActions: "play none none reverse"
                        }
                    }
                )
            });
        }
      }
    });

    return () => ctx.revert();
  }, [isReady]);

  // --- 4. UTILS & EFFECTS ---
  
  // Menu Metric Calc
  useEffect(() => {
    const updateMetrics = () => {
        const vh = window.innerHeight;
        const imgHeight = vh * 0.70; 
        const gap = 40;
        const centerOffset = (vh - imgHeight) / 2;
        setMenuMetrics({ height: imgHeight, gap: gap, centerOffset: centerOffset });
    };
    updateMetrics();
    window.addEventListener('resize', updateMetrics);
    return () => window.removeEventListener('resize', updateMetrics);
  }, []);

  // Cursor Logic
  useEffect(() => {
    if(!window.gsap) return;
    cursorX.current = window.gsap.quickTo(cursorOutlineRef.current, "left", { duration: 0.4, ease: "power3" });
    cursorY.current = window.gsap.quickTo(cursorOutlineRef.current, "top", { duration: 0.4, ease: "power3" });
    const onMouseMove = (e: MouseEvent) => {
      if (cursorDotRef.current && cursorOutlineRef.current) {
        cursorDotRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
        cursorX.current(e.clientX);
        cursorY.current(e.clientY);
        if (hoverImageRef.current && document.body.classList.contains('hover-reveal-active')) {
             window.gsap.to(hoverImageRef.current, {
                 left: e.clientX + 20,
                 top: e.clientY + 20,
                 duration: 0.6,
                 ease: "power2.out"
             });
        }
      }
    };
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, []);

  const handleLinkHover = (src?: string) => {
    document.body.classList.add('hovering');
    if (src && hoverImageRef.current) {
        document.body.classList.add('hover-reveal-active');
        hoverImageRef.current.src = src;
        hoverImageRef.current.classList.add('active');
    }
  };

  const handleLinkLeave = () => {
    document.body.classList.remove('hovering');
    document.body.classList.remove('hover-reveal-active');
    if (hoverImageRef.current) {
        hoverImageRef.current.classList.remove('active');
    }
  };

  // Menu Animation
  useEffect(() => {
    if (menuOpen) {
        let isScrolling = false;
        const onMenuWheel = (e: WheelEvent) => {
            e.preventDefault();
            if (isScrolling) return;
            if (Math.abs(e.deltaY) > 20) {
                isScrolling = true;
                const direction = e.deltaY > 0 ? 1 : -1;
                setActiveMenuIndex(prev => {
                    const next = prev + direction;
                    if (next < 0) return 0;
                    if (next >= SECTIONS.length) return SECTIONS.length - 1;
                    return next;
                });
                setTimeout(() => { isScrolling = false; }, 300);
            }
        };
        window.addEventListener('wheel', onMenuWheel, { passive: false });
        return () => window.removeEventListener('wheel', onMenuWheel);
    }
  }, [menuOpen]);

  useEffect(() => {
    if (!window.gsap || !menuOpen || menuMetrics.height === 0) return;
    const step = menuMetrics.height + menuMetrics.gap;
    const targetY1 = menuMetrics.centerOffset - (activeMenuIndex * step);
    const reversedIndex = (SECTIONS.length - 1) - activeMenuIndex;
    const targetY2 = menuMetrics.centerOffset - (reversedIndex * step);
    window.gsap.to(menuCol1Ref.current, { y: targetY1, duration: 1.0, ease: "power4.inOut" });
    window.gsap.to(menuCol2Ref.current, { y: targetY2, duration: 1.0, ease: "power4.inOut" });
  }, [activeMenuIndex, menuOpen, menuMetrics]);


  return (
    <>
      {/* INTRO OVERLAY */}
      {showIntro && (
        <div className={`intro-overlay fixed inset-0 bg-[#050505] z-[99999] flex items-center justify-center overflow-hidden ${isReady ? 'pointer-events-none' : ''}`}>
           <div ref={introCounterRef} className="absolute right-0 bottom-0 text-[30vw] leading-none font-['Manrope'] font-bold text-[#1a1a1a] select-none opacity-50 mix-blend-color-dodge tabular-nums tracking-tighter z-0">0</div>
           <div className="intro-logo-container relative z-20 flex flex-col items-center justify-center">
               <div className="overflow-hidden h-[1.5em] mb-4 flex items-end text-6xl md:text-8xl leading-none">
                   <h1 className="intro-text-top font-['Playfair_Display'] text-white tracking-[0.2em]">PLATO</h1>
               </div>
               <div className="intro-line w-[300px] md:w-[500px] h-[1px] bg-[#D4AF37]"></div>
               <div className="overflow-hidden h-[1.5em] mt-4 flex items-start text-6xl md:text-8xl leading-none">
                   <h1 className="intro-text-bottom font-['Playfair_Display'] text-[#D4AF37] italic tracking-[0.2em]">RUG</h1>
               </div>
           </div>
        </div>
      )}

      <div className="shutter top fixed left-0 w-full h-[50vh] bg-[#050505] z-[99998] hidden"></div>
      <div className="shutter bottom fixed left-0 bottom-0 w-full h-[50vh] bg-[#050505] z-[99998] hidden"></div>

      {/* CURSOR */}
      <div ref={cursorDotRef} className="cursor-dot hidden md:block" style={{ transform: 'translate(-100px, -100px)' }}></div>
      <div ref={cursorOutlineRef} className="cursor-outline hidden md:block" style={{ position: 'fixed', left: -100, top: -100, transform: 'translate(-50%, -50%)' }}></div>
      <img ref={hoverImageRef} className="hover-reveal-img" alt="" />

      {/* AI KNOWLEDGE SEARCH OVERLAY */}
      <div className={`fixed inset-0 z-[9050] bg-[#050505]/95 backdrop-blur-2xl transition-all duration-500 ${searchOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <div className="container h-full pt-32 pb-12 relative">
              <button onClick={() => setSearchOpen(false)} className="absolute top-8 right-8 text-white hover:text-[#D4AF37] transition-colors cursor-none">
                  <X size={32} />
              </button>
              <div className="max-w-2xl mx-auto h-full flex flex-col">
                  <h2 className="text-3xl font-['Playfair_Display'] text-white mb-8 text-center">AI Concierge</h2>
                  <div className="flex-1 bg-[#0F0F0F] border border-[#ffffff10] rounded-2xl p-6 overflow-hidden">
                      <SmartSearch />
                  </div>
              </div>
          </div>
      </div>

      {/* MENU */}
      <div className={`fixed inset-0 bg-[#050505] z-[9000] transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${menuOpen ? 'clip-path-open' : 'clip-path-closed'}`}
           style={{ 
               clipPath: menuOpen ? 'polygon(0 0, 100% 0, 100% 100%, 0% 100%)' : 'polygon(0 0, 100% 0, 100% 0, 0 0)',
               pointerEvents: menuOpen ? 'auto' : 'none'
           }}>
         <div className="container h-full flex items-center justify-between relative">
            <button onClick={() => setMenuOpen(false)} className="absolute top-8 right-8 text-white z-50 flex items-center gap-3 hover:text-[#D4AF37] transition-colors group cursor-none">
                <span className="text-xs tracking-[0.2em] uppercase">Close</span>
                <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center group-hover:border-[#D4AF37] transition-colors">
                    <div className="w-3 h-[1px] bg-current rotate-45 absolute"></div>
                    <div className="w-3 h-[1px] bg-current -rotate-45 absolute"></div>
                </div>
            </button>
            <div className="w-full md:w-4/12 h-full flex flex-col justify-center gap-2 pl-4 md:pl-0 z-20">
                {SECTIONS.map((item, i) => (
                    <a key={i} href={`#${item.id}`} 
                       onClick={() => setMenuOpen(false)}
                       onMouseEnter={() => setActiveMenuIndex(i)}
                       className={`group flex items-center gap-6 cursor-none transition-all duration-500 ${activeMenuIndex === i ? 'translate-x-8 opacity-100' : 'opacity-40 hover:opacity-100'}`}
                    >
                        <span className={`text-[#D4AF37] text-xs font-['Manrope'] transition-all duration-500 ${activeMenuIndex === i ? 'opacity-100' : 'opacity-0'}`}>0{i+1}</span>
                        <span className={`text-5xl md:text-7xl font-['Playfair_Display'] transition-colors duration-300 ${activeMenuIndex === i ? 'text-[#D4AF37]' : 'text-white'}`}>
                            {item.title}
                        </span>
                    </a>
                ))}
            </div>
            <div className="hidden md:flex w-8/12 h-full gap-12 items-center justify-center relative pl-12">
                <div className="h-full w-[35vw] overflow-hidden relative shadow-2xl">
                    <div ref={menuCol1Ref} className="w-full absolute top-0 left-0 flex flex-col" style={{ gap: menuMetrics.gap }}>
                        {SECTIONS.map((item, i) => (
                            <div key={i} style={{ height: menuMetrics.height }} className="w-full relative flex-shrink-0">
                                <img src={item.img} className="w-full h-full object-cover" alt={item.title} />
                                <div className="absolute inset-0 bg-black/10"></div>
                            </div>
                        ))}
                    </div>
                </div>
                <div style={{ transform: 'translateY(15vh)' }} className="h-full w-[35vw] overflow-hidden relative opacity-40 grayscale mix-blend-screen">
                    <div ref={menuCol2Ref} className="w-full absolute top-0 left-0 flex flex-col" style={{ gap: menuMetrics.gap }}>
                         {[...SECTIONS].reverse().map((item, i) => (
                            <div key={i} style={{ height: menuMetrics.height }} className="w-full relative flex-shrink-0">
                                <img src={item.img} className="w-full h-full object-cover" alt={item.title} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
         </div>
      </div>

      <header ref={headerRef} className="fixed top-0 left-0 w-full z-[8000] border-b border-[#ffffff10] text-white transition-all duration-500">
        <div className="w-full px-6 md:px-12 h-20 md:h-24 flex items-center justify-between relative">
            <div className="flex items-center gap-6 md:gap-8 z-20">
                <button 
                    onClick={() => setMenuOpen(true)} 
                    className="flex items-center gap-3 group hover:text-[#D4AF37] transition-colors cursor-none"
                    onMouseEnter={() => handleLinkHover()} onMouseLeave={handleLinkLeave}
                >
                    <div className="flex flex-col gap-[6px] w-6 md:w-8">
                         <span className="w-full h-[1px] bg-[#D4AF37]"></span>
                         <span className="w-2/3 h-[1px] bg-white group-hover:w-full transition-all duration-300"></span>
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.2em] font-medium hidden md:inline-block">МЕНЮ</span>
                </button>
                <button 
                    onClick={() => setSearchOpen(true)}
                    className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all duration-300 cursor-none"
                    onMouseEnter={() => handleLinkHover()} onMouseLeave={handleLinkLeave}
                >
                    <SearchIcon size={14} />
                </button>
                <a href="#collections" 
                   className="hidden lg:flex items-center px-8 py-3 border border-[#D4AF37] rounded-full text-[10px] uppercase tracking-[0.2em] hover:bg-[#D4AF37] hover:text-black transition-all duration-300 cursor-none"
                   onMouseEnter={() => handleLinkHover()} onMouseLeave={handleLinkLeave}>
                   ВЫБРАТЬ КОВЕР
                </a>
                <button className="w-10 h-10 rounded-full bg-[#D4AF37] flex items-center justify-center text-black hover:scale-110 transition-transform duration-300 cursor-none"
                        onMouseEnter={() => handleLinkHover()} onMouseLeave={handleLinkLeave}>
                    <Heart size={18} fill="currentColor" />
                </button>
            </div>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-center">
                 <a href="#" className="font-['Playfair_Display'] text-xl md:text-3xl tracking-[0.1em] hover:text-[#D4AF37] transition-colors cursor-none"
                   onMouseEnter={() => handleLinkHover()} onMouseLeave={handleLinkLeave}>
                    PLATO RUG
                 </a>
            </div>
            <div className="flex items-center gap-8 z-20">
                 <a href="tel:+79250174500" className="hidden xl:block font-['Manrope'] text-xs tracking-[0.1em] hover:text-[#D4AF37] transition-colors cursor-none">
                    +7 925 017 45 00
                 </a>
                 <button className="hidden md:flex w-24 h-24 rounded-full border border-[#D4AF37] items-center justify-center text-[9px] uppercase tracking-widest hover:bg-[#D4AF37] hover:text-black transition-all duration-300 cursor-none"
                    onMouseEnter={() => handleLinkHover()} onMouseLeave={handleLinkLeave}>
                     <span className="text-center leading-relaxed">ЗАКАЗАТЬ<br/>ЗВОНОК</span>
                 </button>
            </div>
        </div>
      </header>

      {/* --- WRAPPER FOR VIRTUAL SCROLL --- */}
      <div id="app-container" className="w-full relative">
          <div id="scroll-content" ref={scrollContentRef}>
              <main>
                    <section className="relative h-screen flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 z-0">
                            <img src="https://placehold.co/1920x1080/050505/222?text=." alt="Background" className="w-full h-full object-cover opacity-40 parallax-img" style={{ transform: 'scale(1.2)' }} />
                            <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-transparent to-[#050505]"></div>
                        </div>
                        <div className="relative z-10 text-center mix-blend-difference text-[#EAEAEA]">
                            <h1 className="text-[12vw] leading-[0.85] font-['Playfair_Display'] tracking-tighter">
                                {"HAUTE".split("").map((c, i) => <span key={i} className="hero-char inline-block translate-y-[100px] opacity-0">{c}</span>)}
                                <br />
                                <span className="text-[#D4AF37] italic text-[4vw] block -mt-4 mb-4 font-['Playfair_Display']">
                                    {"Couture".split("").map((c, i) => <span key={i} className="hero-char inline-block translate-y-[100px] opacity-0">{c}</span>)}
                                </span>
                                {"RUGS".split("").map((c, i) => <span key={i} className="hero-char inline-block translate-y-[100px] opacity-0">{c}</span>)}
                            </h1>
                        </div>
                        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                            <span className="text-[10px] tracking-[0.3em] uppercase opacity-50">Scroll</span>
                            <div className="w-[1px] h-12 bg-gradient-to-b from-[#D4AF37] to-transparent"></div>
                        </div>
                    </section>

                    <section className="py-32 container flex flex-col md:flex-row gap-16 md:gap-32">
                        <div className="md:w-1/3">
                            <span className="block text-[#D4AF37] text-xs tracking-[0.2em] mb-4 reveal-text">SINCE 2015</span>
                            <h2 className="text-4xl md:text-6xl font-['Playfair_Display'] reveal-text">
                                The art of <span className="italic text-[#888]">textile architecture</span>.
                            </h2>
                        </div>
                        <div className="md:w-1/3 pt-4">
                            <p className="text-[#888] text-lg leading-relaxed reveal-text">
                                We don't just make rugs. We sculpt surfaces. 
                                Inspired by the fluidity of nature and the rigidity of modern architecture, 
                                Plato Rug defines the space between art and utility.
                            </p>
                            <a href="#atelier" className="inline-block mt-12 border-b border-[#D4AF37] pb-1 text-sm tracking-widest hover:text-[#D4AF37] transition-colors reveal-text"
                               onMouseEnter={() => handleLinkHover()} onMouseLeave={handleLinkLeave}>DISCOVER ATELIER</a>
                        </div>
                    </section>

                    <section className="horizontal-section-trigger h-screen bg-[#0F0F0F] relative overflow-hidden flex flex-col justify-center">
                         <div ref={horizontalWrapperRef} className="flex flex-nowrap items-center px-[10vw] gap-24 h-full w-max will-change-transform">
                            <div className="horizontal-item w-[30vw] flex-shrink-0 flex flex-col justify-center">
                                <span className="text-[#D4AF37] text-xs tracking-[0.2em] mb-4">COLLECTIONS 2025</span>
                                <h2 className="text-6xl font-['Playfair_Display'] mb-8">Selected<br/>Works</h2>
                                <p className="text-[#666] max-w-sm">Explore our latest innovations in texture, form, and color theory.</p>
                            </div>
                            {[1, 2, 3, 4].map((n) => (
                                <div key={n} className="horizontal-item w-[40vw] flex-shrink-0 h-[60vh] relative group cursor-none"
                                     onMouseEnter={() => handleLinkHover()} onMouseLeave={handleLinkLeave}>
                                    <div className="w-full h-full overflow-hidden">
                                        <img src={`https://placehold.co/800x1200/1a1a1a/D4AF37?text=Collection+${n}`} 
                                             className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" alt="" />
                                    </div>
                                    <div className="absolute bottom-8 left-8">
                                        <span className="text-6xl font-['Playfair_Display'] block mb-2 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500">0{n}</span>
                                        <span className="text-sm tracking-widest uppercase text-white/80">Series Name</span>
                                    </div>
                                </div>
                            ))}
                             <div className="w-[10vw] flex-shrink-0"></div>
                         </div>
                    </section>

                    <section id="technologies" className="py-40 container">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-24">
                            <div className="relative h-[80vh] overflow-hidden rounded-sm reveal-img">
                                <img src="https://placehold.co/800x1200/222/555?text=Hand+Tufting" className="parallax-img w-full h-[120%] object-cover -translate-y-[10%]" alt="Tech" />
                                <div className="absolute inset-0 bg-black/30 p-12 flex flex-col justify-end">
                                    <h3 className="text-4xl font-['Playfair_Display']">Hand Tufting</h3>
                                </div>
                            </div>
                            <div className="flex flex-col justify-center">
                                <span className="text-[#D4AF37] text-xs tracking-[0.2em] mb-4 reveal-text">TECHNOLOGY</span>
                                <h2 className="text-5xl font-['Playfair_Display'] mb-8 reveal-text">Engineered<br/>Perfection</h2>
                                <ul className="space-y-8 mt-8 reveal-list">
                                    {[
                                        { t: "100% New Zealand Wool", d: "Ethically sourced, incredibly soft." },
                                        { t: "3D Sculpting", d: "Hand-carved relief for tactical depth." },
                                        { t: "Double Backing", d: "Ensures longevity and structural integrity." }
                                    ].map((item, i) => (
                                        <li key={i} className="border-t border-[#333] pt-6 group hover:pl-4 transition-all duration-300 cursor-pointer"
                                            onMouseEnter={() => handleLinkHover()} onMouseLeave={handleLinkLeave}>
                                            <h4 className="text-xl mb-2 group-hover:text-[#D4AF37] transition-colors">{item.t}</h4>
                                            <p className="text-[#666] text-sm">{item.d}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </section>

                    <footer id="contact" className="bg-[#0A0A0A] border-t border-[#ffffff10] pt-24 pb-12">
                        <div className="container">
                            <div className="flex flex-col md:flex-row justify-between items-start mb-24">
                                <h2 className="text-[10vw] font-['Playfair_Display'] leading-none text-[#1a1a1a] hover:text-[#D4AF37] transition-colors duration-700 cursor-none reveal-text"
                                    onMouseEnter={() => handleLinkHover()} onMouseLeave={handleLinkLeave}>
                                    PLATO
                                </h2>
                                <div className="flex gap-16 mt-12 md:mt-0 reveal-text">
                                    <div>
                                        <h4 className="text-[#D4AF37] text-xs tracking-[0.2em] mb-6">CONTACT</h4>
                                        <p className="text-[#888] mb-2 hover:text-white transition-colors cursor-pointer">+7 925 017 45 00</p>
                                        <p className="text-[#888] hover:text-white transition-colors cursor-pointer">order@platorug.ru</p>
                                    </div>
                                    <div>
                                        <h4 className="text-[#D4AF37] text-xs tracking-[0.2em] mb-6">ADDRESS</h4>
                                        <p className="text-[#888] mb-2">Moscow, Russia</p>
                                        <p className="text-[#888]">Interior Center</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-between items-end text-[10px] text-[#444] uppercase tracking-widest">
                                <span>© 2025 Plato Rug</span>
                                <span>Designed by Plato Dev</span>
                            </div>
                        </div>
                    </footer>
              </main>
          </div>
      </div>
      
      {/* LIVE VOICE AGENT - ALWAYS ACTIVE */}
      <LiveVoiceAgent />
    </>
  );
};

export default App;