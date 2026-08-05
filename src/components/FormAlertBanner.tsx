import React from 'react';

type FormAlertBannerProps = {
  message: string;
  className?: string;
};

/** Inline alert banner for form validation errors (replaces window.alert). */
export const FormAlertBanner: React.FC<FormAlertBannerProps> = ({
  message,
  className = '',
}) => {
  if (!message.trim()) return null;

  return (
    <div
      role="alert"
      className={`rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 whitespace-pre-line ${className}`}
    >
      {message}
    </div>
  );
};
