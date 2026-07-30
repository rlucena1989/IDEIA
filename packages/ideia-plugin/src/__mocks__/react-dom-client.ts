export type Root = { render: () => void; unmount: () => void };
export function createRoot(): Root {
  return { render: () => {}, unmount: () => {} };
}
