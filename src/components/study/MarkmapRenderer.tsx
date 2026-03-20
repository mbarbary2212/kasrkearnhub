import { useRef, useEffect, useCallback, useState } from 'react';
import { Transformer } from 'markmap-lib';
import { Markmap } from 'markmap-view';
import { Toolbar } from 'markmap-toolbar';
import 'markmap-toolbar/dist/style.css';
import { useIsMobile } from '@/hooks/use-mobile';

const transformer = new Transformer();

interface MarkmapRendererProps {
  markdown: string;
  className?: string;
}

export function MarkmapRenderer({ markdown, className = '' }: MarkmapRendererProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const mmRef = useRef<Markmap | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const isMobile = useIsMobile();

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

  useEffect(() => {
    if (!svgRef.current) return;

    const md = cleanMarkdown();
    const { root } = transformer.transform(md);

    // Create or update markmap
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
    // Fit after data is set
    setTimeout(() => mmRef.current?.fit(), 100);

    return () => {
      // Don't destroy on re-renders, only on unmount
    };
  }, [cleanMarkdown, isMobile]);

  // Attach toolbar
  useEffect(() => {
    if (!ready || !mmRef.current || !toolbarRef.current) return;

    // Clear previous toolbar content
    toolbarRef.current.innerHTML = '';

    const toolbar = Toolbar.create(mmRef.current);
    toolbarRef.current.appendChild(toolbar.el);
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
    <div className={`relative w-full h-full ${className}`}>
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ minHeight: isMobile ? '50vh' : '60vh' }}
      />
      <div
        ref={toolbarRef}
        className="absolute bottom-3 right-3 z-10"
        style={{ fontSize: '14px' }}
      />
    </div>
  );
}
