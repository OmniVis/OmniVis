export const RENDERER_CODE_V4 = `
function Presentation() {
  const [current, setCurrent] = useState(0);
  const data = typeof slideData !== 'undefined' ? slideData : null;
  const totalSlides = data ? data.slides.length : 1;

  const [scale, setScale] = useState(1);
  useEffect(() => {
    const handleResize = () => {
      const scaleX = window.innerWidth / 1920;
      const scaleY = window.innerHeight / 1080;
      setScale(Math.min(scaleX, scaleY));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (data?.title) {
      window.parent?.postMessage({ type: 'sl_extracted_title', title: data.title }, '*');
    }
  }, []);

  useEffect(() => {
    window.parent?.postMessage({ type: 'sl_slide_change', current, total: totalSlides }, '*');
  }, [current, totalSlides]);

  useEffect(() => {
    const go = dir => setCurrent(c => Math.min(Math.max(c + dir, 0), totalSlides - 1));
    const onKey = e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') go(1);
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [totalSlides]);

  useEffect(() => {
    if (typeof anime !== "undefined") {
      // Modern spring-based text/element entrance
      anime({ 
        targets: '.sl-anim', 
        translateY: [40, 0], 
        opacity: [0, 1],
        easing: 'spring(1, 80, 10, 0)', 
        delay: anime.stagger(100, {start: 100}), 
        duration: 1200 
      });
      // Beautiful elastic bounce for cards and visuals
      anime({
        targets: '.sl-anim-scale',
        scale: [0.85, 1],
        translateY: [20, 0],
        opacity: [0, 1],
        easing: 'spring(1, 80, 12, 0)',
        delay: anime.stagger(150, {start: 200}),
        duration: 1400
      });
      // Continuous slow breathing for background elements
      anime({
        targets: '.sl-bg-anim',
        scale: [1, 1.05],
        easing: 'easeInOutSine',
        duration: 5000,
        direction: 'alternate',
        loop: true
      });
      // Continuous floating effect for icons
      anime({
        targets: '.sl-icon-anim',
        translateY: [-5, 5],
        rotate: [-2, 2],
        easing: 'easeInOutSine',
        duration: 3000,
        direction: 'alternate',
        loop: true
      });
    }
  }, [current]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 15; // max 7.5deg tilt
      const y = (e.clientY / window.innerHeight - 0.5) * -15;
      document.documentElement.style.setProperty('--mouse-x', x + 'deg');
      document.documentElement.style.setProperty('--mouse-y', y + 'deg');
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  if (!data) return <div style={{padding:'2rem',color:'red',fontSize:'1.5rem'}}>Error: Invalid slide data</div>;
  const slide = data.slides[current];
  if (!slide) return null;
  const { archetype, content, visuals } = slide;

  // ── Premium Background decoration ─────────────────────────────────────────────
  const renderBackground = () => {
    const fill = visuals?.fill || 'none';
    if (fill === 'diagonal-gradient') return (
      <div className="sl-bg-anim" style={{ position:'absolute', inset:0, pointerEvents:'none',
        background:'linear-gradient(135deg, color-mix(in srgb, var(--sl-accent) 25%, transparent) 0%, transparent 60%)', 
        filter: 'blur(100px)', opacity:0.8, transform: 'scale(1.2)', transformOrigin: 'center' }} />
    );
    if (fill === 'full-bleed-gradient') return (
      <div style={{ position:'absolute', inset:0, pointerEvents:'none',
        background:'linear-gradient(160deg, var(--sl-bg) 0%, color-mix(in srgb, var(--sl-accent) 30%, var(--sl-bg)) 100%)' }} />
    );
    if (fill === 'large-circle') return (
      <>
        <div className="sl-bg-anim" style={{ position:'absolute', top:'-20%', right:'-15%', width:'80cqh', height:'80cqh',
          borderRadius:'50%', background:'var(--sl-accent)', opacity:0.1, pointerEvents:'none', filter:'blur(120px)' }} />
        <div className="sl-bg-anim" style={{ position:'absolute', bottom:'-10%', left:'-10%', width:'40cqh', height:'40cqh',
          borderRadius:'50%', background:'var(--sl-accent)', opacity:0.05, pointerEvents:'none', filter:'blur(80px)', animationDelay: '-2s' }} />
      </>
    );
    if (fill === 'svg-grid') return (
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.06, pointerEvents:'none' }}>
        <defs><pattern id="g" width="60" height="60" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.5" fill="currentColor"/>
        </pattern></defs>
        <rect width="100%" height="100%" fill="url(#g)"/>
      </svg>
    );
    return null;
  };

  // ── Visual element renderer ───────────────────────────────────────────
  const renderVisual = (extraStyle = {}) => {
    if (content.visualType === "icon" && content.visualPrompt) {
      return (
        <div className="sl-anim-scale sl-interactive-card" style={{ 
          background: 'color-mix(in srgb, var(--sl-accent) 10%, transparent)',
          padding: '60px', borderRadius: '48px',
          boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--sl-accent) 20%, transparent)',
          ...extraStyle 
        }}>
          <span className="material-symbols-rounded sl-icon-anim"
                style={{ fontSize:'160px', color:'var(--sl-accent)', display:'block',
                         lineHeight:1 }}>
            {content.visualPrompt}
          </span>
        </div>
      );
    }
    if (content.visualType === "chart") {
      const bars = [0.25, 0.42, 0.38, 0.72, 0.64, 0.95];
      return (
        <div className="sl-anim-scale sl-interactive-card" style={{ 
          width:'100%', height:'100%', minHeight:'clamp(160px,22cqh,300px)',
          display:'flex', flexDirection:'column', alignItems:'stretch', justifyContent:'center',
          padding:'clamp(24px,3cqw,40px)', overflow:'hidden', 
          background: 'color-mix(in srgb, var(--sl-text) 3%, transparent)',
          borderRadius: '32px', border: '1px solid color-mix(in srgb, var(--sl-text) 8%, transparent)',
          ...extraStyle 
        }}>
          <svg viewBox="0 0 540 260" preserveAspectRatio="xMidYMid meet"
            style={{ width:'100%', flex:1, overflow:'visible', minHeight:0 }}>
            {[0.25,0.5,0.75,1].map((y,i) => (
              <line key={i} x1="48" y1={220-y*180} x2="520" y2={220-y*180}
                stroke="var(--sl-text)" strokeWidth="1" strokeOpacity="0.08" strokeDasharray="4 4" />
            ))}
            {bars.map((h,i) => (
              <rect key={i} x={64+i*76} y={220-h*180} width={48} height={h*180}
                rx="8" fill="url(#barGradient)" opacity={0.8} />
            ))}
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--sl-accent)" />
                <stop offset="100%" stopColor="var(--sl-accent)" stopOpacity="0.4" />
              </linearGradient>
            </defs>
            <line x1="48" y1="220" x2="520" y2="220"
              stroke="var(--sl-text)" strokeOpacity="0.15" strokeWidth="2" />
          </svg>
          {content.visualPrompt && (
            <p style={{ fontSize:'clamp(14px,1.2cqw,18px)', color:'var(--sl-sub)', textAlign:'center',
              fontWeight: 500, margin:'clamp(12px,1.5cqh,20px) 0 0', overflow:'hidden',
              whiteSpace:'nowrap', textOverflow:'ellipsis', flexShrink:0 }}>{content.visualPrompt}</p>
          )}
        </div>
      );
    }
    if (content.visualType === "custom-svg" && content.customSvgCode) {
      return (
        <div className="sl-anim-scale" style={{ width:'100%', height:'100%', display:'flex',
          alignItems:'center', justifyContent:'center', overflow:'hidden', ...extraStyle }}
          dangerouslySetInnerHTML={{ __html: content.customSvgCode }}
        />
      );
    }
    return null;
  };

  // ── Typography constants ───────────────────────────────────────────────
  const eyebrowStyle = {
    fontSize:'32px', fontWeight:700, textTransform:'uppercase',
    letterSpacing:'0.15em', color:'var(--sl-accent)',
    margin:0, flexShrink:0
  };
  const h1Style = {
    fontSize:'120px', fontWeight:800, lineHeight:1.1,
    letterSpacing:'-0.02em', color: 'var(--sl-text)',
    margin:0, overflow:'hidden', wordBreak:'break-word',
    display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical'
  };
  const h2Style = {
    fontSize:'80px', fontWeight:800, lineHeight:1.15,
    letterSpacing:'-0.02em', color: 'var(--sl-text)',
    margin:0, overflow:'hidden', wordBreak:'break-word',
    display:'-webkit-box', WebkitLineClamp:4, WebkitBoxOrient:'vertical'
  };
  const h3Style = {
    fontSize:'46px', fontWeight:700, lineHeight:1.2,
    letterSpacing:'-0.01em', color: 'var(--sl-text)',
    margin:0, overflow:'hidden', wordBreak:'break-word', flexShrink:0
  };
  const bodyStyle = {
    fontSize:'36px', lineHeight:1.6, color:'var(--sl-sub)',
    fontWeight: 400,
    margin:0, overflow:'hidden', wordBreak:'break-word',
    display:'-webkit-box', WebkitLineClamp:5, WebkitBoxOrient:'vertical'
  };
  const labelStyle = {
    fontSize:'22px', fontWeight:700, textTransform:'uppercase',
    letterSpacing:'0.1em', color:'var(--sl-accent)', margin:0, flexShrink:0
  };

  // ── Layout constants ──────────────────────────────────────────────────
  const padV = '100px';
  const padH = '140px';
  const gap   = '48px';
  const gapSm = '28px';

  // ── Premium Card Style ────────────────────────────────────────────────
  const glassCardStyle = {
    background: 'color-mix(in srgb, var(--sl-bg) 60%, transparent)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid color-mix(in srgb, var(--sl-text) 8%, transparent)',
    borderRadius: '32px',
    padding: '48px',
    boxShadow: '0 8px 32px -8px color-mix(in srgb, var(--sl-text) 5%, transparent)',
    display: 'flex', flexDirection: 'column'
  };

  // ── Slide root ────────────────────────────────────────────────────────
  const slideRoot = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    padding: \`\${padV} \${padH}\`,
    overflow: 'hidden',
    zIndex: 1,
  };

  // ── Slide content switch ──────────────────────────────────────────────
  const renderContent = () => {
    switch (archetype) {
      // ── BENTO-GRID ─────────────────────────────────────────────────────────
      case "BENTO-GRID":
        return (
          <div style={{ ...slideRoot, display:'grid', gridTemplateColumns:'2fr 1fr', gridTemplateRows:'auto 1fr', gap:gap }}>
            {/* Header Area */}
            <div style={{ gridColumn:'1 / -1', display:'flex', flexDirection:'column', gap:gapSm }}>
              {content.eyebrow && <span className="sl-anim" style={{...eyebrowStyle}}>{content.eyebrow}</span>}
              <h2 className="sl-anim" style={{...h2Style, maxWidth:'90%'}}>{content.headline}</h2>
            </div>
            
            {/* Hero Tile (Left) */}
            <div className="sl-anim-scale sl-interactive-card" style={{ ...glassCardStyle, gridColumn:'1', gridRow:'2', justifyContent:'center', position:'relative', overflow:'hidden', padding:'64px' }}>
              <div style={{ position:'absolute', top:0, right:0, bottom:0, width:'50%', background:'radial-gradient(circle at 100% 50%, color-mix(in srgb, var(--sl-accent) 20%, transparent) 0%, transparent 70%)' }} />
              {content.gridItems?.[0] && (
                <>
                  {content.gridItems[0].icon && <span className="material-symbols-rounded" style={{ fontSize:'120px', color:'var(--sl-accent)', marginBottom:'32px' }}>{content.gridItems[0].icon}</span>}
                  <h3 style={{ ...h3Style, fontSize:'64px', marginBottom:'16px' }}>{content.gridItems[0].title}</h3>
                  <p style={{ ...bodyStyle, fontSize:'32px', opacity:0.8 }}>{content.gridItems[0].text}</p>
                </>
              )}
            </div>

            {/* Support Tiles (Right) */}
            <div style={{ gridColumn:'2', gridRow:'2', display:'flex', flexDirection:'column', gap:gap }}>
              {(content.gridItems || []).slice(1, 3).map((item, i) => (
                <div key={i} className="sl-anim-scale sl-interactive-card" style={{ ...glassCardStyle, flex:1, padding:'40px', justifyContent:'center' }}>
                  {item.icon && <span className="material-symbols-rounded" style={{ fontSize:'48px', color:'var(--sl-accent)', marginBottom:'16px' }}>{item.icon}</span>}
                  <h3 style={{ ...h3Style, fontSize:'32px', marginBottom:'8px' }}>{item.title}</h3>
                  {item.text && <p style={{ ...bodyStyle, fontSize:'24px', opacity:0.8 }}>{item.text}</p>}
                </div>
              ))}
            </div>
          </div>
        );

      // ── NARRATIVE-CHART ──────────────────────────────────────────────────
      case "NARRATIVE-CHART":
        // A minimalist chart that acts as pure data storytelling
        const nBars = [0.15, 0.25, 0.45, 0.90];
        return (
          <div style={{ ...slideRoot, display:'flex', flexDirection:'column', gap:gap }}>
            {/* Massive Narrative Headline */}
            <div style={{ zIndex:2, maxWidth:'1200px' }}>
              {content.eyebrow && <span className="sl-anim" style={{...eyebrowStyle, marginBottom:'24px', display:'block'}}>{content.eyebrow}</span>}
              <h1 className="sl-anim" style={{...h1Style, fontSize:'100px'}}>{content.headline}</h1>
              {content.body && <p className="sl-anim" style={{...bodyStyle, marginTop:'32px', maxWidth:'900px'}}>{content.body}</p>}
            </div>
            
            {/* Minimalist Data Visualization */}
            <div className="sl-anim-scale sl-interactive-card" style={{ flex:1, display:'flex', alignItems:'flex-end', gap:'32px', paddingBottom:'40px', position:'relative', zIndex:1, marginTop:'auto' }}>
              <div style={{ position:'absolute', bottom:'40px', left:0, right:0, height:'2px', background:'color-mix(in srgb, var(--sl-text) 15%, transparent)', zIndex:0 }} />
              {nBars.map((h, i) => {
                const isHighlight = i === nBars.length - 1;
                return (
                  <div key={i} style={{ flex:1, height:\`\${h * 100}%\`, minHeight:'20px', 
                    background: isHighlight ? 'var(--sl-accent)' : 'color-mix(in srgb, var(--sl-text) 10%, transparent)',
                    borderRadius:'16px 16px 0 0', position:'relative', zIndex:1,
                    boxShadow: isHighlight ? '0 -10px 40px color-mix(in srgb, var(--sl-accent) 40%, transparent)' : 'none',
                    transformOrigin:'bottom', animation:\`sl-grow-up 1s cubic-bezier(0.2, 0.8, 0.2, 1) \${i * 150 + 600}ms both\`
                  }}>
                    {isHighlight && (
                      <div style={{ position:'absolute', top:'-80px', left:'50%', transform:'translateX(-50%)', 
                        background:'var(--sl-bg)', padding:'12px 24px', borderRadius:'16px', border:'2px solid var(--sl-accent)',
                        color:'var(--sl-text)', fontWeight:800, fontSize:'32px', whiteSpace:'nowrap',
                        boxShadow:'0 10px 30px color-mix(in srgb, var(--sl-accent) 20%, transparent)'
                      }}>
                        {content.visualPrompt || "+14% Growth"}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Inline keyframes for the chart animation since we are in V4 */}
            <style dangerouslySetInnerHTML={{ __html: "@keyframes sl-grow-up { from { transform: scaleY(0); } to { transform: scaleY(1); } }" }} />
          </div>
        );

      // ── HERO: left text with decorative right gradient panel ──────────
      case "HERO-FULL-BLEED":
        return (
          <div style={{ ...slideRoot, flexDirection:'row' }}>
            <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center',
                          zIndex:1, paddingRight:'5cqw', overflow:'hidden', gap:gapSm }}>
              {content.eyebrow && <span className="sl-anim" style={{...eyebrowStyle, opacity:0.8}}>{content.eyebrow}</span>}
              <h1 className="sl-anim" style={{...h1Style, textWrap: 'balance'}}>{content.headline}</h1>
              {content.body && (
                <p className="sl-anim" style={{ ...bodyStyle, maxWidth:'900px', marginTop:gap, opacity: 0.9 }}>{content.body}</p>
              )}
            </div>
          </div>
        );

      // ── IMMERSIVE-HERO: headline only, centered radial glow ───────────
      case "IMMERSIVE-HERO":
        return (
          <div style={{ ...slideRoot, justifyContent:'center', alignItems:'center', textAlign:'center' }}>
            {content.eyebrow && <span className="sl-anim" style={{ ...eyebrowStyle, marginBottom:gap }}>{content.eyebrow}</span>}
            <h1 className="sl-anim" style={{ ...h1Style, fontSize:'clamp(80px,8cqw,180px)', maxWidth:'90%', margin:0, textWrap: 'balance' }}>{content.headline}</h1>
          </div>
        );

      // ── STAT: giant numbers, top-border accents, decorative circle ────
      case "STAT-SPOTLIGHT":
        return (
          <div style={{ ...slideRoot, justifyContent:'center' }}>
            <div style={{ zIndex:1, display:'flex', flexDirection:'column', width:'100%' }}>
              {content.eyebrow && <span className="sl-anim" style={{ ...eyebrowStyle, marginBottom:'clamp(30px,5cqh,60px)' }}>{content.eyebrow}</span>}
              <div style={{ display:'flex', gap:'clamp(24px,4cqw,80px)', flexWrap:'wrap', width:'100%' }}>
                {(content.stats || []).slice(0,3).map((s, i) => (
                  <div key={i} className="sl-anim" style={{ flex:'1 1 0', minWidth:'250px',
                    borderLeft:'4px solid var(--sl-accent)', paddingLeft:gapSm, display:'flex', flexDirection:'column', justifyContent:'center' }}>
                    <p style={{ fontSize:'clamp(80px,9cqw,160px)', fontWeight:900, lineHeight:1,
                                 color:'var(--sl-text)', letterSpacing:'-0.04em', margin:0 }}>{s.value}</p>
                    <p style={{ marginTop:gapSm, ...labelStyle, fontSize:'clamp(18px,1.8cqw,26px)',
                                 fontWeight:600, color: 'var(--sl-sub)', textTransform:'none', letterSpacing:0 }}>{s.label}</p>
                  </div>
                ))}
              </div>
              {content.body && (
                <p className="sl-anim" style={{ ...bodyStyle, marginTop:'clamp(40px,6cqh,80px)', maxWidth:'800px' }}>{content.body}</p>
              )}
            </div>
          </div>
        );

      // ── PULLOUT-STAT ──────────────────────────────────────────────────
      case "PULLOUT-STAT":
        return (
          <div style={{ ...slideRoot, flexDirection:'row', alignItems:'center', gap:'clamp(40px,6cqw,100px)' }}>
            <div style={{ flex:'0 0 55%', minWidth:0 }}>
              {(content.stats && content.stats[0]) && (
                <div className="sl-anim">
                  <p style={{ fontSize:'clamp(100px,14cqw,240px)', fontWeight:900, lineHeight:0.9,
                              color:'var(--sl-accent)', letterSpacing:'-0.05em', margin:0 }}>{content.stats[0].value}</p>
                </div>
              )}
            </div>
            <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:gapSm }}>
              {(content.stats && content.stats[0]) && (
                <p className="sl-anim" style={{ ...labelStyle, fontSize:'clamp(24px,2.4cqw,36px)' }}>{content.stats[0].label}</p>
              )}
              {content.body && (
                <p className="sl-anim" style={{ ...bodyStyle, marginTop:gapSm }}>{content.body}</p>
              )}
            </div>
          </div>
        );

      // ── TWO-COLUMN / CHART ────────────────────────────────────────────
      case "TWO-COLUMN":
      case "CHART-WITH-ANNOTATION": {
        const hasVisual = (content.visualType === 'icon' && content.visualPrompt) ||
                          content.visualType === 'chart' ||
                          (content.visualType === 'custom-svg' && content.customSvgCode);
        return (
          <div style={{ ...slideRoot, flexDirection:'row', alignItems:'center',
                        gap: hasVisual ? 'clamp(40px,6cqw,80px)' : 0 }}>
            <div style={{ flex: hasVisual ? '0 0 45%' : '1', minWidth:0, display:'flex', flexDirection:'column',
                          justifyContent:'center', overflow:'hidden', gap:gapSm }}>
              {content.eyebrow && <span className="sl-anim" style={eyebrowStyle}>{content.eyebrow}</span>}
              <h2 className="sl-anim" style={h2Style}>{content.headline}</h2>
              {content.body && <p className="sl-anim" style={{ ...bodyStyle, marginTop:gapSm }}>{content.body}</p>}
            </div>
            {hasVisual && (
              <div style={{ flex:1, minWidth:0, display:'flex', alignItems:'center',
                            justifyContent:'center', overflow:'hidden' }}>
                {renderVisual({ width:'100%', maxHeight:'80cqh' })}
              </div>
            )}
          </div>
        );
      }

      // ── DIAGONAL-SPLIT ─────────────────────────────────────────────────
      case "DIAGONAL-SPLIT":
        return (
          <div style={{ ...slideRoot, flexDirection:'row', padding:0 }}>
            <div style={{ flex:'0 0 55%', padding:\`\${padV} \${padH}\`, display:'flex', flexDirection:'column',
                          justifyContent:'center', zIndex:1, gap:gapSm }}>
              {content.eyebrow && <span className="sl-anim" style={eyebrowStyle}>{content.eyebrow}</span>}
              <h2 className="sl-anim" style={h2Style}>{content.headline}</h2>
              {content.body && <p className="sl-anim" style={{ ...bodyStyle, marginTop:gapSm, maxWidth:'90%' }}>{content.body}</p>}
            </div>
            <div style={{ flex:1, background:'color-mix(in srgb, var(--sl-text) 3%, transparent)', 
                          clipPath:'polygon(15% 0, 100% 0, 100% 100%, 0% 100%)',
                          display:'flex', alignItems:'center', justifyContent:'center', paddingLeft:'10%' }}>
              {renderVisual()}
            </div>
          </div>
        );

      // ── MAGAZINE-WRAP ──────────────────────────────────────────────────
      case "MAGAZINE-WRAP":
        return (
          <div style={{ ...slideRoot, flexDirection:'row', padding:0 }}>
            <div style={{ flex:'0 0 35%', background:'var(--sl-accent)', color:'var(--sl-bg)',
                          padding:\`\${padV} \${padH}\`, display:'flex', flexDirection:'column', justifyContent:'center' }}>
              {content.eyebrow && <span className="sl-anim" style={{ ...eyebrowStyle, color:'color-mix(in srgb, var(--sl-bg) 80%, transparent)' }}>{content.eyebrow}</span>}
              <h2 className="sl-anim" style={{ ...h2Style, color:'var(--sl-bg)', marginTop:gapSm }}>{content.headline}</h2>
            </div>
            <div style={{ flex:1, padding:\`\${padV} \${padH}\`, display:'flex', flexDirection:'column', justifyContent:'center' }}>
              {content.body && <p className="sl-anim" style={{ ...bodyStyle, fontSize:'clamp(28px,2.8cqw,42px)', lineHeight:1.5 }}>{content.body}</p>}
              <div style={{ marginTop:gap, alignSelf:'flex-start' }}>{renderVisual()}</div>
            </div>
          </div>
        );

      // ── QUOTE-WITH-ACCENT ──────────────────────────────────────────────
      case "QUOTE-WITH-ACCENT":
        return (
          <div style={{ ...slideRoot, justifyContent:'center', padding:\`0 clamp(80px,10cqw,200px)\` }}>
            <span className="material-symbols-rounded sl-anim" 
                  style={{ fontSize:'clamp(60px,8cqw,120px)', color:'var(--sl-accent)', opacity:0.3, marginBottom:gapSm }}>format_quote</span>
            <h2 className="sl-anim" style={{ ...h2Style, fontSize:'clamp(48px,5.5cqw,96px)', lineHeight:1.3 }}>
              "{content.quote}"
            </h2>
            {content.author && (
              <div className="sl-anim" style={{ marginTop:gap, display:'flex', alignItems:'center', gap:gapSm }}>
                <div style={{ width:'40px', height:'2px', background:'var(--sl-accent)' }} />
                <p style={{ ...labelStyle, fontSize:'clamp(18px,1.8cqw,26px)' }}>{content.author}</p>
              </div>
            )}
          </div>
        );

      // ── THREE-PILLAR ───────────────────────────────────────────────────
      case "THREE-PILLAR-BENEFITS":
        return (
          <div style={{ ...slideRoot }}>
            <div style={{ flexShrink:0, marginBottom:gap, display:'flex', flexDirection:'column', gap:gapSm }}>
              {content.eyebrow && <span className="sl-anim" style={eyebrowStyle}>{content.eyebrow}</span>}
              <h2 className="sl-anim" style={{ ...h2Style, maxWidth:'70%' }}>{content.headline}</h2>
            </div>
            <div style={{ flex:1, display:'flex', gap:'clamp(24px,3cqw,48px)', minHeight:0 }}>
              {content.pillars?.map((p, i) => (
                <div key={i} className="sl-anim-scale sl-interactive-card" style={{
                  flex:1, minWidth:0, ...glassCardStyle, display:'flex', flexDirection:'column', alignItems:'center', background:'color-mix(in srgb, var(--sl-text) 3%, transparent)' }}>
                  {p.icon && (
                    <span className="material-symbols-rounded" style={{ fontSize:'clamp(40px,4cqw,72px)', color:'var(--sl-accent)', marginBottom:gapSm }}>{p.icon}</span>
                  )}
                  <h3 style={h3Style}>{p.title}</h3>
                  <p style={{ ...bodyStyle, marginTop:gapSm, fontSize:'clamp(18px,1.8cqw,28px)' }}>{p.text}</p>
                </div>
              ))}
            </div>
          </div>
        );

      // ── MOSAIC-GRID ────────────────────────────────────────────────────
      case "MOSAIC-GRID":
        return (
          <div style={{ ...slideRoot, flexDirection:'row', gap:'clamp(40px,5cqw,80px)' }}>
            <div style={{ flex:'0 0 35%', display:'flex', flexDirection:'column', justifyContent:'center', gap:gapSm }}>
              {content.eyebrow && <span className="sl-anim" style={eyebrowStyle}>{content.eyebrow}</span>}
              <h2 className="sl-anim" style={h2Style}>{content.headline}</h2>
              {content.body && <p className="sl-anim" style={{ ...bodyStyle, marginTop:gapSm }}>{content.body}</p>}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'clamp(16px,2cqw,32px)', marginTop:gap }}>
              {(content.gridItems || []).slice(0,4).map((item, i) => (
                <div key={i} className="sl-anim-scale sl-interactive-card" style={{ ...glassCardStyle, padding:'clamp(24px,2.5cqw,40px)', background:'color-mix(in srgb, var(--sl-text) 3%, transparent)' }}>
                  {item.icon && (
                    <span className="material-symbols-rounded" style={{ fontSize:'clamp(32px,3cqw,56px)', color:'var(--sl-accent)', marginBottom:gapSm }}>{item.icon}</span>
                  )}
                  {item.title && <h3 style={{ ...h3Style, fontSize:'clamp(22px,2.2cqw,36px)' }}>{item.title}</h3>}
                  <p style={{ ...bodyStyle, marginTop:gapSm, fontSize:'clamp(18px,1.8cqw,26px)' }}>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        );

      // ── TIMELINE ───────────────────────────────────────────────────────
      case "TIMELINE-HORIZONTAL":
        return (
          <div style={{ ...slideRoot, justifyContent:'center' }}>
            <div style={{ marginBottom:'clamp(60px,8cqh,120px)', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:gapSm }}>
              {content.eyebrow && <span className="sl-anim" style={eyebrowStyle}>{content.eyebrow}</span>}
              <h2 className="sl-anim" style={{ ...h2Style, maxWidth:'80%' }}>{content.headline}</h2>
            </div>
            <div style={{ position:'relative', display:'flex', justifyContent:'space-between', marginTop:'auto', marginBottom:'clamp(40px,5cqh,80px)' }}>
              <div style={{ position:'absolute', top:'16px', left:'0', right:'0', height:'4px', background:'color-mix(in srgb, var(--sl-text) 10%, transparent)', zIndex:0 }} />
              {(content.milestones || []).map((m, i) => (
                <div key={i} className="sl-anim" style={{ zIndex:1, width:'clamp(160px,20cqw,320px)', display:'flex', flexDirection:'column' }}>
                  <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:'var(--sl-accent)', 
                                border:'6px solid var(--sl-bg)', boxShadow:'0 0 0 2px color-mix(in srgb, var(--sl-text) 10%, transparent)' }} />
                  {m.date && <p style={{ ...labelStyle, marginTop:gapSm, color:'var(--sl-accent)' }}>{m.date}</p>}
                  <h3 style={{ ...h3Style, fontSize:'clamp(20px,2cqw,32px)', marginTop:'8px' }}>{m.title}</h3>
                  <p style={{ ...bodyStyle, fontSize:'clamp(16px,1.6cqw,24px)', marginTop:'8px' }}>{m.description}</p>
                </div>
              ))}
            </div>
          </div>
        );

      // ── DEFAULT FALLBACK ───────────────────────────────────────────────
      default:
        return (
          <div style={{ ...slideRoot, justifyContent:'center' }}>
            {content.eyebrow && <span className="sl-anim" style={eyebrowStyle}>{content.eyebrow}</span>}
            <h2 className="sl-anim" style={{ ...h2Style, marginTop:gapSm }}>{content.headline}</h2>
            {content.body && <p className="sl-anim" style={{ ...bodyStyle, marginTop:gap }}>{content.body}</p>}
          </div>
        );
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div style={{ width: 1920, height: 1080, transform: \`scale(\${scale})\`, transformOrigin: 'center', position: 'relative', flexShrink: 0 }}>
        <style dangerouslySetInnerHTML={{ __html: " .sl-interactive-card { transition: transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1); transform: perspective(1200px) rotateY(var(--mouse-x, 0deg)) rotateX(var(--mouse-y, 0deg)); transform-style: preserve-3d; will-change: transform; } .sl-interactive-card > * { transform: translateZ(20px); } " }} />
        {renderBackground()}
        {renderContent()}
      </div>
    </div>
  );
}
`;
