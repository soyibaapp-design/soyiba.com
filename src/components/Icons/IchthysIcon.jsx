export default function IchthysIcon({
  size = 24,
  color = 'currentColor',
  active = false,
  strokeWidth = 2,
  className = '',
  title,
}) {
  const opacity = active ? 1 : 0.62;
  const baseStrokeWidth = strokeWidth + 0.8;
  const effectiveStrokeWidth = active ? baseStrokeWidth + 0.45 : baseStrokeWidth;
  const iconWidth = Math.round(size * 1.32);
  const iconHeight = Math.round(size * 0.92);

  return (
    <svg
      width={iconWidth}
      height={iconHeight}
      viewBox="0 0 64 36"
      fill="none"
      color={active ? '#1438dc' : color}
      className={`transition-all duration-300 ${active ? 'scale-110 drop-shadow-sm' : 'scale-100'} ${className}`}
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M3 18C18 2.5 37.5 2.5 51 18C54.6 22.1 59.1 28 62 32"
        stroke="currentColor"
        strokeWidth={effectiveStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={opacity}
      />
      <path
        d="M3 18C18 33.5 37.5 33.5 51 18C54.6 13.9 59.1 8 62 4"
        stroke="currentColor"
        strokeWidth={effectiveStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={opacity}
      />
    </svg>
  );
}
