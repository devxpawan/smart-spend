import React from 'react';
import CustomSelect from './CustomSelect';

interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
}

// Constants - Fixed Sri Lankan Rupee code
const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: "Rs", name: "Sri Lankan Rupee", symbol: "Rs" },
  { code: "USD", name: "United States Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
];

interface CurrencySelectProps {
  selectedCurrency: string;
  onCurrencyChange: (currencyCode: string) => void;
}

const CurrencySelect: React.FC<CurrencySelectProps> = ({ selectedCurrency, onCurrencyChange }) => {
  const options = CURRENCY_OPTIONS.map(option => ({
    value: option.code,
    label: `${option.symbol} ${option.name} (${option.code})`,
  }));

  return (
    <CustomSelect
      options={options}
      value={selectedCurrency}
      onChange={onCurrencyChange}
      placeholder="Select a currency"
    />
  );
};

export default CurrencySelect;
