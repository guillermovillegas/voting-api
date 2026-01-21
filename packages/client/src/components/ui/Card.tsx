/**
 * Card Component
 *
 * Card component for displaying teams and content blocks.
 * OWNERSHIP: AGENT_UI
 */

import React, { type HTMLAttributes, forwardRef } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  align?: 'left' | 'center' | 'right' | 'between';
}

const variantStyles: Record<string, string> = {
  default: 'bg-white border border-gray-200',
  outlined: 'bg-transparent border-2 border-gray-300',
  elevated: 'bg-white shadow-lg',
};

const paddingStyles: Record<string, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const footerAlignStyles: Record<string, string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
  between: 'justify-between',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      hoverable = false,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'rounded-lg overflow-hidden';
    const hoverStyles = hoverable
      ? 'transition-shadow hover:shadow-md cursor-pointer'
      : '';

    const combinedClassName = [
      baseStyles,
      variantStyles[variant],
      paddingStyles[padding],
      hoverStyles,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={combinedClassName} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ title, subtitle, action, className = '', children, ...props }, ref) => {
    const baseStyles = 'flex items-start justify-between pb-3 border-b border-gray-100';

    return (
      <div ref={ref} className={`${baseStyles} ${className}`} {...props}>
        {children ?? (
          <>
            <div>
              {title && (
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              )}
              {subtitle && (
                <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
              )}
            </div>
            {action && <div className="ml-4 flex-shrink-0">{action}</div>}
          </>
        )}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

export const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={`py-4 ${className}`} {...props}>
        {children}
      </div>
    );
  }
);

CardBody.displayName = 'CardBody';

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ align = 'right', className = '', children, ...props }, ref) => {
    const baseStyles = 'flex items-center pt-3 border-t border-gray-100';

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${footerAlignStyles[align]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

// Team-specific card variant
export interface TeamCardProps {
  teamName: string;
  description?: string;
  memberCount?: number;
  score?: number;
  onVote?: () => void;
  isVotingDisabled?: boolean;
}

export function TeamCard({
  teamName,
  description,
  memberCount,
  score,
  onVote,
  isVotingDisabled = false,
}: TeamCardProps) {
  return (
    <Card variant="default" hoverable={!isVotingDisabled} padding="none">
      <div className="p-4">
        <CardHeader title={teamName} subtitle={description} />
        <CardBody>
          <div className="flex items-center justify-between text-sm text-gray-600">
            {memberCount !== undefined && (
              <span>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
            )}
            {score !== undefined && (
              <span className="font-semibold text-blue-600">{score} points</span>
            )}
          </div>
        </CardBody>
        {onVote && (
          <CardFooter align="right">
            <button
              onClick={onVote}
              disabled={isVotingDisabled}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Vote
            </button>
          </CardFooter>
        )}
      </div>
    </Card>
  );
}

export default Card;
