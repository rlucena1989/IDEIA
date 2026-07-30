import * as React from 'react';

export type SkeletonVariant = 'card' | 'list' | 'chart' | 'text' | 'circle' | 'avatar';

export interface SkeletonLoaderProps {
  variant?: SkeletonVariant;
  lines?: number;
  width?: string | number;
  height?: string | number;
  count?: number;
  style?: React.CSSProperties;
  animated?: boolean;
}

const SKELETON_KEYFRAMES = `
@keyframes ideia-skeleton-pulse {
  0% { opacity: 0.6; }
  50% { opacity: 0.3; }
  100% { opacity: 0.6; }
}
@media (prefers-reduced-motion: reduce) {
  .ideia-skeleton { animation: none !important; opacity: 0.4 !important; }
}
`;

let stylesInjected = false;

function injectStyles(): void {
  if (stylesInjected) return;
  if (typeof document === 'undefined') return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = SKELETON_KEYFRAMES;
  document.head.appendChild(style);
}

function SkeletonBox({ width, height, style, animated }: {
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
  animated?: boolean;
}): React.ReactElement {
  injectStyles();
  return (
    <div
      className="ideia-skeleton"
      style={{
        background: 'var(--theia-input-background, #333)',
        borderRadius: '4px',
        animation: animated !== false ? 'ideia-skeleton-pulse 1.5s ease-in-out infinite' : 'none',
        width: width ?? '100%',
        height: height ?? '16px',
        ...style,
      }}
    />
  );
}

function CardSkeleton(): React.ReactElement {
  return (
    <div style={{ padding: '16px', border: '1px solid var(--theia-dropdown-border, #444)', borderRadius: '6px', marginBottom: '12px' }}>
      <SkeletonBox width="60%" height="18px" style={{ marginBottom: '12px' }} />
      <SkeletonBox width="100%" height="12px" style={{ marginBottom: '8px' }} />
      <SkeletonBox width="80%" height="12px" style={{ marginBottom: '8px' }} />
      <SkeletonBox width="40%" height="12px" />
    </div>
  );
}

function ListSkeleton(): React.ReactElement {
  return (
    <div style={{ padding: '8px 0' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0' }}>
          <SkeletonBox width="24px" height="24px" style={{ borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <SkeletonBox width="70%" height="14px" style={{ marginBottom: '4px' }} />
            <SkeletonBox width="40%" height="12px" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartSkeleton(): React.ReactElement {
  return (
    <div style={{ padding: '16px' }}>
      <SkeletonBox width="40%" height="16px" style={{ marginBottom: '20px' }} />
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '120px' }}>
        {[70, 45, 85, 30, 60, 50, 75].map((h, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
            <SkeletonBox width="100%" height={`${h}%`} style={{ borderRadius: '3px 3px 0 0', minHeight: '4px' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function TextSkeleton({ lines = 3 }: { lines?: number }): React.ReactElement {
  return (
    <div style={{ padding: '8px 0' }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBox
          key={i}
          width={`${70 + Math.random() * 30}%`}
          height="14px"
          style={{ marginBottom: '8px' }}
        />
      ))}
    </div>
  );
}

function CircleSkeleton(): React.ReactElement {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
      <SkeletonBox width="64px" height="64px" style={{ borderRadius: '50%' }} />
    </div>
  );
}

function AvatarSkeleton(): React.ReactElement {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0' }}>
      <SkeletonBox width="40px" height="40px" style={{ borderRadius: '50%', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <SkeletonBox width="50%" height="14px" style={{ marginBottom: '6px' }} />
        <SkeletonBox width="30%" height="12px" />
      </div>
    </div>
  );
}

export function IDEIA_SkeletonLoader({ variant = 'text', lines, height, count = 1, style, animated }: SkeletonLoaderProps): React.ReactElement {
  const variants: Record<SkeletonVariant, React.ReactElement> = {
    card: <CardSkeleton />,
    list: <ListSkeleton />,
    chart: <ChartSkeleton />,
    text: <TextSkeleton lines={lines} />,
    circle: <CircleSkeleton />,
    avatar: <AvatarSkeleton />,
  };

  const content = (
    <div style={{ minHeight: height ? (typeof height === 'number' ? height : undefined) : undefined, ...style }}>
      {count === 1 ? variants[variant] : Array.from({ length: count }).map((_, i) => (
        <div key={i}>{variants[variant]}</div>
      ))}
    </div>
  );

  if (!animated) {
    return <div style={{ opacity: 1 }}>{content}</div>;
  }

  return content;
}

export function SkeletonLoader(props: SkeletonLoaderProps): React.ReactElement {
  return <IDEIA_SkeletonLoader {...props} />;
}

export function ProgressiveLoader({ children, loading, skeletonVariant, skeletonLines, minDisplayMs = 300 }: {
  children: React.ReactNode;
  loading: boolean;
  skeletonVariant?: SkeletonVariant;
  skeletonLines?: number;
  minDisplayMs?: number;
}): React.ReactElement {
  const [showSkeleton, setShowSkeleton] = React.useState(loading);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (loading) {
      setShowSkeleton(true);
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setShowSkeleton(false), minDisplayMs);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [loading, minDisplayMs]);

  if (showSkeleton) {
    return <IDEIA_SkeletonLoader variant={skeletonVariant ?? 'text'} lines={skeletonLines} />;
  }

  return <>{children}</>;
}
