import { useRef, useEffect, useCallback, useState } from 'react';
import { Transformer } from 'markmap-lib';
import { Markmap } from 'markmap-view';
import { Toolbar } from 'markmap-toolbar';
import 'markmap-toolbar/dist/style.css';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTheme } from 'next-themes';

const transformer = new Transformer();

interface MarkmapRendererProps {
  markdown: string;
  className?: string;
}

export function MarkmapRenderer({ markdown, className = '' }: MarkmapRendererProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const mmRef = useRef<Markmap | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const isMobile = useIsMobile();
  const { resolvedTheme } = useTheme();

  // Strip markmap frontmatter before transforming
  const cleanMarkdown = useCallback(() => {
    let md = markdown;
    if (md.startsWith('---')) {
      const end = md.indexOf('---', 3);
      if (end !== -1) {
        md = md.slice(end + 3).trim();
      }
    }
    return md;
  }, [markdown]);

  // Initialize and update markmap
  useEffect(() => {
    if (!svgRef.current) return;

    const md = cleanMarkdown();
    const { root } = transformer.transform(md);

    if (!mmRef.current) {
      mmRef.current = Markmap.create(svgRef.current, {
        autoFit: true,
        duration: 300,
        initialExpandLevel: 2,
        paddingX: isMobile ? 8 : 16,
      });
      setReady(true);
    }

    mmRef.current.setData(root);
    setTimeout(() => mmRef.current?.fit(), 150);
  }, [cleanMarkdown, isMobile]);

  // Attach toolbar
  useEffect(() => {
    if (!ready || !mmRef.current || !toolbarRef.current) return;
    toolbarRef.current.innerHTML = '';
    const toolbar = Toolbar.create(mmRef.current);
    toolbarRef.current.appendChild(toolbar.el);
  }, [ready]);

  // Sync markmap dark mode with app theme
  useEffect(() => {
    if (!svgRef.current || !ready) return;
    // resolvedTheme can be undefined during hydration; also check DOM
    const isDark = resolvedTheme === 'dark' || 
      document.documentElement.classList.contains('dark');
    if (isDark) {
      svgRef.current.classList.add('markmap-dark');
    } else {
      svgRef.current.classList.remove('markmap-dark');
    }
  }, [resolvedTheme, ready]);

  // Also apply on mount after a short delay to handle hydration timing
  useEffect(() => {
    if (!svgRef.current || !ready) return;
    const timer = setTimeout(() => {
      const isDark = document.documentElement.classList.contains('dark');
      if (isDark && svgRef.current) {
        svgRef.current.classList.add('markmap-dark');
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [ready]);

  // Refit on container resize (handles fullscreen toggle, window resize, orientation change)
  useEffect(() => {
    if (!containerRef.current || !mmRef.current) return;

    const observer = new ResizeObserver(() => {
      setTimeout(() => mmRef.current?.fit(), 50);
    });
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [ready]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mmRef.current) {
        mmRef.current.destroy();
        mmRef.current = null;
      }
    };
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className}`}>
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ minHeight: isMobile ? '50vh' : '60vh', touchAction: 'pan-x pan-y' }}
      />
      <div
        ref={toolbarRef}
        className={`absolute z-10 ${isMobile ? 'bottom-2 right-2' : 'bottom-3 right-3'}`}
        style={{ fontSize: isMobile ? '12px' : '14px' }}
      />
    </div>
  );
}
