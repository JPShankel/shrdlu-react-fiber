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

## Supabase Session Saving

The app includes a Supabase client and automatically saves the current session after each command.
On startup, it also attempts to restore the most recently updated saved session.

Create a `sessions` table in Supabase with columns compatible with this payload:

- `client_session_id` `text` unique not null
- `session_name` `text` unique
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
  client_session_id text unique not null,
  session_name text unique,
  last_command text,
  command_history jsonb not null default '[]'::jsonb,
  held_object_id text,
  objects jsonb not null,
  logs jsonb not null,
  parser_memory jsonb,
  updated_at timestamptz default timezone('utc', now())
);
```

`command_history` stores the rolling session command list and is capped at 25 entries in the client.
Named sessions can be managed from the console with commands like `save session demo`, `load demo`, `list sessions`, and `remove session demo`.

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
