/**
 * University portal writes stay off unless every safety gate is explicit.
 * READ_ONLY_MODE and DRY_RUN default to on.
 */
export function portalWritesEnabled() {
  return (
    process.env.REAL_PORTAL_WRITES === "true" &&
    process.env.READ_ONLY_MODE === "false" &&
    process.env.DRY_RUN === "false"
  );
}

export function featureFlags() {
  return {
    aiDocumentAnalysis: process.env.AI_DOCUMENT_ANALYSIS === "true",
    universityConnection: process.env.UNIVERSITY_CONNECTION === "true",
    assessmentCreation: process.env.ASSESSMENT_CREATION === "true",
    marksUpload: process.env.MARKS_UPLOAD === "true",
    realPortalWrites: portalWritesEnabled(),
    readOnlyMode: process.env.READ_ONLY_MODE !== "false",
    dryRun: process.env.DRY_RUN !== "false",
  };
}
