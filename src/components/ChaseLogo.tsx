// Chase logo SVG component — recreated for demo purposes
const ChaseLogo = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="0 0 220 60"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Chase"
  >
    {/* CHASE wordmark */}
    <text
      x="0"
      y="48"
      fontFamily="'Arial Black', 'Arial Bold', Arial, sans-serif"
      fontWeight="900"
      fontSize="52"
      fill="currentColor"
      letterSpacing="-1"
    >
      CHASE
    </text>

    {/* Chase octagon icon */}
    <g transform="translate(158, 4)">
      {/* Outer octagon */}
      <polygon
        points="17,0 37,0 54,17 54,37 37,54 17,54 0,37 0,17"
        fill="#117ACA"
      />
      {/* Inner white cross dividers */}
      {/* Top-left quadrant */}
      <polygon points="17,0 27,0 27,27 0,27 0,17" fill="#117ACA" />
      <polygon points="27,0 37,0 37,17 54,17 54,27 27,27" fill="white" />
      <polygon points="27,27 54,27 54,37 37,37 37,54 27,54" fill="#117ACA" />
      <polygon points="0,27 27,27 27,54 17,54 0,37" fill="white" />
      {/* Center white cross */}
      <rect x="24" y="0" width="6" height="54" fill="white" opacity="0" />
      <rect x="0" y="24" width="54" height="6" fill="white" opacity="0" />
    </g>
  </svg>
);

export default ChaseLogo;
