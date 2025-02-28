import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";

const HowToUse = () => {
  return (
    <>
      <HoverCard>
        <HoverCardTrigger asChild>
          <Button variant="link" className="dark:text-cyan-600">How to Use</Button>
        </HoverCardTrigger>
        <HoverCardContent>
          <h3 className="font-semibold mb-2">How to Use</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
            <li>
              <strong>Enter Names</strong>: Add names in the text box, with each
              name on a new line.
            </li>
            <li>
              <strong>Set Group Size</strong>: Specify how many members you want
              in each group.
            </li>
            <li>
              <strong>Download Results</strong>: Click{" "}
              <strong>&quot;Generate File&quot;</strong> to generate the groups and download either an excel or word file.
            </li>
          </ol>{" "}
        </HoverCardContent>
      </HoverCard>
    </>
  );
};

export default HowToUse;
