# Overall Structure and Workflow of Total Components in All Logins 


## 1. Overall Application Structure (The School Building)
Think of our website, the **Codify LMS**, as a big school building. It is a "React-based single-page application (SPA)". This means the whole website is just one big page (the school building), and we just change what is inside it without ever loading a new page!

Here are the main parts of our building:
- **`main.tsx`**: The front door of the school. It starts everything up.
- **`App.tsx`**: The school principal (or the traffic cop). It uses a "React state" called `currentPage` to remember where you are. When you click a menu button, `App.tsx` says, "Aha! I need to show you this specific room!" instead of taking you to a whole new website.
- **`Layout.tsx`**: The school hallways and signs. It gives you the Sidebar (the menu to pick rooms) and the Top Header. It wraps around almost all the pages. It receives the `currentPage` and an `onNavigate` function (like a hall pass that lets you tell the principal where you want to go next).

## 2. Component Workflows by Login (Roles and Rooms)
In our school, not everyone is allowed in every room. The system checks an ID badge called `currentUser.role` (managed by `AuthContext`) to know who you are: Student, Faculty (Teacher), Trainer, or Admin (Principal's helper).

### Admin Login Workflow (The Principal's Helper):
When an Admin logs in:
- They start at the **`AdminDashboard`** (The Main Office). Here, they can see a big picture of how the whole school is doing (active users, recent activities).
- **Where they can go**:
  - `UserManagement`: See and change rules for all students and teachers.
  - `AnalyticsPage`: Look at graphs and charts of the school's growth.
  - `BatchManagement`: Create new classes (batches).
  - `ManageInstitutions`: Manage multiple different school locations.
  - `CodingContest`: Start a school-wide coding competition.
  - `Billing`: Deal with the school's money and subscriptions.

### Faculty Login Workflow (The Teacher):
When a Faculty logs in:
- They start at the **`FacultyDashboard`** (The Teacher's Desk). They see only their own classes and their students' homework.
- **Where they can go**:
  - `GradingQueue`: The teacher's grading book. They look at student code, see the `TestCaseResults` (machine grades), and give a final pass/fail.
  - `BatchManagement` & `CourseModulesPage`: Manage their lesson plans.
  - `Messages`: Talk to students who need help.

### Trainer Login Workflow (The Coach):
When a Trainer logs in:
- They start at the **`TrainerDashboard`** (The Coach's Office). They focus on testing and practical training.
- **Where they can go**:
  - `TrainerProfile`: Update their resume.
  - `TestManagement` & `TestMonitoring`: Watch students take live tests (`AssessmentsManagement`).
  - `ProgramizCompiler`: A playground to write and test code quickly.

### Student Login Workflow (The Student):
When a Student logs in:
- They start at the **`StudentDashboard`** (The Student's Desk). They see their homework, contests, and recommended practice tasks.
- **Where they can go**:
  - `ProblemsPage` & `CodeEditor`: Browse coding puzzles and open a full-screen coding notebook to solve them.
  - `StudentModuleView` & `CourseModulesPage`: Go through course lessons step-by-step.
  - `ContestParticipation`: Enter a full-screen mode to compete in contests.
  - `StudentCourseTests`: Take tests given by trainers.
  - `StudentSettings` & `StudentProfile`: Change their profile picture and personal info.
  - `Messages`: Talk to teachers or other students.

## 3. How to Access Each and Everything in All Logins (How to Walk Around)
How do you actually get into the building and walk around?

- **Logging In**: You go to `SignIn.tsx` (the security gate). You type an email. The system looks for words like "student" or "admin" inside the email to give you the right ID badge (`currentUser.role`). You can also just click the demo buttons!
- **Navigating the System (Walking between rooms)**: 
  - After logging in, whenever you click a button, a special transport command called `handleNavigate(<pageName>)` is used. You tell it a string, like `'problems'`, and it can also carry some extra data (like "problem #5").
  - The `Layout` sidebar changes based on your ID badge (`currentUser.role`). If you are a student, the "Billing" door magically disappears! When you click a visible door, `Layout` yells `onNavigate('billing')` to the principal (`App.tsx`), and the principal changes the room shown on your screen.
- **Context Overrides (Going Full-Screen)**: Sometimes, when you enter a special room like the `CodeEditor` or a test (`contest-play`), the school hallways (`Layout`) disappear so you do not get distracted! To leave these full-screen rooms, the room shouts `onBack()` or `onNavigate('dashboard')` to bring you back out to the normal hallways.
