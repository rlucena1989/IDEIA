declare module 'react-window' {
  import * as React from 'react';

  export interface FixedSizeListProps {
    height: number;
    itemCount: number;
    itemSize: number;
    width: string | number;
    overscanCount?: number;
    onItemsRendered?: (props: { visibleStopIndex: number }) => void;
    children: (props: { index: number; style: React.CSSProperties }) => React.ReactElement;
  }

  export const FixedSizeList: React.ComponentType<FixedSizeListProps>;
}
