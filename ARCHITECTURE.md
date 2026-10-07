# UniPilot AI backend

The Next.js app in this folder is the product. It is not a monorepo. Server modules live in `server/`, and API routes live in `app/api/`. The existing faculty UI, Supabase Auth, and the tables from `supabase/migrations/20260930120000_initial.sql` stay in place.

## What already existed

- Next.js 16 App Router, with the faculty UI calling `services/api.ts`.
- Supabase Auth. The browser uses the publishable key. `SUPABASE_SECRET_KEY` stays in `lib/supabase/server.ts` and is not used by these upload routes.
- Tables: profiles, courses, assessments, students, student_marks, university_connections, upload_jobs, upload_sections, activity_logs. Row Level Security ties each row to `auth.uid()`.
- University connection status is stored. University passwords are not.
- Before this pipeline, document analysis was a filename simulation in `services/api.ts`. That simulation remains only when Supabase is not configured.

## What this phase adds

A signed-in teacher can upload an Excel (`.xlsx`) or CSV marks file.

1. `POST /api/uploads` reads the teacher from the bearer session. It does not accept a teacher id in the body.
2. The file is stored in the private `marks-files` bucket at `{teacherId}/{uploadJobId}/{sanitized-name}`.
3. An `upload_jobs` row stores `extracted_data` separately from later `confirmed_data`.
4. CSV and XLSX are parsed in TypeScript: headers, max-mark rows, weightage, students, and marks. Assessment labels such as `A1` and `Mid` are normalized in code. The model is not called for a structured sheet.
5. The course is selected only on an exact course-code match against that teacher's courses. Anything else waits for the teacher.
6. Weightage must total exactly 100. Missing values stay null. Category totals are not split automatically.
7. `POST /api/uploads/:id/approve` checks the course, weightage, and marks, stores an approval hash, and sets the job to `approved`.

`GET /api/health` reports application and database configuration without secrets.

Apply `supabase/migrations/20260930183000_upload_pipeline.sql` once in the Supabase SQL editor before the first real upload.

## Intentionally disabled

- `REAL_PORTAL_WRITES` defaults off. `POST /api/uploads/:id/execute` returns `REAL_PORTAL_WRITES_DISABLED`.
- No Playwright worker, no university login, no session store, and no grade writes.
- Redis, BullMQ, PDF, and DOCX parsing are not running. PDF and DOCX uploads are stored and then stopped with a clear error.
- OpenAI is not called. Set `OPENAI_API_KEY` and `AI_DOCUMENT_ANALYSIS=true` only when a later phase adds a schema-validated extraction call for documents the parser cannot structure.
- The offline demo upload still animates a portal run when Supabase is not configured. A configured project never uses that path for a real file.
