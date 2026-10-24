import { RiArrowRightLine, RiLoader4Line, RiShuffleLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";

interface GenerateButtonProps {
  isWorking: boolean;
  disabled: boolean;
  hasResults: boolean;
  onClick: () => void;
  className?: string;
}

export function GenerateButton({ isWorking, disabled, hasResults, onClick, className = "" }: GenerateButtonProps) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={isWorking || disabled}
      variant={isWorking ? "shimmer" : "default"}
      size="xl"
      className={`w-full font-syne tracking-wide ${className}`}
    >
      {isWorking ? (
        <>
          <RiLoader4Line className="animate-spin" />
          Grouping…
        </>
      ) : hasResults ? (
        <>
          <RiShuffleLine />
          Make new groups
        </>
      ) : (
        <>
          Generate groups
          <RiArrowRightLine />
        </>
      )}
    </Button>
  );
}
