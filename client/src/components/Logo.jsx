/**
 * App Town — professional SVG logo mark + wordmark
 * Uses a clean grid/app-icon motif to represent a digital marketplace.
 */
export default function Logo({ size = 28, showText = true, textClass = 'text-white' }) {
  return (
    <span className="flex items-center gap-2 select-none">
      {/* Icon mark: 2×2 rounded grid representing "apps" */}
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="8" fill="#3781EE" />
        {/* Top-left app tile */}
        <rect x="6" y="6" width="8" height="8" rx="2" fill="white" fillOpacity="0.95" />
        {/* Top-right app tile */}
        <rect x="18" y="6" width="8" height="8" rx="2" fill="white" fillOpacity="0.6" />
        {/* Bottom-left app tile */}
        <rect x="6" y="18" width="8" height="8" rx="2" fill="white" fillOpacity="0.6" />
        {/* Bottom-right app tile — accent */}
        <rect x="18" y="18" width="8" height="8" rx="2" fill="white" fillOpacity="0.95" />
      </svg>

      {showText && (
        <span className={`font-bold tracking-tight leading-none ${textClass}`} style={{ fontSize: size * 0.6 }}>
          App Town
        </span>
      )}
    </span>
  );
}
