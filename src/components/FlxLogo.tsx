import React from 'react';

interface FlxLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'icon';
  showTagline?: boolean;
  className?: string;
  onClick?: () => void;
}

export const FlxLogo: React.FC<FlxLogoProps> = ({
  size = 'md',
  className = '',
  onClick,
}) => {
  const imageSource = size === 'icon'
    ? '/assets/flx-logo-round.jpeg'
    : '/assets/flx-logo-wordmark.png';
  const imageSize = size === 'sm'
    ? 'h-8 w-auto sm:h-10'
    : size === 'lg'
      ? 'h-20 w-auto sm:h-24'
      : size === 'icon'
        ? 'h-8 w-8'
        : 'h-11 w-auto sm:h-14';

  return (
    <div
      onClick={onClick}
      className={`inline-flex min-w-0 items-center select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <img
        src={imageSource}
        alt="FLX Real Estate"
        className={`${imageSize} object-contain`}
      />
    </div>
  );
};
