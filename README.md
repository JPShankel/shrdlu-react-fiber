# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

## Supabase Auth And Session Saving

The app includes a Supabase client, simple email/password authentication, and automatic session saving.
Users can also choose an anonymous mode, which keeps the app usable without writing any session data to Supabase.
After a user signs in, the app restores that user's most recently updated saved session and scopes all session queries to the authenticated account.

Create a `sessions` table in Supabase with columns compatible with this payload:

- `user_id` `uuid` not null references `auth.users(id)` on delete cascade
- `client_session_id` `text` not null
- `session_name` `text`
- `last_command` `text`
- `command_history` `jsonb` not null
- `held_object_id` `text`
- `objects` `jsonb` not null
- `logs` `jsonb` not null
- `parser_memory` `jsonb`
- `updated_at` `timestamptz`

Example SQL:

```sql
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_session_id text not null,
  session_name text,
  last_command text,
  command_history jsonb not null default '[]'::jsonb,
  held_object_id text,
  objects jsonb not null,
  logs jsonb not null,
  parser_memory jsonb,
  updated_at timestamptz default timezone('utc', now())
);

create unique index if not exists sessions_user_client_session_idx
  on public.sessions (user_id, client_session_id);

create unique index if not exists sessions_user_session_name_idx
  on public.sessions (user_id, session_name)
  where session_name is not null;

alter table public.sessions enable row level security;

create policy "users can view their sessions"
  on public.sessions
  for select
  using (auth.uid() = user_id);

create policy "users can insert their sessions"
  on public.sessions
  for insert
  with check (auth.uid() = user_id);

create policy "users can update their sessions"
  on public.sessions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete their sessions"
  on public.sessions
  for delete
  using (auth.uid() = user_id);
```

If you already have a `sessions` table from the older anonymous setup, run the migration in
[supabase/migrations/20260415_add_sessions_user_id_rls.sql](/abs/path/c:/projects/shrdlu/supabase/migrations/20260415_add_sessions_user_id_rls.sql:1).
That migration adds `user_id`, replaces the old global uniqueness rules with per-user indexes, and enables RLS policies.
Older anonymous rows cannot be assigned to a real auth user automatically, so they will stay inaccessible until you manually update or delete them.

`command_history` stores the rolling session command list and is capped at 25 entries in the client.
Named sessions can be managed from the console with commands like `save session demo`, `load demo`, `list sessions`, and `remove session demo`.
Session saving and loading require the user to sign in from the app's auth panel.
Anonymous mode is local-only and skips all Supabase persistence.

The client reads either `REACT_APP_SUPABASE_*` or `NEXT_PUBLIC_SUPABASE_*` environment variables. If you change env values while the dev server is running, restart `npm start`.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
