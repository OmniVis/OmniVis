export const RENDERER_CODE_V0 = `
function Presentation() {
  const [current, setCurrent] = useState(0);
  const data = typeof slideData !== 'undefined' ? slideData : null;
  const totalSlides = data ? data.slides.length : 1;

  // Send title to parent immediately on first mount
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
      anime({ targets: '.sl-anim', translateY: [-20, 0], opacity: [0, 1],
              easing: 'spring(1, 80, 10, 0)', delay: anime.stagger(60), duration: 550 });
    }
  }, [current]);

  if (!data) return <div style={{padding:'2rem',color:'red',fontSize:'1.5rem'}}>Error: Invalid slide data</div>;

  const slide = data.slides[current];
  if (!slide) return null;

  const { archetype, content, visuals } = slide;

  // ÔöÇÔöÇ Background decoration ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  const renderBackground = () => {
    const fill = visuals?.fill || 'none';
    if (fill === 'diagonal-gradient') return (
      <div style={{ position:'absolute', inset:0, pointerEvents:'none',
        background:'linear-gradient(135deg, var(--sl-accent) 0%, transparent 50%)', opacity:0.07 }} />
    );
    if (fill === 'full-bleed-gradient') return (
      <div style={{ position:'absolute', inset:0, pointerEvents:'none',
        background:'linear-gradient(160deg, var(--sl-bg) 0%, color-mix(in srgb, var(--sl-accent) 15%, var(--sl-bg)) 100%)' }} />
    );
    if (fill === 'large-circle') return (
      <div style={{ position:'absolute', top:'-20%', right:'-15%', width:'60vh', height:'60vh',
        borderRadius:'50%', background:'var(--sl-accent)', opacity:0.05, pointerEvents:'none' }} />
    );
    if (fill === 'svg-grid') return (
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.04, pointerEvents:'none' }}>
        <defs><pattern id="g" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="1"/>
        </pattern></defs>
        <rect width="100%" height="100%" fill="url(#g)"/>
      </svg>
    );
    return null;
  };

  // ÔöÇÔöÇ Visual element renderer ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  const renderVisual = (extraStyle = {}) => {
    if (content.visualType === "icon" && content.visualPrompt) {
      return (
        <span className="material-symbols-rounded sl-anim"
              style={{ fontSize:'clamp(72px,10vw,140px)', color:'var(--sl-accent)', display:'block',
                       lineHeight:1, ...extraStyle }}>
          {content.visualPrompt}
        </span>
      );
    }
    if (content.visualType === "chart") {
      return (
        <div className="sl-anim" style={{ width:'100%', height:'clamp(160px,26vh,320px)',
          background:'rgba(0,0,0,0.04)', borderRadius:'1rem', display:'flex',
          alignItems:'center', justifyContent:'center', border:'1px solid rgba(0,0,0,0.08)', ...extraStyle }}>
          <span className="material-symbols-rounded" style={{ fontSize:'clamp(36px,5vw,64px)', color:'var(--sl-sub)' }}>bar_chart</span>
        </div>
      );
    }
    return null;
  };

  // ÔöÇÔöÇ Shared typography helpers ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  const eyebrowStyle = {
    fontSize:'clamp(10px,1.1vw,13px)', fontWeight:700, textTransform:'uppercase',
    letterSpacing:'0.18em', color:'var(--sl-accent)', marginBottom:'clamp(10px,1.8vh,20px)',
    display:'block', flexShrink:0, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis'
  };
  const h1Style = {
    fontSize:'clamp(32px,5.5vw,80px)', fontWeight:900, lineHeight:1.08,
    letterSpacing:'-0.02em', marginBottom:'clamp(12px,2vh,28px)', flexShrink:0,
    overflow:'hidden', whiteSpace:'pre-wrap', wordBreak:'break-word',
    display:'-webkit-box', WebkitLineClamp:4, WebkitBoxOrient:'vertical'
  };
  const h2Style = {
    fontSize:'clamp(24px,3.8vw,60px)', fontWeight:800, lineHeight:1.12,
    letterSpacing:'-0.02em', marginBottom:'clamp(10px,1.8vh,24px)', flexShrink:0,
    overflow:'hidden', wordBreak:'break-word',
    display:'-webkit-box', WebkitLineClamp:4, WebkitBoxOrient:'vertical'
  };
  const h3Style = {
    fontSize:'clamp(14px,1.8vw,22px)', fontWeight:700, lineHeight:1.25,
    marginBottom:'clamp(4px,0.8vh,10px)', overflow:'hidden', wordBreak:'break-word'
  };
  const bodyStyle = {
    fontSize:'clamp(13px,1.5vw,20px)', lineHeight:1.65, color:'var(--sl-sub)',
    overflow:'hidden', wordBreak:'break-word', flexShrink:1,
    display:'-webkit-box', WebkitLineClamp:4, WebkitBoxOrient:'vertical'
  };
  const labelStyle = {
    fontSize:'clamp(10px,1vw,13px)', fontWeight:600, textTransform:'uppercase',
    letterSpacing:'0.15em', color:'var(--sl-accent)', marginBottom:'clamp(4px,0.8vh,10px)',
    flexShrink:0, overflow:'hidden'
  };

  // ÔöÇÔöÇ Safe padding helper ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  const safePad = 'clamp(28px,4.5vw,72px) clamp(36px,5.5vw,90px)';

  // ÔöÇÔöÇ Slide content switch ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  const renderContent = () => {
    switch (archetype) {
      case "HERO-FULL-BLEED":
      case "IMMERSIVE-HERO":
        return (
          <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', height:'100%',
                        padding:'clamp(40px,6vw,100px) clamp(48px,7vw,110px)',
                        position:'relative', zIndex:1, maxWidth:'1200px', overflow:'hidden' }}>
            {content.eyebrow && <span className="sl-anim" style={eyebrowStyle}>{content.eyebrow}</span>}
            <h1 className="sl-anim" style={h1Style}>{content.headline}</h1>
            {content.body && <p className="sl-anim" style={{ ...bodyStyle, fontSize:'clamp(14px,1.6vw,22px)', maxWidth:'580px' }}>{content.body}</p>}
          </div>
        );

      case "STAT-SPOTLIGHT":
        return (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                        height:'100%', padding:safePad, textAlign:'center', position:'relative', zIndex:1,
                        overflow:'hidden' }}>
            {content.eyebrow && <span className="sl-anim" style={eyebrowStyle}>{content.eyebrow}</span>}
            <div style={{ display:'flex', gap:'clamp(32px,6vw,100px)', alignItems:'flex-end',
                          justifyContent:'center', flexWrap:'wrap', flexShrink:1, minWidth:0 }}>
              {(content.stats || []).slice(0,3).map((s, i) => (
                <div key={i} className="sl-anim" style={{ minWidth:0, flexShrink:1 }}>
                  <p style={{ fontSize:'clamp(44px,8vw,120px)', fontWeight:900, lineHeight:1,
                               color:'var(--sl-accent)', letterSpacing:'-0.03em',
                               overflow:'hidden', whiteSpace:'nowrap' }}>{s.value}</p>
                  <p style={{ marginTop:'clamp(4px,0.8vh,10px)', fontSize:'clamp(11px,1.3vw,17px)',
                               fontWeight:500, color:'var(--sl-sub)', overflow:'hidden',
                               display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{s.label}</p>
                </div>
              ))}
            </div>
            {content.body && <p className="sl-anim" style={{ ...bodyStyle, marginTop:'clamp(20px,3.5vh,40px)', maxWidth:'560px' }}>{content.body}</p>}
          </div>
        );

      case "TWO-COLUMN":
      case "CHART-WITH-ANNOTATION":
        return (
          <div style={{ display:'flex', alignItems:'center', height:'100%', gap:'clamp(24px,4vw,64px)',
                        padding:safePad, position:'relative', zIndex:1, overflow:'hidden' }}>
            <div style={{ flex:'0 0 44%', minWidth:0, display:'flex', flexDirection:'column',
                          justifyContent:'center', overflow:'hidden' }}>
              {content.eyebrow && <span className="sl-anim" style={eyebrowStyle}>{content.eyebrow}</span>}
              <h2 className="sl-anim" style={h2Style}>{content.headline}</h2>
              {content.body && <p className="sl-anim" style={bodyStyle}>{content.body}</p>}
            </div>
            <div style={{ flex:'0 0 50%', display:'flex', alignItems:'center',
                          justifyContent:'center', minWidth:0, overflow:'hidden' }}>
              {renderVisual()}
            </div>
          </div>
        );

      case "THREE-PILLAR-BENEFITS":
        return (
          <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', height:'100%',
                        padding:safePad, position:'relative', zIndex:1, overflow:'hidden' }}>
            {content.eyebrow && <span className="sl-anim" style={eyebrowStyle}>{content.eyebrow}</span>}
            {content.headline && <h2 className="sl-anim" style={{ ...h2Style, marginBottom:'clamp(20px,3.5vh,48px)' }}>{content.headline}</h2>}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'clamp(16px,3vw,48px)',
                          flex:1, minHeight:0, overflow:'hidden' }}>
              {(content.pillars || content.gridItems || []).slice(0,3).map((item, i) => (
                <div key={i} className="sl-anim" style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
                  {item.icon && <span className="material-symbols-rounded"
                    style={{ fontSize:'clamp(24px,3.5vw,44px)', color:'var(--sl-accent)',
                             marginBottom:'clamp(6px,1.2vh,14px)', flexShrink:0 }}>{item.icon}</span>}
                  {item.title && <h3 style={{ ...h3Style, WebkitLineClamp:2, display:'-webkit-box', WebkitBoxOrient:'vertical' }}>{item.title}</h3>}
                  <p style={{ ...bodyStyle, fontSize:'clamp(12px,1.3vw,17px)' }}>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case "REFERENCE-CASE":
        return (
          <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', height:'100%',
                        padding:safePad, position:'relative', zIndex:1, overflow:'hidden' }}>
            {content.eyebrow && <span className="sl-anim" style={eyebrowStyle}>{content.eyebrow}</span>}
            {content.headline && <h2 className="sl-anim" style={{ ...h2Style, marginBottom:'clamp(20px,3.5vh,48px)' }}>{content.headline}</h2>}
            <div style={{ display:'flex', gap:'clamp(20px,4vw,64px)', flex:1, minHeight:0, overflow:'hidden' }}>
              {[
                { label:'Challenge', text: content.challenge || content.body },
                { label:'Solution',  text: content.solution },
                { label:'Outcome',   text: content.outcome, bold: true },
              ].filter(c => c.text).map((col, i) => (
                <div key={i} className="sl-anim" style={{ flex:1, minWidth:0, overflow:'hidden' }}>
                  <p style={labelStyle}>{col.label}</p>
                  <p style={{ ...bodyStyle,
                    ...(col.bold ? { fontWeight:700, color:'var(--sl-text)', fontSize:'clamp(14px,1.6vw,22px)' } : {}),
                    WebkitLineClamp:6 }}>{col.text}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case "TIMELINE-HORIZONTAL":
        return (
          <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', height:'100%',
                        padding:safePad, position:'relative', zIndex:1, overflow:'hidden' }}>
            {content.eyebrow && <span className="sl-anim" style={eyebrowStyle}>{content.eyebrow}</span>}
            {content.headline && <h2 className="sl-anim" style={{ ...h2Style, marginBottom:'clamp(20px,4vh,52px)' }}>{content.headline}</h2>}
            <div style={{ position:'relative', flex:1, minHeight:0, overflow:'hidden' }}>
              <div style={{ position:'absolute', top:'14px', left:0, right:0, height:'2px', background:'rgba(0,0,0,0.1)' }} />
              <div style={{ display:'flex', gap:'clamp(8px,1.5vw,24px)', height:'100%' }}>
                {(content.milestones || []).slice(0,5).map((m, i) => (
                  <div key={i} className="sl-anim" style={{ flex:1, minWidth:0, paddingTop:'clamp(24px,3.5vh,44px)',
                                                            position:'relative', overflow:'hidden' }}>
                    <div style={{ position:'absolute', top:0, left:0, width:'clamp(18px,1.8vw,26px)',
                                  height:'clamp(18px,1.8vw,26px)', borderRadius:'50%',
                                  background:'var(--sl-accent)', border:'3px solid var(--sl-bg)',
                                  boxShadow:'0 2px 8px rgba(0,0,0,0.15)', flexShrink:0 }} />
                    {m.date && <p style={{ fontSize:'clamp(9px,1vw,12px)', fontWeight:700, textTransform:'uppercase',
                                           letterSpacing:'0.12em', color:'var(--sl-accent)', marginBottom:'4px',
                                           overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{m.date}</p>}
                    <h3 style={{ ...h3Style, fontSize:'clamp(12px,1.5vw,18px)', WebkitLineClamp:2,
                                 display:'-webkit-box', WebkitBoxOrient:'vertical' }}>{m.title}</h3>
                    <p style={{ ...bodyStyle, fontSize:'clamp(10px,1.2vw,14px)', WebkitLineClamp:3 }}>{m.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "QUOTE-WITH-ACCENT":
        return (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%',
                        padding:'clamp(40px,7vw,110px) clamp(64px,10vw,160px)',
                        position:'relative', zIndex:1, overflow:'hidden' }}>
            <div style={{ position:'absolute', left:'clamp(28px,3.5vw,56px)', top:'20%', bottom:'20%',
                          width:'clamp(3px,0.35vw,5px)', borderRadius:'3px', background:'var(--sl-accent)' }} />
            <div style={{ maxWidth:'760px', overflow:'hidden' }}>
              <span className="material-symbols-rounded sl-anim"
                style={{ fontSize:'clamp(36px,5vw,64px)', opacity:0.12, color:'var(--sl-accent)',
                         display:'block', marginBottom:'clamp(12px,2vh,28px)', flexShrink:0 }}>format_quote</span>
              <h2 className="sl-anim" style={{ ...h2Style, fontStyle:'italic', fontWeight:500,
                fontSize:'clamp(18px,2.8vw,44px)', WebkitLineClamp:6 }}>"{content.quote || content.headline}"</h2>
              {content.author && <p className="sl-anim" style={{ fontSize:'clamp(10px,1.2vw,15px)', fontWeight:700,
                textTransform:'uppercase', letterSpacing:'0.14em', color:'var(--sl-sub)',
                marginTop:'clamp(12px,1.8vh,24px)', overflow:'hidden' }}>ÔÇö {content.author}</p>}
            </div>
          </div>
        );

      case "MOSAIC-GRID": {
        const items = (content.gridItems || []).slice(0, 4);
        const cols = items.length <= 2 ? items.length : items.length === 3 ? 3 : 2;
        return (
          <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', height:'100%',
                        padding:safePad, position:'relative', zIndex:1, overflow:'hidden' }}>
            {content.eyebrow && <span className="sl-anim" style={eyebrowStyle}>{content.eyebrow}</span>}
            {content.headline && <h2 className="sl-anim" style={{ ...h2Style, marginBottom:'clamp(16px,2.5vh,36px)' }}>{content.headline}</h2>}
            <div style={{ display:'grid', gridTemplateColumns:\`repeat(\${cols},1fr)\`,
                          gap:'clamp(10px,1.8vw,24px)', flex:1, minHeight:0, overflow:'hidden' }}>
              {items.map((item, i) => (
                <div key={i} className="sl-anim"
                  style={{ padding:'clamp(14px,2.2vw,28px)', borderRadius:'clamp(10px,1.2vw,18px)',
                    border:'1px solid rgba(0,0,0,0.07)', background:'rgba(255,255,255,0.04)',
                    backdropFilter:'blur(8px)', overflow:'hidden', display:'flex', flexDirection:'column' }}>
                  {item.icon && <span className="material-symbols-rounded"
                    style={{ fontSize:'clamp(20px,3vw,36px)', color:'var(--sl-accent)',
                             display:'block', marginBottom:'clamp(6px,1vh,12px)', flexShrink:0 }}>{item.icon}</span>}
                  {item.title && <h3 style={{ ...h3Style, fontSize:'clamp(12px,1.5vw,18px)',
                    WebkitLineClamp:2, display:'-webkit-box', WebkitBoxOrient:'vertical' }}>{item.title}</h3>}
                  <p style={{ ...bodyStyle, fontSize:'clamp(11px,1.2vw,15px)', WebkitLineClamp:4 }}>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case "MAGAZINE-WRAP":
        return (
          <div style={{ display:'flex', height:'100%', position:'relative', zIndex:1, overflow:'hidden' }}>
            <div style={{ flex:'0 0 44%', display:'flex', flexDirection:'column', justifyContent:'center',
                          padding:'clamp(28px,4.5vw,72px) clamp(28px,4.5vw,64px)',
                          background:'var(--sl-bg)', boxShadow:'4px 0 24px rgba(0,0,0,0.06)',
                          position:'relative', zIndex:2, overflow:'hidden' }}>
              {content.eyebrow && <span className="sl-anim" style={eyebrowStyle}>{content.eyebrow}</span>}
              <h2 className="sl-anim" style={{ ...h2Style, WebkitLineClamp:5 }}>{content.headline}</h2>
              {content.body && <p className="sl-anim" style={{ ...bodyStyle, WebkitLineClamp:5 }}>{content.body}</p>}
            </div>
            <div style={{ flex:1, background:'rgba(0,0,0,0.04)', display:'flex', alignItems:'center',
                          justifyContent:'center', overflow:'hidden' }}>
              {renderVisual({ transform:'scale(1.3)', opacity:0.45 })}
            </div>
          </div>
        );

      case "DIAGONAL-SPLIT":
        return (
          <div style={{ display:'flex', alignItems:'center', height:'100%', gap:'clamp(24px,4vw,64px)',
                        padding:safePad, position:'relative', zIndex:1, overflow:'hidden' }}>
            <div style={{ position:'absolute', inset:'-10%', background:'rgba(0,0,0,0.035)',
                          transform:'rotate(-8deg)', transformOrigin:'top right', pointerEvents:'none' }} />
            <div style={{ flex:'0 0 50%', minWidth:0, position:'relative', zIndex:2,
                          display:'flex', flexDirection:'column', justifyContent:'center', overflow:'hidden' }}>
              {content.eyebrow && <span className="sl-anim" style={eyebrowStyle}>{content.eyebrow}</span>}
              <h2 className="sl-anim" style={{ ...h2Style, WebkitLineClamp:4 }}>{content.headline}</h2>
              {content.body && <p className="sl-anim" style={{ ...bodyStyle, WebkitLineClamp:4 }}>{content.body}</p>}
            </div>
            <div style={{ flex:'0 0 44%', display:'flex', alignItems:'center',
                          justifyContent:'center', position:'relative', zIndex:2, overflow:'hidden' }}>
              {renderVisual()}
            </div>
          </div>
        );

      default:
        return (
          <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', height:'100%',
                        padding:safePad, position:'relative', zIndex:1, overflow:'hidden' }}>
            {content.eyebrow && <span className="sl-anim" style={eyebrowStyle}>{content.eyebrow}</span>}
            <h2 className="sl-anim" style={{ ...h2Style, WebkitLineClamp:4 }}>{content.headline}</h2>
            {content.body && <p className="sl-anim" style={{ ...bodyStyle, maxWidth:'600px', WebkitLineClamp:5 }}>{content.body}</p>}
          </div>
        );
    }
  };

  const slideStyle = {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    background: 'var(--sl-bg)',
    color: 'var(--sl-text)',
    fontFamily: 'inherit',
    ...(archetype === 'IMMERSIVE-HERO' ? {
      background: 'linear-gradient(160deg, var(--sl-bg) 0%, color-mix(in srgb, var(--sl-accent) 14%, var(--sl-bg)) 100%)'
    } : {})
  };

  return (
    <div style={{ width:'100vw', height:'100vh', overflow:'hidden', position:'relative' }}>
      <div style={slideStyle}>
        {renderBackground()}
        {renderContent()}
        <div style={{ position:'absolute', bottom:'clamp(10px,1.8vh,18px)', right:'clamp(14px,1.8vw,24px)',
                      fontFamily:'monospace', fontSize:'clamp(9px,1.1vw,12px)', color:'var(--sl-sub)', zIndex:50,
                      fontWeight:500, letterSpacing:'0.05em' }}>
          {current + 1} / {totalSlides}
        </div>
      </div>
    </div>
  );
}
`;
