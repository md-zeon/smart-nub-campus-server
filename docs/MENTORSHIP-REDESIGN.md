# Mentorship Redesign — Research & Implementation Guide

## 1. Why the current feature is not good UX

The existing mentorship feature is a **directory + one-shot request flow**:

1. Student browses alumni mentors (filter by department / industry / topic).
2. Student sends a request with an optional topic and message.
3. Mentor accepts / declines.
4. **Nothing happens.** The relationship ends at "Accepted".

This is a dead-end. Industry research consistently shows that this shape produces
disengagement and program failure:

| Failure mode                            | Research finding                                                                                         | Current NUB state                                        |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| No structure after pairing              | "Conversations drift, sessions feel repetitive, progress is unclear" → disengagement                     | Relationship ends at ACCEPTED                            |
| Vague goals / no expectations set early | "Goal-setting quality is the strongest predictor of outcomes, second only to match quality"              | Request has _optional_ topic/message, no goals           |
| Poor matching                           | "Match quality is the single feature that most determines whether a mentoring program succeeds or fails" | Mentors listed alphabetically, no relevance              |
| Mentor burnout / over-assignment        | "Mentor capacity is the single biggest ignored predictor of failure"                                     | No capacity limit; a mentor can accept unlimited mentees |
| No feedback / no closure                | "Failure to plan for good endings → relationships recalled negatively"                                   | No way to end a relationship or reflect                  |
| No engagement signals                   | "Inactive pairs need re-engagement nudges"                                                               | No last-activity tracking, no session history            |

Source synthesis: HBR (Dec 2024), Forbes HR Council (2024), Qooper, Together
Platform, Mentorloop, Chronus, Mentorfy, PeopleGrove, LinkedIn Mentorship UX
case study, and Koder.ai's mentorship app build guide.

## 2. Design principles (from research)

1. **Goal-first, not personality-first.** Match on developmental goals and skill
   gaps; ask mentors to signal the topics they can coach on.
2. **Lean intake.** Only high-signal fields. Every extra question lowers
   completion.
3. **Capacity is a first-class criterion.** Prevent over-assignment automatically.
4. **The acceptance is the _start_, not the _end_.** Pairing should flow into
   goal setting, scheduling, and sessions.
5. **Lightweight progress tracking.** Sessions log in under a minute; goals use
   a structured template; a timeline view shows milestones.
6. **In-platform communication.** Avoid context switching to email/messaging.
7. **Plan good endings.** Formal closure with reflection increases satisfaction.
8. **Engagement affordances, not shaming.** "Last session 21 days ago", gentle
   check-in prompts.
9. **Recommendation transparency.** Show _why_ a mentor is a top match.
10. **Asynchronous-first.** Support notes/async check-ins between sessions.

## 3. Feature set delivered in this redesign

### 3.1 Mentor profile (opt-in)

New `UserProfile` fields — `mentorHeadline` (why I mentor), `mentorBio`,
`mentorAvailability`, `mentorCadence` (WEEKLY/BIWEEKLY/MONTHLY/FLEXIBLE),
`mentorMeetingFormat` (reuses `MeetingPreference`), and `mentorMaxMentees`
(capacity). These are the "capacity + availability signals" research says are
essential and most often missing.

### 3.2 Request onboarding (goal-driven)

`POST /mentorship/requests` now requires 1–5 structured goals. This fixes the
"optional topic" problem and gives mentors the info they need to decide, and
gives mentees the _IKEA effect_ (investment → commitment).

### 3.3 Capacity enforcement

When creating a request we count a mentor's committed slots
(ACTIVE mentorships + PENDING requests) against `mentorMaxMentees`. The
directory exposes `slotsAvailable` so students only approach mentors with room.

### 3.4 Smart relevance ordering

`GET /mentorship/mentors` computes a lightweight match score per mentor based on
department overlap, topic overlap against `mentorshipTopics`, and industry
match. `sort=relevance` ranks by score and exposes a `matchScore` + top-matched
topic so the UI can say _"Best match"_ and explain why.

### 3.5 The relationship hub (`/mentorship/[id]`)

Once a request is ACCEPTED a `Mentorship` record is created with the mentee's
request goals seeded as the first goals. The hub has:

- **Goals** — create / edit / complete / delete (structured, with due dates).
- **Sessions** — schedule, reschedule, complete with agenda + notes +
  action items, cancel. This is the lightweight session log.
- **Messages** — private in-mentorship thread (real-time via Socket.IO).
- **Activity** — `lastActivityAt`, "days since last session".
- **Closure** — `Complete` with ratings + feedback; `End` early.

### 3.6 Notifications & realtime

New `NotificationType`s for accepted/session/goal/message/completion events, and
a `mentorship:message` Socket.IO event for the thread.

## 4. Data model changes

```
enums.prisma
  MentorshipCadence  { WEEKLY, BIWEEKLY, MONTHLY, FLEXIBLE }
  MentorshipStatus   { ACTIVE, COMPLETED, ENDED }
  MentorshipGoalStatus { ACTIVE, COMPLETED, CANCELLED }
  MentorshipSessionStatus { SCHEDULED, COMPLETED, CANCELLED }
  + new NotificationType values

profile.prisma (UserProfile)
  mentorHeadline, mentorBio, mentorAvailability  String?
  mentorCadence                                 MentorshipCadence?
  mentorMeetingFormat                           MeetingPreference?
  mentorMaxMentees                              Int @default(3)

alumni.prisma
  MentorshipRequest += goals String[]
  Mentorship         (requestId @unique, mentor, mentee, status, startedAt,
                      endedAt, lastActivityAt, ratings + feedback)
  MentorshipGoal     (mentorshipId, title, description, status, dueDate, order)
  MentorshipSession  (mentorshipId, scheduledAt, durationMinutes, format,
                      location, agenda, notes, actionItems, status, createdById)
  MentorshipMessage  (mentorshipId, senderId, body)

auth.prisma (User)
  mentorshipsAsMentor / mentorshipsAsMentee
  mentorshipMessagesSent
  mentorshipSessionsCreated
```

## 5. API surface (mounted at `/mentorship`)

| Method | Path                                     | Purpose                                               |
| ------ | ---------------------------------------- | ----------------------------------------------------- |
| GET    | `/mentorship/mentors`                    | list + relevance sort + capacity + new profile fields |
| POST   | `/mentorship/requests`                   | create request (goals required, capacity enforced)    |
| GET    | `/mentorship/requests`                   | list incoming/outgoing requests                       |
| PATCH  | `/mentorship/requests/:id`               | accept (creates Mentorship) / reject / withdraw       |
| GET    | `/mentorship/relationships`              | list my active relationships                          |
| GET    | `/mentorship/relationships/:id`          | relationship hub detail                               |
| POST   | `/mentorship/relationships/:id/goals`    | add goal                                              |
| PATCH  | `/mentorship/goals/:goalId`              | update goal (incl. status)                            |
| DELETE | `/mentorship/goals/:goalId`              | delete goal                                           |
| POST   | `/mentorship/relationships/:id/sessions` | schedule session                                      |
| PATCH  | `/mentorship/sessions/:sessionId`        | reschedule / complete / cancel                        |
| GET    | `/mentorship/relationships/:id/messages` | list messages (before cursor)                         |
| POST   | `/mentorship/relationships/:id/messages` | send message (socket emit)                            |
| POST   | `/mentorship/relationships/:id/complete` | complete + feedback                                   |
| POST   | `/mentorship/relationships/:id/end`      | end early                                             |

`/mentorship` (without suffix) was used as the directory path; relationships are
explicitly namespaced to avoid ambiguity.

## 6. Client UX

- **`/mentorship`** — directory with relevance sort, capacity ("2 of 3 slots
  filled"), mentor headline/availability/cadence chips, and a request dialog that
  _guides_ goal setting (structured goal inputs with examples + due-date).
- **`/mentorship/requests`** — cards now show the mentee's goals so a mentor can
  decide with full context.
- **`/mentorship/[id]`** — the relationship hub (goals, sessions, messages,
  activity, closure).
- **Profile** — mentor opt-in now collects headline, availability, cadence,
  format, and max mentees (lean, one card).

## 7. Metrics to validate (future)

Match acceptance rate, time-to-first-session, session cadence, goal completion,
satisfaction ratings, inactive-pair rate. Add these to admin reporting later.
