import React, { useMemo } from "react";
import {
  validatePassword,
  getPasswordStrengthBgColor,
} from "../utils/passwordValidation";

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean; // default false (compact)
  showStrengthLabel?: boolean; // default false
  isFocused?: boolean; // pass from your input focus state
  revealOnFocus?: boolean; // default true
  onlyUnmet?: boolean; // default true (show unmet only)
  maxUnmet?: number; // default 2 (top 2 unmet)
  hideWhenStrong?: boolean; // default true
}

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  showRequirements = false,
  showStrengthLabel = false,
  isFocused,
  revealOnFocus = true,
  onlyUnmet = true,
  maxUnmet = 2,
  hideWhenStrong = true,
}) => {
  const validation = useMemo(() => validatePassword(password), [password]);

  const requirements = useMemo(
    () => [
      { text: "At least 8 characters", test: password.length >= 8 },
      { text: "One lowercase letter", test: /[a-z]/.test(password) },
      { text: "One uppercase letter", test: /[A-Z]/.test(password) },
      { text: "One number", test: /\d/.test(password) },
      {
        text: "One special character (@$!%*?&)",
        test: /[@$!%*?&]/.test(password),
      },
    ],
    [password]
  );

  const passed = useMemo(
    () => requirements.filter((r) => r.test).length,
    [requirements]
  );
  const total = requirements.length;

  // Smooth progress based on how many checks passed
  const progressPct = useMemo(
    () => Math.round((passed / total) * 100),
    [passed, total]
  );
  
  if (!password) return null;
  const barColorClass = getPasswordStrengthBgColor(validation.strength);
  const strengthLabel =
    validation.strength.charAt(0).toUpperCase() + validation.strength.slice(1);

  // Decide when to show details
  const wantsDetails =
    Boolean(showRequirements) || (revealOnFocus && !!isFocused);
  const shouldShowDetails =
    wantsDetails && !(hideWhenStrong && validation.strength === "strong");

  const listSource = onlyUnmet
    ? requirements.filter((r) => !r.test)
    : requirements;
  const list =
    typeof maxUnmet === "number" ? listSource.slice(0, maxUnmet) : listSource;

  const showLabel = showStrengthLabel || shouldShowDetails;

  return (
    <div className="mt-2 space-y-2" aria-live="polite">
      {showLabel && (
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>Strength: {strengthLabel}</span>
          <span>
            {passed}/{total} checks
          </span>
        </div>
      )}

      <div
        className="w-full bg-gray-200 rounded-full h-1.5"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={passed}
        aria-valuetext={`${strengthLabel} password strength`}
      >
        <div
          className={`h-1.5 rounded-full transition-all duration-300 ${barColorClass}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {shouldShowDetails && list.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
          {list.map((req, idx) => (
            <div key={idx} className="flex items-center">
              <span
                className={`w-1.5 h-1.5 rounded-full mr-2 ${
                  req.test ? "bg-green-500" : "bg-gray-300"
                }`}
                aria-hidden
              />
              <span
                className={`text-xs ${
                  req.test ? "text-gray-600" : "text-gray-500"
                }`}
              >
                {req.text}
              </span>
            </div>
          ))}
        </div>
      )}

      <span className="sr-only">
        Password strength is {strengthLabel}. {passed} of {total} requirements
        met.
      </span>
    </div>
  );
};

export default PasswordStrengthIndicator;