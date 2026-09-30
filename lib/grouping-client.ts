import { groupPeople, type GroupingOptions, type GroupingResult, type Person } from "@/lib/grouping";

/**
 * Group in a Web Worker so large inputs never block the UI. If a worker can't
 * be started (unsupported, blocked by CSP, failed to load) the same engine runs
 * on the main thread instead, so grouping always works.
 */
export function groupPeopleAsync(people: Person[], options: GroupingOptions): Promise<GroupingResult> {
  if (typeof Worker === "undefined") {
    return Promise.resolve(groupPeople(people, options));
  }

  return new Promise((resolve, reject) => {
    let worker: Worker | undefined;

    const runHere = () => {
      worker?.terminate();
      try {
        resolve(groupPeople(people, options));
      } catch (error) {
        reject(error);
      }
    };

    try {
      worker = new Worker(new URL("./grouping.worker.ts", import.meta.url), { type: "module" });
      worker.onmessage = (event: MessageEvent<{ result?: GroupingResult; error?: string }>) => {
        if (event.data.result) {
          worker?.terminate();
          resolve(event.data.result);
        } else {
          runHere();
        }
      };
      worker.onerror = runHere;
      worker.postMessage({ people, options });
    } catch {
      runHere();
    }
  });
}
