import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
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
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  openDirection?: "top" | "bottom" | "auto";
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  className = "",
  disabled = false,
  openDirection = "auto",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedValue, setHighlightedValue] = useState(value);
  const [direction, setDirection] = useState<"top" | "bottom">("bottom");
  const selectRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    if (isOpen) {
      setHighlightedValue(value);
    }
  }, [isOpen, value]);

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

          const currentIndex = options.findIndex(
            (option) => option.value === highlightedValue
          );
          let nextIndex =
            event.key === "ArrowDown" ? currentIndex + 1 : currentIndex - 1;

          if (nextIndex >= options.length) nextIndex = 0;
          if (nextIndex < 0) nextIndex = options.length - 1;

          setHighlightedValue(options[nextIndex].value);
          break;
        }
        case "Enter":
          event.preventDefault();
          if (isOpen) {
            handleSelect(highlightedValue);
          } else {
            setIsOpen(true);
          }
          break;
        case " ": // Space key
          event.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          }
          break;
        default:
          break;
      }
    },
    [options, highlightedValue, isOpen, disabled, handleSelect]
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
        className={`flex items-center justify-between w-full px-4 py-2 text-sm font-medium
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
          <motion.ul
            ref={listRef}
            variants={dropdownVariants[direction]}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
            className={`absolute z-20 w-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-600 shadow-xl rounded-xl overflow-y-auto max-h-60
              ${direction === "top" ? "bottom-full mb-2" : "top-full mt-2"}`}
            role="listbox"
            aria-activedescendant={highlightedValue}
            tabIndex={-1}
          >
            {options.map((option) => (
              <li
                key={option.value}
                className={`px-4 py-2 text-sm cursor-pointer rounded-md mx-1 my-0.5
                  transition-all duration-150
                  ${
                    option.value === highlightedValue
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                      : ""
                  }
                  ${
                    option.value === value
                      ? "bg-blue-500 dark:bg-blue-600 text-white font-semibold"
                      : "text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                onClick={() => handleSelect(option.value)}
                onMouseEnter={() => setHighlightedValue(option.value)}
                role="option"
                aria-selected={option.value === highlightedValue}
                id={option.value}
              >
                {option.label}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomSelect;
