export { RENDERER_CODE_V2 } from './presentationRendererV2';
export { RENDERER_CODE_V0 } from './presentationRendererV0';
export { RENDERER_CODE_V3 } from './presentationRendererV3';
export { RENDERER_CODE_V4 } from './presentationRendererV4';

export const RENDERER_CODE_V1 = `
function Presentation() {
  const [current, setCurrent] = useState(0);
  const data = typeof slideData !== 'undefined' ? slideData : null;
  const totalSlides = data ? data.slides.length : 1;

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

  // ── Background decoration ─────────────────────────────────────────────
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
      <div style={{ position:'absolute', top:'-20%', right:'-15%', width:'60cqh', height:'60cqh',
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

  // ── Visual element renderer ───────────────────────────────────────────
  const renderVisual = (extraStyle = {}) => {
    if (content.visualType === "icon" && content.visualPrompt) {
      return (
        <span className="material-symbols-rounded sl-anim"
              style={{ fontSize:'clamp(80px,10cqw,160px)', color:'var(--sl-accent)', display:'block',
                       lineHeight:1, ...extraStyle }}>
          {content.visualPrompt}
        </span>
      );
    }
    if (content.visualType === "chart") {
      const bars = [0.35, 0.52, 0.44, 0.68, 0.60, 0.88];
      return (
        <div className="sl-anim" style={{ width:'100%', height:'100%', minHeight:'clamp(160px,22cqh,300px)',
          display:'flex', flexDirection:'column', alignItems:'stretch', justifyContent:'center',
          padding:'clamp(16px,2cqw,28px)', overflow:'hidden', ...extraStyle }}>
          <svg viewBox="0 0 540 260" preserveAspectRatio="xMidYMid meet"
            style={{ width:'100%', flex:1, overflow:'visible', minHeight:0 }}>
            {[0.25,0.5,0.75,1].map((y,i) => (
              <line key={i} x1="48" y1={220-y*180} x2="520" y2={220-y*180}
                stroke="currentColor" strokeWidth="1" strokeOpacity="0.1" />
            ))}
            {bars.map((h,i) => (
              <rect key={i} x={64+i*76} y={220-h*180} width={52} height={h*180}
                rx="5" fill="var(--sl-accent)" fillOpacity={0.55+i*0.07} />
            ))}
            <line x1="48" y1="220" x2="520" y2="220"
              stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
          </svg>
          {content.visualPrompt && (
            <p style={{ fontSize:'clamp(14px,1.2cqw,18px)', color:'var(--sl-sub)', textAlign:'center',
              fontStyle:'italic', margin:'clamp(6px,1cqh,10px) 0 0', overflow:'hidden',
              whiteSpace:'nowrap', textOverflow:'ellipsis', flexShrink:0 }}>{content.visualPrompt}</p>
          )}
        </div>
      );
    }
    if (content.visualType === "custom-svg" && content.customSvgCode) {
      return (
        <div className="sl-anim" style={{ width:'100%', height:'100%', display:'flex',
          alignItems:'center', justifyContent:'center', overflow:'hidden', ...extraStyle }}
          dangerouslySetInnerHTML={{ __html: content.customSvgCode }}
        />
      );
    }
    return null;
  };

  // ── Typography scale ─────────────────────────────────────────────────
  // Uses cqw/cqh (container query units) against the fixed 1920×1080 canvas.
  // 1cqw = 19.2px, 1cqh = 10.8px at full 1080p resolution.
  const eyebrowStyle = {
    fontSize:'clamp(16px,1.5cqw,24px)', fontWeight:700, textTransform:'uppercase',
    letterSpacing:'0.15em', color:'var(--sl-accent)',
    display:'block', flexShrink:0, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis'
  };
  const h1Style = {
    fontSize:'clamp(60px,6cqw,120px)', fontWeight:900, lineHeight:1.1,
    letterSpacing:'-0.02em', margin:0, flexShrink:0,
    overflow:'hidden', whiteSpace:'pre-wrap', wordBreak:'break-word'
  };
  const h2Style = {
    fontSize:'clamp(40px,4.5cqw,80px)', fontWeight:800, lineHeight:1.15,
    letterSpacing:'-0.01em', margin:0, flexShrink:0,
    overflow:'hidden', wordBreak:'break-word',
    display:'-webkit-box', WebkitLineClamp:4, WebkitBoxOrient:'vertical'
  };
  const h3Style = {
    fontSize:'clamp(24px,2.5cqw,40px)', fontWeight:700, lineHeight:1.25,
    margin:0, overflow:'hidden', wordBreak:'break-word', flexShrink:0
  };
  const bodyStyle = {
    fontSize:'clamp(20px,2cqw,32px)', lineHeight:1.6, color:'var(--sl-sub)',
    margin:0, overflow:'hidden', wordBreak:'break-word',
    display:'-webkit-box', WebkitLineClamp:5, WebkitBoxOrient:'vertical'
  };
  const labelStyle = {
    fontSize:'clamp(16px,1.5cqw,20px)', fontWeight:700, textTransform:'uppercase',
    letterSpacing:'0.15em', color:'var(--sl-accent)', margin:0, flexShrink:0
  };

  // ── Layout constants ──────────────────────────────────────────────────
  const padV = 'clamp(40px,6cqh,90px)';
  const padH = 'clamp(50px,7cqw,120px)';
  const gap   = 'clamp(20px,3cqh,40px)';
  const gapSm = 'clamp(12px,1.5cqh,24px)';

  // ── Slide root: flex column, full bleed, all archetypes build on this ─
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

      // ── HERO: left text with decorative right gradient panel ──────────
      case "HERO-FULL-BLEED":
        return (
          <div style={{ ...slideRoot, flexDirection:'row' }}>
            <div style={{ position:'absolute', top:0, right:0, bottom:0, width:'40%',
              background:'linear-gradient(225deg, color-mix(in srgb, var(--sl-accent) 12%, transparent) 0%, transparent 80%)',
              zIndex:0 }} />
            <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center',
                          zIndex:1, paddingRight:'5cqw', overflow:'hidden', gap:gapSm }}>
              {content.eyebrow && <span className="sl-anim" style={eyebrowStyle}>{content.eyebrow}</span>}
              <h1 className="sl-anim" style={h1Style}>{content.headline}</h1>
              {content.body && (
                <p className="sl-anim" style={{ ...bodyStyle, maxWidth:'800px', marginTop:gap }}>{content.body}</p>
              )}
            </div>
          </div>
        );

      // ── IMMERSIVE-HERO: headline only, centered radial glow ───────────
      case "IMMERSIVE-HERO":
        return (
          <div style={{ ...slideRoot, justifyContent:'center', alignItems:'center', textAlign:'center',
                        background:'radial-gradient(circle at center, color-mix(in srgb, var(--sl-accent) 15%, transparent) 0%, var(--sl-bg) 70%)' }}>
            {content.eyebrow && <span className="sl-anim" style={{ ...eyebrowStyle, marginBottom:gap }}>{content.eyebrow}</span>}
            <h1 className="sl-anim" style={{ ...h1Style, fontSize:'clamp(80px,8cqw,160px)', maxWidth:'90%', margin:0 }}>{content.headline}</h1>
          </div>
        );

      // ── STAT: giant numbers, top-border accents, decorative circle ────
      case "STAT-SPOTLIGHT":
        return (
          <div style={{ ...slideRoot, justifyContent:'center' }}>
            <div style={{ position:'absolute', top:'-10%', right:'-10%', width:'70cqh', height:'70cqh',
              borderRadius:'50%', background:'radial-gradient(circle, color-mix(in srgb, var(--sl-accent) 8%, transparent) 0%, transparent 70%)',
              pointerEvents:'none', zIndex:0 }} />
            <div style={{ zIndex:1, display:'flex', flexDirection:'column', width:'100%' }}>
              {content.eyebrow && <span className="sl-anim" style={{ ...eyebrowStyle, marginBottom:'clamp(30px,5cqh,60px)' }}>{content.eyebrow}</span>}
              <div style={{ display:'flex', gap:'clamp(24px,4cqw,80px)', flexWrap:'wrap', width:'100%' }}>
                {(content.stats || []).slice(0,3).map((s, i) => (
                  <div key={i} className="sl-anim" style={{ flex:'1 1 0', minWidth:'250px',
                    borderTop:'4px solid var(--sl-accent)', paddingTop:gapSm }}>
                    <p style={{ fontSize:'clamp(70px,8cqw,140px)', fontWeight:900, lineHeight:1,
                                 color:'var(--sl-accent)', letterSpacing:'-0.03em', margin:0 }}>{s.value}</p>
                    <p style={{ marginTop:gapSm, ...labelStyle, fontSize:'clamp(18px,1.8cqw,26px)',
                                 fontWeight:600, textTransform:'none', letterSpacing:0 }}>{s.label}</p>
                  </div>
                ))}
              </div>
              {content.body && (
                <p className="sl-anim" style={{ ...bodyStyle, marginTop:'clamp(40px,6cqh,80px)', maxWidth:'800px' }}>{content.body}</p>
              )}
            </div>
          </div>
        );

      // ── TWO-COLUMN: text left, visual right, adaptive when no visual ──
      case "TWO-COLUMN":
      case "CHART-WITH-ANNOTATION": {
        const hasVisual = (content.visualType === 'icon' && content.visualPrompt) ||
                          content.visualType === 'chart' ||
                          (content.visualType === 'custom-svg' && content.customSvgCode);
        return (
          <div style={{ ...slideRoot, flexDirection:'row', alignItems:'stretch',
                        gap: hasVisual ? 'clamp(24px,4cqw,64px)' : 0 }}>
            <div style={{ flex: hasVisual ? '0 0 44%' : '1', minWidth:0, display:'flex', flexDirection:'column',
                          justifyContent:'center', overflow:'hidden', gap:gapSm }}>
              {content.eyebrow && <span className="sl-anim" style={eyebrowStyle}>{content.eyebrow}</span>}
              <h2 className="sl-anim" style={h2Style}>{content.headline}</h2>
              {content.body && <p className="sl-anim" style={{ ...bodyStyle, marginTop:gapSm }}>{content.body}</p>}
            </div>
            {hasVisual && (
              <div style={{ flex:1, minWidth:0, display:'flex', alignItems:'center',
                            justifyContent:'center', overflow:'hidden' }}>
                {renderVisual({ width:'100%', maxHeight:'100%' })}
              </div>
            )}
          </div>
        );
      }

      // ── THREE-PILLAR: header anchored top, grid fills rest ───────────
      case "THREE-PILLAR-BENEFITS":
        return (
          <div style={{ ...slideRoot, gap }}>
            <div style={{ flexShrink:0, display:'flex', flexDirection:'column', gap:gapSm }}>
              {content.eyebrow && <span className="sl-anim" style={eyebrowStyle}>{content.eyebrow}</span>}
              {content.headline && <h2 className="sl-anim" style={h2Style}>{content.headline}</h2>}
            </div>
            <div style={{ flex:1, minHeight:0, display:'grid',
                          gridTemplateColumns:'repeat(3, 1fr)',
                          gridTemplateRows:'1fr',
                          alignItems:'stretch',
                          gap:'clamp(14px,2.5cqw,36px)' }}>
              {(content.pillars || content.gridItems || []).slice(0,3).map((item, i) => (
                <div key={i} className="sl-anim"
                  style={{ display:'flex', flexDirection:'column', gap:gapSm,
                           padding:'clamp(16px,2.5cqw,32px)',
                           borderRadius:'clamp(12px,1.5cqw,20px)',
                           border:'1px solid rgba(128,128,128,0.14)',
                           background:'rgba(128,128,128,0.04)',
                           overflow:'hidden' }}>
                  {item.icon && (
                    <div style={{ width:'clamp(40px,4cqw,60px)', height:'clamp(40px,4cqw,60px)',
                                  borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                                  background:'color-mix(in srgb, var(--sl-accent) 15%, transparent)', flexShrink:0 }}>
                      <span className="material-symbols-rounded"
                        style={{ fontSize:'clamp(22px,2.5cqw,36px)', color:'var(--sl-accent)' }}>{item.icon}</span>
                    </div>
                  )}
                  {item.title && <h3 style={h3Style}>{item.title}</h3>}
                  <p style={{ ...bodyStyle, fontSize:'clamp(18px,1.8cqw,26px)' }}>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        );

      // ── MOSAIC-GRID: header + stretching card grid ───────────────────
      case "MOSAIC-GRID": {
        const items = (content.gridItems || []).slice(0, 4);
        const cols = items.length <= 2 ? items.length : items.length === 3 ? 3 : 2;
        const rows = items.length === 4 ? 2 : 1;
        return (
          <div style={{ ...slideRoot, gap }}>
            <div style={{ flexShrink:0, display:'flex', flexDirection:'column', gap:gapSm }}>
              {content.eyebrow && <span className="sl-anim" style={eyebrowStyle}>{content.eyebrow}</span>}
              {content.headline && <h2 className="sl-anim" style={h2Style}>{content.headline}</h2>}
            </div>
            <div style={{ flex:1, minHeight:0, display:'grid',
                          gridTemplateColumns:\`repeat(\${cols}, 1fr)\`,
                          gridTemplateRows:\`repeat(\${rows}, 1fr)\`,
                          alignItems:'stretch',
                          gap:'clamp(10px,1.8cqw,22px)' }}>
              {items.map((item, i) => (
                <div key={i} className="sl-anim"
                  style={{ display:'flex', flexDirection:'column', gap:gapSm,
                           padding:'clamp(14px,2.2cqw,28px)',
                           borderRadius:'clamp(10px,1.2cqw,18px)',
                           border:'1px solid rgba(128,128,128,0.12)',
                           background:'rgba(128,128,128,0.04)',
                           backdropFilter:'blur(8px)',
                           overflow:'hidden' }}>
                  {item.icon && <span className="material-symbols-rounded"
                    style={{ fontSize:'clamp(24px,3cqw,40px)', color:'var(--sl-accent)', flexShrink:0 }}>{item.icon}</span>}
                  {item.title && <h3 style={{ ...h3Style, fontSize:'clamp(20px,2cqw,30px)' }}>{item.title}</h3>}
                  <p style={{ ...bodyStyle, fontSize:'clamp(18px,1.8cqw,26px)',
                               WebkitLineClamp:6 }}>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        );
      }

      // ── REFERENCE-CASE: header + 3 stretch columns ───────────────────
      case "REFERENCE-CASE":
        return (
          <div style={{ ...slideRoot, gap }}>
            <div style={{ flexShrink:0, display:'flex', flexDirection:'column', gap:gapSm }}>
              {content.eyebrow && <span className="sl-anim" style={eyebrowStyle}>{content.eyebrow}</span>}
              {content.headline && <h2 className="sl-anim" style={h2Style}>{content.headline}</h2>}
            </div>
            <div style={{ flex:1, minHeight:0, display:'grid',
                          gridTemplateColumns:'repeat(3, 1fr)',
                          gridTemplateRows:'1fr',
                          alignItems:'stretch',
                          gap:'clamp(18px,3.5cqw,56px)' }}>
              {[
                { label:'Challenge', text: content.challenge || content.body },
                { label:'Solution',  text: content.solution },
                { label:'Outcome',   text: content.outcome, bold: true },
              ].filter(c => c.text).map((col, i) => (
                <div key={i} className="sl-anim"
                  style={{ display:'flex', flexDirection:'column', gap:gapSm,
                           borderTop:\`2px solid \${i === 2 ? 'var(--sl-accent)' : 'rgba(128,128,128,0.2)'}\`,
                           paddingTop:'clamp(12px,2cqh,24px)', overflow:'hidden' }}>
                  <p style={labelStyle}>{col.label}</p>
                  <p style={{ ...bodyStyle, flexShrink:1,
                    ...(col.bold ? { fontWeight:700, color:'var(--sl-text)',
                                     fontSize:'clamp(20px,2cqw,30px)' } : {}),
                    WebkitLineClamp:8 }}>{col.text}</p>
                </div>
              ))}
            </div>
          </div>
        );

      // ── TIMELINE: header + milestone nodes with ring dots ─────────────
      case "TIMELINE-HORIZONTAL": {
        const milestones = (content.milestones || []).slice(0, 5);
        return (
          <div style={{ ...slideRoot, justifyContent:'center' }}>
            <div style={{ marginBottom:'clamp(60px,8cqh,100px)', flexShrink:0 }}>
              {content.eyebrow && <span className="sl-anim" style={{ ...eyebrowStyle, display:'block', marginBottom:gapSm }}>{content.eyebrow}</span>}
              {content.headline && <h2 className="sl-anim" style={h2Style}>{content.headline}</h2>}
            </div>
            <div style={{ position:'relative', display:'flex', justifyContent:'space-between', padding:\`0 \${gapSm}\` }}>
              {/* Connector line */}
              <div style={{ position:'absolute', top:'14px', left:gapSm, right:gapSm, height:'4px',
                background:'color-mix(in srgb, var(--sl-accent) 25%, rgba(128,128,128,0.2))', zIndex:0 }} />
              {milestones.map((m, i) => (
                <div key={i} className="sl-anim"
                  style={{ position:'relative', flex:1,
                           paddingRight: i === milestones.length - 1 ? 0 : gap, zIndex:1 }}>
                  {/* Date label above dot */}
                  {m.date && (
                    <div style={{ position:'absolute', top:'-40px', left:0,
                      fontSize:'clamp(15px,1.5cqw,20px)', fontWeight:800,
                      color:'var(--sl-accent)', letterSpacing:'0.05em' }}>{m.date}</div>
                  )}
                  {/* Hollow ring dot */}
                  <div style={{ width:'32px', height:'32px', borderRadius:'50%',
                    background:'var(--sl-bg)', border:'4px solid var(--sl-accent)',
                    boxShadow:'0 0 0 6px color-mix(in srgb, var(--sl-accent) 15%, transparent)',
                    marginBottom:'clamp(24px,4cqh,40px)' }} />
                  <h3 style={{ ...h3Style, fontSize:'clamp(20px,2cqw,32px)', marginBottom:gapSm }}>{m.title}</h3>
                  <p style={{ ...bodyStyle, fontSize:'clamp(18px,1.6cqw,24px)', WebkitLineClamp:4 }}>{m.description}</p>
                </div>
              ))}
            </div>
          </div>
        );
      }

      // ── QUOTE: centered with left accent border, large quote icon ─────
      case "QUOTE-WITH-ACCENT":
        return (
          <div style={{ ...slideRoot, justifyContent:'center', alignItems:'center' }}>
            <div style={{ position:'relative', width:'100%', maxWidth:'1100px',
                          display:'flex', flexDirection:'column', alignItems:'flex-start' }}>
              <span className="material-symbols-rounded"
                style={{ position:'absolute', top:'-110px', left:'-110px',
                         fontSize:'180px', color:'var(--sl-accent)', opacity:0.15,
                         zIndex:0, userSelect:'none', pointerEvents:'none' }}>
                format_quote
              </span>
              <div style={{ borderLeft:'8px solid var(--sl-accent)',
                            paddingLeft:'clamp(40px,5cqw,80px)', zIndex:1, width:'100%' }}>
                <h2 className="sl-anim" style={{ ...h2Style, fontSize:'clamp(40px,5cqw,72px)',
                                                  lineHeight:1.3, fontWeight:700 }}>
                  "{content.quote || content.headline}"
                </h2>
                {content.author && (
                  <p className="sl-anim" style={{ ...labelStyle, marginTop:gap,
                                                   fontSize:'clamp(20px,2cqw,28px)' }}>
                    — {content.author}
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      // ── MAGAZINE-WRAP: text panel left, vivid visual panel right ──────
      case "MAGAZINE-WRAP":
        return (
          <div style={{ ...slideRoot, padding:0, flexDirection:'row' }}>
            <div style={{ flex:'0 0 45%', display:'flex', flexDirection:'column',
                          justifyContent:'center', gap:gapSm,
                          padding:\`\${padV} \${padH}\`,
                          background:'var(--sl-bg)',
                          boxShadow:'4px 0 32px rgba(0,0,0,0.08)',
                          overflow:'hidden', zIndex:2 }}>
              {content.eyebrow && <span className="sl-anim" style={eyebrowStyle}>{content.eyebrow}</span>}
              <h2 className="sl-anim" style={{ ...h2Style, WebkitLineClamp:5 }}>{content.headline}</h2>
              {content.body && (
                <p className="sl-anim" style={{ ...bodyStyle, WebkitLineClamp:6 }}>{content.body}</p>
              )}
            </div>
            <div style={{ flex:1, background:'linear-gradient(135deg, color-mix(in srgb, var(--sl-accent) 15%, transparent) 0%, color-mix(in srgb, var(--sl-accent) 5%, transparent) 100%)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:'-15%', right:'-10%', width:'60cqh', height:'60cqh',
                borderRadius:'50%', background:'color-mix(in srgb, var(--sl-accent) 10%, transparent)', zIndex:0 }} />
              <div style={{ position:'absolute', bottom:'10%', left:'10%', width:'30cqh', height:'30cqh',
                borderRadius:'50%', background:'color-mix(in srgb, var(--sl-accent) 15%, transparent)', zIndex:0 }} />
              <div style={{ zIndex:1, position:'relative' }}>
                {renderVisual({ fontSize:'clamp(140px,18cqw,280px)', color:'var(--sl-accent)' })}
              </div>
            </div>
          </div>
        );

      // ── DIAGONAL-SPLIT: clipPath diagonal bg, text left, visual right ─
      case "DIAGONAL-SPLIT": {
        const hasVisual = (content.visualType === 'icon' && content.visualPrompt) ||
                          content.visualType === 'chart' ||
                          (content.visualType === 'custom-svg' && content.customSvgCode);
        return (
          <div style={{ ...slideRoot, padding:0, flexDirection:'row' }}>
            <div style={{ position:'absolute', inset:0,
              background:'color-mix(in srgb, var(--sl-accent) 8%, transparent)',
              clipPath:'polygon(40% 0, 100% 0, 100% 100%, 20% 100%)', zIndex:0 }} />
            <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center',
                          padding:\`\${padV} \${padH}\`, zIndex:1, gap:gapSm, overflow:'hidden' }}>
              {content.eyebrow && <span className="sl-anim" style={eyebrowStyle}>{content.eyebrow}</span>}
              <h2 className="sl-anim" style={{ ...h2Style, WebkitLineClamp:4 }}>{content.headline}</h2>
              {content.body && (
                <p className="sl-anim" style={{ ...bodyStyle, WebkitLineClamp:5 }}>{content.body}</p>
              )}
            </div>
            {hasVisual && (
              <div style={{ flex:'0 0 45%', display:'flex', alignItems:'center',
                            justifyContent:'center', zIndex:1, paddingRight:padH, overflow:'hidden' }}>
                {renderVisual({ fontSize:'clamp(100px,14cqw,220px)' })}
              </div>
            )}
          </div>
        );
      }

      // ── COMPARISON: two equal panels, neutral vs accent-tinted ──────
      case "COMPARISON": {
        const sides = (content.gridItems || []).slice(0, 2);
        return (
          <div style={{ ...slideRoot, gap }}>
            {(content.eyebrow || content.headline) && (
              <div style={{ flexShrink:0, display:'flex', flexDirection:'column', gap:gapSm }}>
                {content.eyebrow && <span className="sl-anim" style={eyebrowStyle}>{content.eyebrow}</span>}
                {content.headline && <h2 className="sl-anim" style={h2Style}>{content.headline}</h2>}
              </div>
            )}
            <div style={{ flex:1, minHeight:0, display:'flex', alignItems:'stretch',
                          gap:'clamp(24px,4cqw,64px)' }}>
              {sides.map((item, i) => (
                <div key={i} className="sl-anim"
                  style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center',
                           gap:gapSm, padding:'clamp(24px,3cqw,48px)',
                           borderRadius:'clamp(12px,1.5cqw,20px)',
                           background: i === 0
                             ? 'rgba(128,128,128,0.05)'
                             : 'color-mix(in srgb, var(--sl-accent) 6%, transparent)',
                           border: i === 0
                             ? '1px solid rgba(128,128,128,0.12)'
                             : '1px solid color-mix(in srgb, var(--sl-accent) 22%, transparent)',
                           overflow:'hidden' }}>
                  {item.icon && (
                    <span className="material-symbols-rounded"
                      style={{ fontSize:'clamp(36px,4cqw,64px)', color:'var(--sl-accent)',
                               flexShrink:0 }}>{item.icon}</span>
                  )}
                  {item.title && (
                    <h3 style={{ ...h3Style, fontSize:'clamp(26px,3cqw,44px)',
                                 color: i === 1 ? 'var(--sl-accent)' : 'var(--sl-text)' }}>
                      {item.title}
                    </h3>
                  )}
                  <p style={{ ...bodyStyle, WebkitLineClamp:8 }}>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        );
      }

      // ── NUMBERED-LIST: large faded numbers, vertical list ─────────────
      case "NUMBERED-LIST": {
        const items = (content.gridItems || []).slice(0, 5);
        return (
          <div style={{ ...slideRoot, gap }}>
            <div style={{ flexShrink:0, display:'flex', flexDirection:'column', gap:gapSm }}>
              {content.eyebrow && <span className="sl-anim" style={eyebrowStyle}>{content.eyebrow}</span>}
              {content.headline && <h2 className="sl-anim" style={h2Style}>{content.headline}</h2>}
            </div>
            <div style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column',
                          justifyContent:'space-evenly' }}>
              {items.map((item, i) => (
                <div key={i} className="sl-anim"
                  style={{ display:'flex', alignItems:'center',
                           gap:'clamp(20px,3cqw,48px)',
                           paddingBottom: i < items.length - 1 ? gapSm : 0,
                           borderBottom: i < items.length - 1
                             ? '1px solid rgba(128,128,128,0.1)' : 'none' }}>
                  <span style={{ fontSize:'clamp(40px,5cqw,88px)', fontWeight:900, lineHeight:1,
                                 color:'var(--sl-accent)', opacity:0.22, flexShrink:0,
                                 width:'clamp(52px,6cqw,108px)', textAlign:'right',
                                 fontVariantNumeric:'tabular-nums' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div style={{ flex:1, minWidth:0 }}>
                    {item.title && (
                      <h3 style={{ ...h3Style, fontSize:'clamp(22px,2.2cqw,36px)',
                                   marginBottom:gapSm }}>{item.title}</h3>
                    )}
                    <p style={{ ...bodyStyle, WebkitLineClamp:2 }}>{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      // ── CLOSING-CTA: centered, accent underline, radial glow ─────────
      case "CLOSING-CTA":
        return (
          <div style={{ ...slideRoot, justifyContent:'center', alignItems:'center', textAlign:'center' }}>
            <div style={{ position:'absolute', top:'50%', left:'50%',
              transform:'translate(-50%, -50%)',
              width:'80cqw', height:'80cqh', borderRadius:'50%',
              background:'radial-gradient(circle, color-mix(in srgb, var(--sl-accent) 10%, transparent) 0%, transparent 70%)',
              pointerEvents:'none', zIndex:0 }} />
            <div style={{ zIndex:1, display:'flex', flexDirection:'column',
                          alignItems:'center', gap:gap, maxWidth:'900px' }}>
              {content.eyebrow && (
                <span className="sl-anim" style={eyebrowStyle}>{content.eyebrow}</span>
              )}
              <h1 className="sl-anim" style={{ ...h1Style, textAlign:'center' }}>{content.headline}</h1>
              <div style={{ width:'clamp(48px,5cqw,80px)', height:'4px', borderRadius:'2px',
                            background:'var(--sl-accent)', flexShrink:0 }} />
              {content.body && (
                <p className="sl-anim" style={{ ...bodyStyle, textAlign:'center',
                                                maxWidth:'700px' }}>{content.body}</p>
              )}
            </div>
          </div>
        );

      // ── PROCESS-FLOW: numbered steps with chevron connectors ─────────
      case "PROCESS-FLOW": {
        const steps = (content.milestones || content.gridItems || []).slice(0, 5);
        return (
          <div style={{ ...slideRoot, gap }}>
            <div style={{ flexShrink:0, display:'flex', flexDirection:'column', gap:gapSm }}>
              {content.eyebrow && <span className="sl-anim" style={eyebrowStyle}>{content.eyebrow}</span>}
              {content.headline && <h2 className="sl-anim" style={h2Style}>{content.headline}</h2>}
            </div>
            <div style={{ flex:1, minHeight:0, display:'flex', alignItems:'stretch',
                          gap:'clamp(10px,1.5cqw,20px)' }}>
              {steps.map((step, i) => (
                <div key={i} className="sl-anim"
                  style={{ flex:1, display:'flex', flexDirection:'column', gap:gapSm,
                           padding:'clamp(16px,2cqw,28px)',
                           borderRadius:'clamp(10px,1.2cqw,18px)',
                           border:'1px solid rgba(128,128,128,0.12)',
                           background:'rgba(128,128,128,0.04)',
                           position:'relative', overflow:'hidden' }}>
                  {i < steps.length - 1 && (
                    <div style={{ position:'absolute', top:'50%', right:'-14px',
                      transform:'translateY(-50%)',
                      width:'28px', height:'28px', borderRadius:'50%',
                      background:'var(--sl-bg)', border:'2px solid color-mix(in srgb, var(--sl-accent) 40%, transparent)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      zIndex:2, color:'var(--sl-accent)', fontSize:'18px', lineHeight:1,
                      flexShrink:0 }}>›</div>
                  )}
                  <div style={{ width:'clamp(28px,3cqw,48px)', height:'clamp(28px,3cqw,48px)',
                                borderRadius:'50%', background:'var(--sl-accent)',
                                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ fontSize:'clamp(13px,1.4cqw,20px)', fontWeight:900,
                                   color:'var(--sl-bg)', lineHeight:1 }}>{i + 1}</span>
                  </div>
                  <h3 style={{ ...h3Style, fontSize:'clamp(18px,2cqw,30px)' }}>
                    {step.title}
                  </h3>
                  <p style={{ ...bodyStyle, fontSize:'clamp(16px,1.6cqw,22px)', WebkitLineClamp:4 }}>
                    {step.description || step.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      }

      // ── SCORECARD: label-value metric rows, alternating bg ────────────
      case "SCORECARD": {
        const rows = (content.gridItems || []).slice(0, 6);
        return (
          <div style={{ ...slideRoot, gap }}>
            <div style={{ flexShrink:0, display:'flex', flexDirection:'column', gap:gapSm }}>
              {content.eyebrow && <span className="sl-anim" style={eyebrowStyle}>{content.eyebrow}</span>}
              {content.headline && <h2 className="sl-anim" style={h2Style}>{content.headline}</h2>}
            </div>
            <div style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column',
                          justifyContent:'space-evenly' }}>
              {rows.map((row, i) => (
                <div key={i} className="sl-anim"
                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                           gap:gap,
                           padding:\`clamp(10px,1.5cqh,18px) clamp(14px,2cqw,28px)\`,
                           borderRadius:'clamp(8px,1cqw,14px)',
                           background: i % 2 === 0 ? 'rgba(128,128,128,0.05)' : 'transparent',
                           borderLeft:\`3px solid \${i % 2 === 0 ? 'var(--sl-accent)' : 'transparent'}\` }}>
                  <span style={{ ...bodyStyle, fontWeight:600, color:'var(--sl-text)',
                                 display:'block', WebkitLineClamp:1, flex:1 }}>{row.title}</span>
                  <span style={{ fontSize:'clamp(22px,2.5cqw,40px)', fontWeight:800,
                                 color:'var(--sl-accent)', flexShrink:0, textAlign:'right' }}>
                    {row.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      }

      // ── ICON-SHOWCASE: icon grid with labels only, no body text ───────
      case "ICON-SHOWCASE": {
        const items = (content.gridItems || []).slice(0, 8);
        const cols = items.length <= 4 ? items.length : Math.ceil(items.length / 2);
        const rows = items.length <= 4 ? 1 : 2;
        return (
          <div style={{ ...slideRoot, gap }}>
            <div style={{ flexShrink:0, display:'flex', flexDirection:'column', gap:gapSm }}>
              {content.eyebrow && <span className="sl-anim" style={eyebrowStyle}>{content.eyebrow}</span>}
              {content.headline && <h2 className="sl-anim" style={h2Style}>{content.headline}</h2>}
            </div>
            <div style={{ flex:1, minHeight:0, display:'grid',
                          gridTemplateColumns:\`repeat(\${cols}, 1fr)\`,
                          gridTemplateRows:\`repeat(\${rows}, 1fr)\`,
                          gap:'clamp(12px,2cqw,28px)', alignItems:'stretch' }}>
              {items.map((item, i) => (
                <div key={i} className="sl-anim"
                  style={{ display:'flex', flexDirection:'column', alignItems:'center',
                           justifyContent:'center', gap:gapSm,
                           padding:'clamp(16px,2cqw,28px)',
                           borderRadius:'clamp(10px,1.2cqw,18px)',
                           border:'1px solid rgba(128,128,128,0.1)',
                           background:'rgba(128,128,128,0.03)',
                           textAlign:'center', overflow:'hidden' }}>
                  {item.icon && (
                    <div style={{ width:'clamp(44px,5cqw,76px)', height:'clamp(44px,5cqw,76px)',
                                  borderRadius:'50%',
                                  background:'color-mix(in srgb, var(--sl-accent) 12%, transparent)',
                                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <span className="material-symbols-rounded"
                        style={{ fontSize:'clamp(22px,2.8cqw,46px)', color:'var(--sl-accent)' }}>
                        {item.icon}
                      </span>
                    </div>
                  )}
                  {item.title && (
                    <h3 style={{ ...h3Style, fontSize:'clamp(16px,1.8cqw,26px)', textAlign:'center' }}>
                      {item.title}
                    </h3>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      }

      // ── PULLOUT-STAT: one hero number + context panel ─────────────────
      case "PULLOUT-STAT": {
        const stat = (content.stats || [])[0] || {};
        return (
          <div style={{ ...slideRoot, flexDirection:'row', alignItems:'center',
                        gap:'clamp(32px,5cqw,80px)' }}>
            <div style={{ flexShrink:0, display:'flex', flexDirection:'column', gap:gapSm }}>
              {content.eyebrow && <span className="sl-anim" style={eyebrowStyle}>{content.eyebrow}</span>}
              <p className="sl-anim"
                style={{ fontSize:'clamp(100px,14cqw,240px)', fontWeight:900, lineHeight:0.9,
                         color:'var(--sl-accent)', letterSpacing:'-0.04em', margin:0 }}>
                {stat.value}
              </p>
            </div>
            <div style={{ width:'3px', alignSelf:'stretch', flexShrink:0, borderRadius:'2px',
                          background:'color-mix(in srgb, var(--sl-accent) 25%, transparent)' }} />
            <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center',
                          gap:gap, overflow:'hidden' }}>
              {stat.label && (
                <h2 className="sl-anim" style={{ ...h2Style, fontSize:'clamp(28px,3.5cqw,56px)' }}>
                  {stat.label}
                </h2>
              )}
              {content.body && (
                <p className="sl-anim" style={{ ...bodyStyle, WebkitLineClamp:5 }}>{content.body}</p>
              )}
            </div>
          </div>
        );
      }

      // ── TEAM-PROFILE: avatar circle + name + bio + optional mini-stats ─
      case "TEAM-PROFILE":
        return (
          <div style={{ ...slideRoot, flexDirection:'row', alignItems:'center',
                        gap:'clamp(40px,6cqw,100px)' }}>
            <div style={{ flexShrink:0, display:'flex', flexDirection:'column',
                          alignItems:'center', gap:gap }}>
              <div style={{ width:'clamp(160px,18cqw,280px)', height:'clamp(160px,18cqw,280px)',
                            borderRadius:'50%',
                            background:'linear-gradient(135deg, color-mix(in srgb, var(--sl-accent) 20%, transparent) 0%, color-mix(in srgb, var(--sl-accent) 8%, transparent) 100%)',
                            border:'3px solid color-mix(in srgb, var(--sl-accent) 30%, transparent)',
                            display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span className="material-symbols-rounded"
                  style={{ fontSize:'clamp(72px,9cqw,140px)', color:'var(--sl-accent)', opacity:0.7 }}>
                  {content.visualPrompt || 'person'}
                </span>
              </div>
              {content.eyebrow && (
                <span className="sl-anim" style={{ ...eyebrowStyle, textAlign:'center' }}>
                  {content.eyebrow}
                </span>
              )}
            </div>
            <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center',
                          gap:gap, overflow:'hidden' }}>
              <h1 className="sl-anim" style={{ ...h1Style, fontSize:'clamp(48px,5.5cqw,100px)' }}>
                {content.headline}
              </h1>
              {content.body && (
                <p className="sl-anim" style={{ ...bodyStyle, WebkitLineClamp:5 }}>{content.body}</p>
              )}
              {(content.stats || []).length > 0 && (
                <div style={{ display:'flex', gap:'clamp(16px,3cqw,48px)', flexWrap:'wrap', marginTop:gapSm }}>
                  {(content.stats || []).slice(0, 3).map((s, i) => (
                    <div key={i} className="sl-anim"
                      style={{ borderTop:'2px solid var(--sl-accent)', paddingTop:gapSm }}>
                      <p style={{ fontSize:'clamp(22px,2.5cqw,38px)', fontWeight:900,
                                   color:'var(--sl-accent)', margin:0 }}>{s.value}</p>
                      <p style={{ fontSize:'clamp(13px,1.2cqw,17px)', color:'var(--sl-sub)',
                                   margin:0, lineHeight:1.4 }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      // ── METRICS-BAND: 4–6 compact KPI tiles in a row ─────────────────
      case "METRICS-BAND": {
        const metrics = (content.stats || []).slice(0, 6);
        return (
          <div style={{ ...slideRoot, gap }}>
            <div style={{ flexShrink:0, display:'flex', flexDirection:'column', gap:gapSm }}>
              {content.eyebrow && <span className="sl-anim" style={eyebrowStyle}>{content.eyebrow}</span>}
              {content.headline && <h2 className="sl-anim" style={h2Style}>{content.headline}</h2>}
              {content.body && (
                <p className="sl-anim" style={{ ...bodyStyle, WebkitLineClamp:2 }}>{content.body}</p>
              )}
            </div>
            <div style={{ flex:1, minHeight:0, display:'flex', alignItems:'stretch',
                          gap:'clamp(10px,1.5cqw,20px)' }}>
              {metrics.map((m, i) => (
                <div key={i} className="sl-anim"
                  style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center',
                           gap:gapSm, padding:'clamp(12px,2cqw,28px)',
                           borderRadius:'clamp(10px,1.2cqw,18px)',
                           background:'rgba(128,128,128,0.04)',
                           borderTop:'3px solid var(--sl-accent)',
                           overflow:'hidden' }}>
                  <p style={{ fontSize:'clamp(36px,4.5cqw,72px)', fontWeight:900, lineHeight:1,
                               color:'var(--sl-accent)', letterSpacing:'-0.02em', margin:0 }}>
                    {m.value}
                  </p>
                  <p style={{ fontSize:'clamp(14px,1.3cqw,18px)', color:'var(--sl-sub)',
                               margin:0, lineHeight:1.4, overflow:'hidden', display:'-webkit-box',
                               WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                    {m.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      }

      // ── DEFAULT fallback ──────────────────────────────────────────────
      default:
        return (
          <div style={{ ...slideRoot, justifyContent:'center', gap:gapSm }}>
            {content.eyebrow && <span className="sl-anim" style={eyebrowStyle}>{content.eyebrow}</span>}
            <h2 className="sl-anim" style={h2Style}>{content.headline}</h2>
            {content.body && (
              <p className="sl-anim" style={{ ...bodyStyle, maxWidth:'600px', marginTop:gapSm,
                                              WebkitLineClamp:5 }}>{content.body}</p>
            )}
          </div>
        );
    }
  };

  const slideWrapStyle = {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    background: 'var(--sl-bg)',
    color: 'var(--sl-text)',
    fontFamily: 'inherit',
    ...(archetype === 'IMMERSIVE-HERO' ? {
      background: 'linear-gradient(160deg, var(--sl-bg) 0%, color-mix(in srgb, var(--sl-accent) 14%, var(--sl-bg)) 100%)'
    } : {})
  };

  return (
    <div style={{ width:'100vw', height:'100vh', overflow:'hidden', position:'relative', containerType:'size' }}>
      <div style={slideWrapStyle}>
        {renderBackground()}
        {renderContent()}
        <div style={{ position:'absolute', bottom:'clamp(12px,1.8cqh,20px)', right:'clamp(16px,1.8cqw,28px)',
                      fontFamily:'monospace', fontSize:'clamp(12px,1cqw,14px)', color:'var(--sl-sub)', zIndex:50,
                      fontWeight:500, letterSpacing:'0.05em', pointerEvents:'none' }}>
          {current + 1} / {totalSlides}
        </div>
      </div>
    </div>
  );
}
`;
