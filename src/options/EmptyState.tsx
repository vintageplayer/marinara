import React from 'react';

interface EmptyStateProps {
  message: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ message }) => {
  return (
    <div className="bg-gray-100 rounded-lg py-16 text-center">
      <p className="text-gray-600">{message}</p>
    </div>
  );
};

export default EmptyState; 