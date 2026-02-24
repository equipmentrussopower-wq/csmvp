const ChaseLogo = ({ className = "", style = {} }: { className?: string, style?: React.CSSProperties }) => {
  // Determine if we should apply a filter to change PNG color
  let filter = style.filter;
  
  if (!filter) {
    if (className.includes('text-white') || style.color === 'white' || style.color === '#fff' || style.color === '#ffffff') {
      filter = 'brightness(0) invert(1)';
    } else if (className.includes('text-black') || className.includes('text-gray-900')) {
      filter = 'brightness(0)';
    }
  }

  return (
    <img
      src="/chase.png"
      alt="Chase"
      className={className}
      style={{ 
        display: 'block', 
        height: 'auto', 
        filter,
        ...style 
      }}
    />
  );
};

export default ChaseLogo;
