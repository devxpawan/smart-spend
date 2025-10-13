import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Search } from "lucide-react";
import React, {
  KeyboardEventHandler,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  openDirection?: "top" | "bottom" | "auto";
  isSearchable?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  className = "",
  disabled = false,
  openDirection = "auto",
  isSearchable = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedValue, setHighlightedValue] = useState(value);
  const [direction, setDirection] = useState<"top" | "bottom">("bottom");
  const [searchTerm, setSearchTerm] = useState("");
  const selectRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = isSearchable
    ? options.filter((option) =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    if (isOpen) {
      setHighlightedValue(value);
      if (isSearchable && searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
    } else {
      setSearchTerm("");
    }
  }, [isOpen, value, isSearchable]);

  const handleToggle = useCallback(() => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  }, [disabled]);

  const handleSelect = useCallback(
    (optionValue: string) => {
      onChange(optionValue);
      setIsOpen(false);
    },
    [onChange]
  );

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (
      selectRef.current &&
      !selectRef.current.contains(event.target as Node)
    ) {
      setIsOpen(false);
    }
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (disabled) return;

      switch (event.key) {
        case "Escape":
          setIsOpen(false);
          selectRef.current?.focus();
          break;
        case "ArrowDown":
        case "ArrowUp": {
          event.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
            return;
          }

          const availableOptions = filteredOptions.filter(
            (opt) => !opt.disabled
          );
          if (availableOptions.length === 0) return;

          const currentIndex = availableOptions.findIndex(
            (option) => option.value === highlightedValue
          );

          let nextIndex;
          if (currentIndex === -1) {
            nextIndex = event.key === "ArrowDown" ? 0 : availableOptions.length - 1;
          } else {
            nextIndex =
              event.key === "ArrowDown"
                ? currentIndex + 1
                : currentIndex - 1;
          }


          if (nextIndex >= availableOptions.length) nextIndex = 0;
          if (nextIndex < 0) nextIndex = availableOptions.length - 1;

          setHighlightedValue(availableOptions[nextIndex].value);
          break;
        }
        case "Enter":
          event.preventDefault();
          if (isOpen) {
            if (highlightedValue) {
              const selectedOption = filteredOptions.find(
                (opt) => opt.value === highlightedValue
              );
              if (selectedOption && !selectedOption.disabled) {
                handleSelect(highlightedValue);
              }
            }
          } else {
            setIsOpen(true);
          }
          break;
        case " ": // Space key
          if (!isSearchable || !isOpen) {
            event.preventDefault();
            if (!isOpen) {
              setIsOpen(true);
            }
          }
          break;
        default:
          break;
      }
    },
    [filteredOptions, highlightedValue, isOpen, disabled, handleSelect, isSearchable]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, handleClickOutside]);

  useLayoutEffect(() => {
    if (isOpen && selectRef.current) {
      if (openDirection !== "auto") {
        setDirection(openDirection);
        return;
      }
      const rect = selectRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 240;

      if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
        setDirection("top");
      } else {
        setDirection("bottom");
      }
    }
  }, [isOpen, openDirection]);

  useEffect(() => {
    if (isOpen && listRef.current) {
      const selectedOptionElement = listRef.current.querySelector(
        '[aria-selected="true"]'
      );
      if (selectedOptionElement) {
        selectedOptionElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [isOpen, highlightedValue]);

  const dropdownVariants = {
    top: {
      initial: { opacity: 0, y: 8, scale: 0.95 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: 8, scale: 0.95 },
    },
    bottom: {
      initial: { opacity: 0, y: -8, scale: 0.95 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: -8, scale: 0.95 },
    },
  };

  return (
    <div
      ref={selectRef}
      className={`relative ${className}`}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={
        handleKeyDown as unknown as KeyboardEventHandler<HTMLDivElement>
      }
      aria-haspopup="listbox"
      aria-expanded={isOpen}
      aria-disabled={disabled}
    >
      <button
        type="button"
        className={`flex items-center justify-between w-full px-3 py-1.5 sm:py-2 text-sm font-medium
          bg-white/80 dark:bg-gray-700/80 backdrop-blur-md border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm
          transition-all duration-200 ease-in-out
          ${
            disabled
              ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed"
              : "hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          }
          ${
            isOpen
              ? direction === "bottom"
                ? "rounded-b-none"
                : "rounded-t-none"
              : ""
          }`}
        onClick={handleToggle}
        aria-label={
          selectedOption ? `Selected: ${selectedOption.label}` : placeholder
        }
        disabled={disabled}
      >
        <span className="truncate text-gray-800 dark:text-white">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 ml-2 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={dropdownVariants[direction]}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
            className={`absolute z-20 w-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-600 shadow-xl rounded-xl
              ${direction === "top" ? "bottom-full mb-2" : "top-full mt-2"}`}
          >
            {isSearchable && (
              <div className="relative p-2">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-8 pr-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            )}
            <ul
              ref={listRef}
              className="overflow-y-auto max-h-52 p-1"
              role="listbox"
              aria-activedescendant={highlightedValue}
              tabIndex={-1}
            >
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <li
                    key={option.value}
                    className={`px-4 py-2 text-sm rounded-md mx-1 my-0.5 transition-all duration-150 ${
                      option.disabled
                        ? "text-gray-400 dark:text-gray-500 cursor-not-allowed"
                        : `cursor-pointer ${
                            option.value === highlightedValue
                              ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                              : ""
                          } ${
                            option.value === value
                              ? "bg-blue-500 dark:bg-blue-600 text-white font-semibold"
                              : "text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`
                    }`}
                    onClick={() => !option.disabled && handleSelect(option.value)}
                    onMouseEnter={() =>
                      !option.disabled && setHighlightedValue(option.value)
                    }
                    role="option"
                    aria-selected={
                      !option.disabled && option.value === highlightedValue
                    }
                    aria-disabled={option.disabled}
                    id={option.value}
                  >
                    {option.label}
                  </li>
                ))
              ) : (
                <li className="px-4 py-2 text-sm text-gray-500 text-center">
                  No options found
                </li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomSelect;
