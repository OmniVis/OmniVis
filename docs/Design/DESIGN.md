\---

name: OmniVis Design System

colors:

&#x20; surface: '#f8f9ff'

&#x20; surface-dim: '#cbdbf5'

&#x20; surface-bright: '#f8f9ff'

&#x20; surface-container-lowest: '#ffffff'

&#x20; surface-container-low: '#eff4ff'

&#x20; surface-container: '#e5eeff'

&#x20; surface-container-high: '#dce9ff'

&#x20; surface-container-highest: '#d3e4fe'

&#x20; on-surface: '#0b1c30'

&#x20; on-surface-variant: '#424656'

&#x20; inverse-surface: '#213145'

&#x20; inverse-on-surface: '#eaf1ff'

&#x20; outline: '#727687'

&#x20; outline-variant: '#c2c6d8'

&#x20; surface-tint: '#0054d6'

&#x20; primary: '#0050cb'

&#x20; on-primary: '#ffffff'

&#x20; primary-container: '#0066ff'

&#x20; on-primary-container: '#f8f7ff'

&#x20; inverse-primary: '#b3c5ff'

&#x20; secondary: '#5e5e5e'

&#x20; on-secondary: '#ffffff'

&#x20; secondary-container: '#e2e2e2'

&#x20; on-secondary-container: '#646464'

&#x20; tertiary: '#565a5b'

&#x20; on-tertiary: '#ffffff'

&#x20; tertiary-container: '#6f7274'

&#x20; on-tertiary-container: '#f6f8fa'

&#x20; error: '#ba1a1a'

&#x20; on-error: '#ffffff'

&#x20; error-container: '#ffdad6'

&#x20; on-error-container: '#93000a'

&#x20; primary-fixed: '#dae1ff'

&#x20; primary-fixed-dim: '#b3c5ff'

&#x20; on-primary-fixed: '#001849'

&#x20; on-primary-fixed-variant: '#003fa4'

&#x20; secondary-fixed: '#e2e2e2'

&#x20; secondary-fixed-dim: '#c6c6c6'

&#x20; on-secondary-fixed: '#1b1b1b'

&#x20; on-secondary-fixed-variant: '#474747'

&#x20; tertiary-fixed: '#e0e3e5'

&#x20; tertiary-fixed-dim: '#c4c7c9'

&#x20; on-tertiary-fixed: '#191c1e'

&#x20; on-tertiary-fixed-variant: '#444749'

&#x20; background: '#f8f9ff'

&#x20; on-background: '#0b1c30'

&#x20; surface-variant: '#d3e4fe'

typography:

&#x20; display:

&#x20;   fontFamily: Hanken Grotesk

&#x20;   fontSize: 48px

&#x20;   fontWeight: '800'

&#x20;   lineHeight: 56px

&#x20;   letterSpacing: -0.02em

&#x20; headline-lg:

&#x20;   fontFamily: Hanken Grotesk

&#x20;   fontSize: 32px

&#x20;   fontWeight: '700'

&#x20;   lineHeight: 40px

&#x20;   letterSpacing: -0.01em

&#x20; headline-lg-mobile:

&#x20;   fontFamily: Hanken Grotesk

&#x20;   fontSize: 24px

&#x20;   fontWeight: '700'

&#x20;   lineHeight: 32px

&#x20; headline-md:

&#x20;   fontFamily: Hanken Grotesk

&#x20;   fontSize: 24px

&#x20;   fontWeight: '600'

&#x20;   lineHeight: 32px

&#x20; body-lg:

&#x20;   fontFamily: Inter

&#x20;   fontSize: 18px

&#x20;   fontWeight: '400'

&#x20;   lineHeight: 28px

&#x20; body-md:

&#x20;   fontFamily: Inter

&#x20;   fontSize: 16px

&#x20;   fontWeight: '400'

&#x20;   lineHeight: 24px

&#x20; label-sm:

&#x20;   fontFamily: JetBrains Mono

&#x20;   fontSize: 12px

&#x20;   fontWeight: '500'

&#x20;   lineHeight: 16px

&#x20;   letterSpacing: 0.05em

&#x20; button:

&#x20;   fontFamily: Inter

&#x20;   fontSize: 14px

&#x20;   fontWeight: '600'

&#x20;   lineHeight: 20px

rounded:

&#x20; sm: 0.125rem

&#x20; DEFAULT: 0.25rem

&#x20; md: 0.375rem

&#x20; lg: 0.5rem

&#x20; xl: 0.75rem

&#x20; full: 9999px

spacing:

&#x20; unit: 4px

&#x20; gutter-sm: 16px

&#x20; gutter-md: 24px

&#x20; margin-mobile: 16px

&#x20; margin-desktop: 40px

&#x20; max-width: 1440px

\---



\## Brand \& Style



The brand serves as a high-performance command center for visual creators and project managers. It is designed to feel authoritative, tech-forward, and surgically precise. The identity is rooted in the "Omni" philosophy—a singular, all-encompassing hub that manages complexity with effortless clarity.



The visual style is \*\*High-Contrast Minimalism\*\*. It utilizes a stark, "ink-trap" aesthetic inspired by modern engineering. By leveraging deep blacks and a singular, vibrant electric blue, the UI directs focus with extreme intent. The interface avoids unnecessary decorative elements, relying instead on structural integrity, generous negative space, and rigid grid alignment to convey a sense of professional reliability and innovation.



\*\*Emotional Response:\*\* Empowered, focused, sophisticated, and technologically advanced.



\## Colors



The palette is anchored by the high-energy contrast between "Electric Blue" and "Absolute Black." This combination ensures that the interface remains readable while feeling distinctly digital and modern.



\- \*\*Primary (Electric Blue):\*\* Used exclusively for action-oriented elements, active states, and critical information markers. 

\- \*\*Secondary (Absolute Black):\*\* Defines the structural skeleton, primary typography, and iconography.

\- \*\*Tertiary (Cloud Grey):\*\* A soft off-white used for background layering to reduce eye strain in complex workflows.

\- \*\*Neutral:\*\* A range of slate greys used for secondary metadata, borders, and disabled states.



The design system defaults to a \*\*light mode\*\* with a heavy emphasis on pure white workspaces to keep the focus on the visual projects themselves, though the tokens are built to support a high-contrast dark mode inversion.



\## Typography



Typography is treated as a functional tool. We use a tri-font system to delineate hierarchy and intent:



1\.  \*\*Hanken Grotesk (Headlines):\*\* A sharp, contemporary sans-serif used for impact. It reflects the tech-forward nature of the brand.

2\.  \*\*Inter (Body):\*\* The workhorse for the UI. Highly legible at small sizes with a neutral tone that doesn't distract from content.

3\.  \*\*JetBrains Mono (Labels/Metadata):\*\* Used for technical data, status labels, and timestamps. The monospaced nature reinforces the "hub" and "tooling" aspect of the platform.



All display and headline styles should use tighter letter-spacing to maintain a dense, professional feel. Labels should use increased tracking for legibility at micro-sizes.



\## Layout \& Spacing



This design system employs a \*\*Fluid-Fixed Hybrid Grid\*\*. 

\- \*\*Desktop (1240px+):\*\* A 12-column grid with a fixed 24px gutter. Content is centered with wide margins to create a premium, editorial feel.

\- \*\*Tablet (768px - 1239px):\*\* 8-column grid with 16px gutters. Sidebars may collapse into icons to prioritize canvas space.

\- \*\*Mobile (< 767px):\*\* 4-column grid with 16px margins. Stacked layouts are mandatory.



Spacing follows a strict 4px baseline rhythm. Padding and margins should always be multiples of 4 (e.g., 8, 16, 24, 32, 64). Elements are grouped using "proximity clusters" where related items share tighter spacing (8-12px) and sections are separated by large gaps (48px+) to maintain minimalism.



\## Elevation \& Depth



To maintain the minimalist aesthetic, depth is primarily communicated through \*\*Tonal Layers\*\* and \*\*Low-Contrast Outlines\*\* rather than heavy shadows.



\- \*\*Surface Levels:\*\* The base background is Cloud Grey (#F5F7F9). Primary cards and containers use Pure White (#FFFFFF).

\- \*\*Outlines:\*\* Instead of shadows, use 1px solid borders in a very light neutral (#E2E8F0) to define containers.

\- \*\*Active State Elevation:\*\* Only "floating" elements like dropdowns or modals receive a shadow. Use a "Zero-Gravity Shadow": a very soft, diffused blur (12px blur, 0px offset) with a low-opacity navy tint (#000000 with 5% opacity).

\- \*\*Interactive Depth:\*\* Buttons do not "lift" on hover; instead, they change fill color or stroke weight, maintaining a flat, architectural feel.



\## Shapes



The shape language is \*\*Soft-Geometric\*\*. We avoid the extreme "bubbliness" of consumer apps in favor of a precision-engineered look.



\- \*\*Standard Elements:\*\* Buttons, input fields, and small cards use a 4px (0.25rem) radius.

\- \*\*Container Elements:\*\* Large project cards or dashboard panels use an 8px (0.5rem) radius.

\- \*\*Icons:\*\* Must be linear, using 2px stroke weights with squared-off ends to match the typographic terminals of Hanken Grotesk.



The goal is to maintain the "solid" feel of the logo—blocks of color with just enough rounding to feel modern and accessible without losing their structural "weight."



\## Components



\- \*\*Buttons:\*\* 

&#x20;   - \*Primary:\* Solid Black background with White text. High contrast, immediate visibility.

&#x20;   - \*Secondary:\* Outline (1px Black) with Black text. 

&#x20;   - \*Ghost:\* Electric Blue text, no background. Used for low-priority actions.

\- \*\*Input Fields:\*\* Use 1px Absolute Black borders when focused. Labels must use JetBrains Mono in small caps above the field.

\- \*\*Status Chips:\*\* Small, pill-shaped labels using the Label font. Status is indicated by a 6px solid circle (Electric Blue for active, Neutral for idle).

\- \*\*Cards:\*\* White background, 1px Light Grey border, no shadow. Project thumbnails within cards should have a 4px inner radius.

\- \*\*Project Sidebar:\*\* A dark-themed sidebar (Solid Black background) with Electric Blue active indicators. This creates a "frame" for the visual content, making the workspace feel like a professional tool.

\- \*\*Lists:\*\* High-density rows with thin separators. Hover states should use a subtle Cloud Grey background tint.

