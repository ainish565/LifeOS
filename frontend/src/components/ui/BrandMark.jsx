// Life OS logo mark: a progress "orbit" ring with a planet in its gap and a
// spark of life at the centre. Drawn in currentColor so it adapts to its badge.
export default function BrandMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.5A8.5 8.5 0 1 1 4.64 7.75"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      <circle cx="7.75" cy="4.64" r="1.7" fill="currentColor" />
      <path
        d="M12 7.6C12.45 10.35 13.65 11.55 16.4 12C13.65 12.45 12.45 13.65 12 16.4C11.55 13.65 10.35 12.45 7.6 12C10.35 11.55 11.55 10.35 12 7.6Z"
        fill="currentColor"
      />
    </svg>
  )
}
