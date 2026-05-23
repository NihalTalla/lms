# How Components Are Working and How Data Is Stored
*(Explained Simply!)*

## 1. How Components Are Working (The LEGO Blocks)
The Codify LMS website is built using "React functional components". Think of components as LEGO blocks. We snap small LEGO blocks together to build bigger things like a whole web page!

- **Shadcn UI Library (The Special LEGO Sets)**: We use a box of pre-made, beautiful LEGO pieces called `Shadcn/UI`. Instead of building a button completely from scratch, we just grab their `Card`, `Button`, `Dialog` (a popup window), `Toast` (a little notification message handled by a tool called `Sonner`), `Tabs`, and `Table` blocks.
- **Component Communication (Passing Notes)**: Instead of a big LEGO piece passing rules down through a hundred smaller pieces (an annoying process called "prop drilling"), our top management handles the big decisions. For example, the `App.tsx` (the principal) holds the current `Problem` assignment and securely passes it directly to the `CodeEditor.tsx` (the student's notebook) using something called a "callback handler" (like a direct walkie-talkie channel).
- **State Segregation (Keeping Secrets)**: Components like to keep their own secrets, known as internal "state" (using tools like `useState` and `useEffect`). For example, the `CodeEditor.tsx` has its own private "states" to remember what color theme it's using or whether the code is currently running. It doesn't bother the rest of the website with this secret info!
- **Conditional Rendering (Magic Doors)**: In `App.tsx`, we have a giant set of magic doors. It uses an "if-statement" on the `currentPage` state. If you say `currentPage === 'dashboard'`, it magically materializes the correct dashboard for your role and hides all the other dashboard options.

## 2. How Data is Stored (The Backpacks and Filing Cabinets)
Right now, the LMS does not use a real, far-away database server. It stores everything "client-side", meaning it all lives directly inside your web browser using special tools!

- **Authentication State (`AuthContext`) (The ID Badge)**: This is a global state (a rule everyone on the site must follow) to remember "Who is logged in right now?". The file `src/lib/auth-context.tsx` gives everyone a `currentUser` (your identity) and commands like `login()`, `logout()`, and `setRole()`. 
- **Static Mock Datastore (`src/lib/data.ts`) (The Fake Filing Cabinet)**: This file acts like our database. All Users, Courses, Topics, Batches, Problems, and Messages are just hardcoded "Javascript Arrays and Objects" (simple lists of data). It's like having a giant notebook filled with all the fake school records for us to play with!
- **Zustand / Dedicated Stores (The Specialized Backpacks)**: Files like `contest-store.ts`, `submission-store.ts`, and `test-store.ts` are smart backpacks. They remember complicated things like "How many seconds are left in this contest?" or "What code did this student submit 5 minutes ago?". They keep this messy math out of the pretty UI layouts.
- **Local Storage / Persistence (The Browser's Memory)**: We save your user data as `codify_user` inside `localStorage` (your browser's permanent memory bank). However, we turned off the feature that auto-remembers you when you refresh, so we can practice logging in every time for the demo!
- **Simulated API Latency (Fake Waiting!)**: Since we are using fake data (`data.ts`) that loads instantly, we actually *pretend* it takes a long time to load! We use JavaScript delays (`setTimeout`) to simulate hitting a real server over the internet. This forces our cool loading spinners and skeleton screens to show up correctly on the screen, just like an actual app.

## 3. Overall Info in All Logins (Who Gets to See What?)
Depending on which ID Badge (`currentUser.role`) you wear, you look at different information in the filing cabinets.

- **Shared Access (Stuff for Everyone)**: Everyone gets to see basic Profile settings, generic layout menus, and Toast notifications (little pop-up messages).
- **Admin vs. Operational Data (The Principal vs. The Teacher)**: 
  - **Admins** look at the huge picture. They read *all* the info in `data.ts` to show big charts and system-wide analytics over the whole school. 
  - **Operational Roles (Faculty/Trainer)** only get to open specific folders. They pull data that exactly matches the `batchId` (class ID) or courses they are strictly assigned to.
- **The Student Model (The Learner's Path)**: A student looks at info one step at a time. They read through Lessons, Modules, and Topics like chapters in a book. When they solve a coding Problem, the system checks their work against hidden `testCases` stored in `data.ts`. Their answers are then stuffed dynamically into the `submission-store` backpack so the teacher can grade them later!
