import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const Bgd = ({ val }:{ val: boolean }) => {
  return (
    <div>
      <Popover>
        <PopoverTrigger
          className="cursor-help text-white dark:text-cyan-500"
        >
          Best Group Distribution
        </PopoverTrigger>
        <PopoverContent className="dark:bg-stone-950 dark:border-cyan-700 dark:text-cyan-600">
          {val
            ? "Extra members will be distributed across existing groups for balanced sizes."
            : "Extra members will form a new group, which may result in smaller groups."}
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default Bgd;
