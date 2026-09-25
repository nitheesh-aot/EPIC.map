/** Shown under the radios when neither has been chosen. */
export const SENSITIVE_REQUIRED =
  "Select whether this layer contains sensitive information";

export type SensitiveChoice = "yes" | "no" | "";

/** What is wrong with the form, field by field; `null` where nothing is. */
export type ImportFormProblems = {
  name: string | null;
  sensitive: string | null;
};

const nameProblem = (
  name: string,
  existingNames: readonly string[],
): string | null => {
  if (!name) return "Enter a layer name.";

  const taken = existingNames.some(
    (existing) => existing.trim().toLowerCase() === name.toLowerCase(),
  );
  return taken
    ? `You already have a layer named "${name}". Enter a different name.`
    : null;
};

/**
 * Checked on Upload rather than as the user types: the form opens with an
 * empty name and no choice made, and neither is a mistake until they submit.
 */
export const validateImportForm = (
  name: string,
  sensitive: SensitiveChoice,
  existingNames: readonly string[],
): ImportFormProblems => ({
  name: nameProblem(name.trim(), existingNames),
  sensitive: sensitive === "" ? SENSITIVE_REQUIRED : null,
});

export const hasProblem = (problems: ImportFormProblems): boolean =>
  problems.name !== null || problems.sensitive !== null;
