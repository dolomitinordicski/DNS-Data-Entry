import type { SVGProps } from 'react';

export type WireIconName =
  | 'season'
  | 'pricing'
  | 'orders'
  | 'sales'
  | 'kp'
  | 'verification'
  | 'print'
  | 'share';

interface Props extends SVGProps<SVGSVGElement> {
  name: WireIconName;
  size?: number;
}

export function WireIcon({
  name,
  size = 20,
  ...props
}: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  const paths = {
    season: (
      <>
        <rect x="4" y="5.5" width="16" height="14" rx="1.5" />
        <path d="M8 3.5v4M16 3.5v4M4 9.5h16" />
        <path d="M8 13h3M8 16h6" />
      </>
    ),
    pricing: (
      <>
        <path d="M5 7.5h10.5l3.5 3.5-8 8-6-6z" />
        <circle cx="9" cy="11" r="1.1" />
        <path d="M14 5h5v5" />
      </>
    ),
    orders: (
      <>
        <path d="M7 4.5h10l2 3v12H5v-12z" />
        <path d="M5 8h14M9 12h6M9 15h4" />
      </>
    ),
    sales: (
      <>
        <path d="M4 18.5h16" />
        <path d="M6.5 16v-4M11.5 16V8M16.5 16V5" />
        <path d="M6 8.5l5-3 5 1.5 3-3" />
      </>
    ),
    kp: (
      <>
        <path d="M3.5 17.5l5-7 3 3 4.5-7 4.5 11" />
        <path d="M5 19.5h14" />
        <path d="M7 7.5c1-2 3-3 5-3" />
      </>
    ),
    verification: (
      <>
        <path d="M12 3.5l7 3v5.5c0 4.2-2.8 7.1-7 8.5-4.2-1.4-7-4.3-7-8.5V6.5z" />
        <path d="M8.5 12l2.2 2.2 4.8-5" />
      </>
    ),
    print: (
      <>
        <path d="M7 8V4.5h10V8" />
        <rect x="5" y="12" width="14" height="7.5" rx="1" />
        <path d="M5 15H3.5v-5h17v5H19M8 16h8" />
      </>
    ),
    share: (
      <>
        <circle cx="6" cy="12" r="2" />
        <circle cx="17.5" cy="6" r="2" />
        <circle cx="17.5" cy="18" r="2" />
        <path d="M7.8 11l7.8-4M7.8 13l7.8 4" />
      </>
    ),
  } as const;

  return (
    <svg {...common} {...props}>
      {paths[name]}
    </svg>
  );
}
