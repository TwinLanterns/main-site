type Kind = "clover" | "hex" | "scallop" | "arch" | "squircle" | "burst";

const CLOVER =
  "M100 8c28 0 48 20 48 44 24 0 44 20 44 48s-20 48-44 48c0 24-20 44-48 44s-48-20-48-44C28 148 8 128 8 100s20-48 44-48c0-24 20-44 48-44Z";

const HEX = "M100 6 174 48v104l-74 42-74-42V48L100 6Z";

const ARCH = "M14 194V96a86 86 0 0 1 172 0v98H14Z";

const SQUIRCLE = "M100 6c62 0 94 32 94 94s-32 94-94 94S6 162 6 100 38 6 100 6Z";

/** Petal/notch rings are generated so the geometry stays exact at any count. */
function ring(points: number, rOuter: number, rInner: number, sharp: boolean) {
  const step = (Math.PI * 2) / points;
  let d = "";
  for (let i = 0; i < points; i++) {
    const a = i * step - Math.PI / 2;
    const b = a + step / 2;
    const ox = 100 + Math.cos(a) * rOuter;
    const oy = 100 + Math.sin(a) * rOuter;
    const ix = 100 + Math.cos(b) * rInner;
    const iy = 100 + Math.sin(b) * rInner;
    if (i === 0) d += `M${ox.toFixed(1)} ${oy.toFixed(1)}`;
    if (sharp) {
      d += `L${ix.toFixed(1)} ${iy.toFixed(1)}`;
    } else {
      const cx = 100 + Math.cos(b) * rOuter * 1.02;
      const cy = 100 + Math.sin(b) * rOuter * 1.02;
      d += `Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ix.toFixed(1)} ${iy.toFixed(1)}`;
    }
    const na = (i + 1) * step - Math.PI / 2;
    const nx = 100 + Math.cos(na) * rOuter;
    const ny = 100 + Math.sin(na) * rOuter;
    if (sharp) {
      d += `L${nx.toFixed(1)} ${ny.toFixed(1)}`;
    } else {
      const c2x = 100 + Math.cos(b) * rOuter * 1.02;
      const c2y = 100 + Math.sin(b) * rOuter * 1.02;
      d += `Q${c2x.toFixed(1)} ${c2y.toFixed(1)} ${nx.toFixed(1)} ${ny.toFixed(1)}`;
    }
  }
  return d + "Z";
}

export const shapePaths: Record<Kind, string> = {
  clover: CLOVER,
  hex: HEX,
  arch: ARCH,
  squircle: SQUIRCLE,
  scallop: ring(14, 94, 78, false),
  burst: ring(12, 96, 62, true),
};

export default function Shape({
  kind,
  className = "",
  rotate = 0,
  float = false,
  delay = 0,
}: {
  kind: Kind;
  className?: string;
  rotate?: number;
  float?: boolean;
  delay?: number;
}) {
  return (
    <svg
      viewBox="0 0 200 200"
      aria-hidden="true"
      className={`${float ? "float" : ""} ${className}`}
      style={
        {
          "--r": `${rotate}deg`,
          transform: `rotate(${rotate}deg)`,
          animationDelay: `${delay}s`,
        } as React.CSSProperties
      }
    >
      {/* drawn as a hairline, like the line art on the homepage */}
      <path
        d={shapePaths[kind]}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.2}
        vectorEffect="non-scaling-stroke"
        opacity={0.55}
      />
    </svg>
  );
}
