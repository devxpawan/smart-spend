import React from 'react';
import { validatePassword, getPasswordStrengthBgColor } from '../utils/passwordValidation';

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
}

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ 
  password, 
  showRequirements = true 
}) => {
  const validation = validatePassword(password);

  if (!password) return null;

  const requirements = [
    { text: 'At least 8 characters', test: password.length >= 8 },
    { text: 'One lowercase letter', test: /[a-z]/.test(password) },
    { text: 'One uppercase letter', test: /[A-Z]/.test(password) },
    { text: 'One number', test: /\d/.test(password) },
    { text: 'One special character (@$!%*?&)', test: /[@$!%*?&]/.test(password) },
  ];

  const strengthWidth = validation.strength === 'weak' ? '33%' : 
                       validation.strength === 'medium' ? '66%' : '100%';

  return (
    <div className="mt-2 space-y-1">
      {/* Strength Bar */}
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div 
          className={`h-1.5 rounded-full transition-all duration-300 ${getPasswordStrengthBgColor(validation.strength)}`}
          style={{ width: strengthWidth }}
        />
      </div>

      {/* Requirements List */}
      {showRequirements && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
          {requirements.map((req, index) => (
            <div key={index} className="flex items-center">
              <div className={`w-1.5 h-1.5 rounded-full mr-2 ${req.test ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span className={`text-xs ${req.test ? 'text-gray-600' : 'text-gray-500'}`}>
                {req.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthIndicator;
