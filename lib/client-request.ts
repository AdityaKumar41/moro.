/** Shared feedback-safe request boundary for interactive workspace actions. */
export async function requestJson(path: string, body?: unknown) {
  let response: Response;
  try {
    response = await fetch(path, {
      signal: AbortSignal.timeout(45000),
      ...(body === undefined
        ? {}
        : {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      ["TimeoutError", "AbortError"].includes(error.name)
    )
      throw Error(
        "This is taking longer than expected. Please try again. Your saved work is still available.",
      );
    throw Error("We couldn’t connect. Check your connection and try again.");
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw Error(
      "The service couldn’t complete that request. Please try again.",
    );
  }
  if (!response.ok)
    throw Error(
      typeof data?.error === "string"
        ? data.error
        : "That action couldn’t be completed. Please try again.",
    );
  return data;
}
