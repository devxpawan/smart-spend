import React from 'react';
import { validatePassword, getPasswordStrengthColor, getPasswordStrengthBgColor } from '../utils/passwordValidation';
import { CheckCircle, XCircle } from 'lucide-react';

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
    <div className="mt-2 space-y-2">
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-600">Password Strength</span>
          <span className={`text-xs font-medium capitalize ${getPasswordStrengthColor(validation.strength)}`}>
            {validation.strength}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthBgColor(validation.strength)}`}
            style={{ width: strengthWidth }}
          />
        </div>
      </div>

      {/* Requirements List */}
      {showRequirements && (
        <div className="space-y-1">
          <span className="text-xs text-gray-600">Requirements:</span>
          {requirements.map((req, index) => (
            <div key={index} className="flex items-center space-x-2">
              {req.test ? (
                <CheckCircle className="w-3 h-3 text-green-500" />
              ) : (
                <XCircle className="w-3 h-3 text-red-500" />
              )}
              <span className={`text-xs ${req.test ? 'text-green-600' : 'text-red-600'}`}>
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
