import { groupPeople, type GroupingOptions, type Person } from "@/lib/grouping";

// Runs the grouping engine off the main thread so big lists with rules never freeze the UI.
interface Request {
  people: Person[];
  options: GroupingOptions;
}

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<Request>) => void) | null;
  postMessage(message: unknown): void;
};

scope.onmessage = (event) => {
  try {
    const { people, options } = event.data;
    scope.postMessage({ result: groupPeople(people, options) });
  } catch (error) {
    scope.postMessage({ error: String(error) });
  }
};
