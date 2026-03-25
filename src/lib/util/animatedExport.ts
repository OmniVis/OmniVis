// Animated Export — SVG build-up animations
// Injects staggered CSS animations into the rendered SVG

/**
 * Creates an animated SVG from the current diagram.
 * Elements appear one-by-one with a fade+slide animation.
 */
export function createAnimatedSVG(svgElement: SVGElement): string {
  const svg = svgElement.cloneNode(true) as SVGElement;

  // Find all animatable elements
  const nodes = svg.querySelectorAll('.node, .cluster, .label, .edgePath, .edgeLabel');
  const totalElements = nodes.length;

  if (totalElements === 0) {
    return svg.outerHTML;
  }

  // Calculate stagger delay
  const baseDelay = 0.15; // seconds between each element
  const animDuration = 0.6; // seconds for each animation

  // Inject animation styles
  const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  styleElement.textContent = `
    @keyframes graphi-fade-in {
      0% {
        opacity: 0;
        transform: translateY(10px) scale(0.95);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes graphi-draw-edge {
      0% {
        stroke-dashoffset: 1000;
        opacity: 0;
      }
      10% {
        opacity: 1;
      }
      100% {
        stroke-dashoffset: 0;
        opacity: 1;
      }
    }

    .graphi-animate {
      opacity: 0;
      animation: graphi-fade-in ${animDuration}s ease-out forwards;
    }

    .graphi-animate-edge {
      opacity: 0;
      stroke-dasharray: 1000;
      stroke-dashoffset: 1000;
      animation: graphi-draw-edge ${animDuration * 1.5}s ease-out forwards;
    }
  `;
  svg.insertBefore(styleElement, svg.firstChild);

  // Apply animations with stagger
  let index = 0;
  nodes.forEach((node) => {
    const el = node as SVGElement;
    const isEdge = el.classList.contains('edgePath');
    const className = isEdge ? 'graphi-animate-edge' : 'graphi-animate';
    el.classList.add(className);
    el.style.animationDelay = `${index * baseDelay}s`;
    index++;
  });

  // Set SVG attributes for proper rendering
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  return svg.outerHTML;
}

/**
 * Downloads an animated SVG as a file.
 */
export function downloadAnimatedSVG(
  svgElement: SVGElement,
  filename = 'graphi-animated.svg'
): void {
  const animatedSvg = createAnimatedSVG(svgElement);
  const blob = new Blob([animatedSvg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Calculates the total animation duration for the diagram.
 */
export function getAnimationDuration(svgElement: SVGElement): number {
  const nodes = svgElement.querySelectorAll('.node, .cluster, .label, .edgePath, .edgeLabel');
  const baseDelay = 0.15;
  const animDuration = 0.6;
  return nodes.length * baseDelay + animDuration;
}
