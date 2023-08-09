![Recast Logo](https://raw.githubusercontent.com/WOGRA-AG/RECAST/main/apps/recast/src/assets/logo/recast_logo.svg)
# RECAST - An Open-Source Digital Twin Framework for Industrial Production Environments

Welcome to RECAST, an open-source digital twin framework specifically designed for use in industrial production environments.

## Getting Started
To start using RECAST, we rely on [Supabase] as the primary backend technology. Before you can run the app, you must register and set up your own [Supabase] project. If you need guidance on how to get started with [Supabase], please refer to the [Supabase docs].

### Supabase Setup
After setting up your [Supabase] Project, you'll need three pieces of information from your new project, which can be found in the "Project Settings" menu:

1. Reference ID - Located in the "General" tab of your Project's settings.
2. Anon Api Key - Found in the "API" tab of your project's settings.
3. The password for your database.

Once you have obtained this information, navigate to the `/apps/supabase` folder within this project. We have already prepared all the necessary migration files for you.

```bash
cd apps/supabase
```

To install the [supabase-cli], we recommend using npm:

```bash
npm install
```

Next, link the CLI to your project:

```bash
npx supabase link --project-ref <YOUR REFERENCE ID>
```

Confirm your `DATABASE PASSWORD`. This will link your local project to your [Supabase] database. The next step is to push the local migration scripts to this database. First, update your local database created by [supabase-cli] with the following command:

```bash
npx supabase db reset
```

Then push the schema to your remote database:

```bash
npx supabase db push
```

### Frontend
The frontend of this project is located in the `apps/recast` folder. 
Before starting it, you need to update the `apps/recast/src/environments/environments.ts` file with your personal [Supabase] `DatabaseUrl` and your `<AnonAPIKey>`.

To start the frontend, run the following command:

```bash
npm install && npm start
```

### Start Using RECAST
After the frontend has started locally, you can access [http://localhost:4200](http://localhost:4200) to explore RECAST. For more information and examples on how to use the platform, please refer to the [Documentation].

## License
Recast is primarily distributed under the terms of both the MIT license and the Apache License (Version 2.0).

See [LICENSE-APACHE](LICENSE-APACHE), [LICENSE-MIT](LICENSE-MIT), and [COPYRIGHT](COPYRIGHT) for details.

[Angular]: https://angular.io/
[Supabase]: https://supabase.com/
[Shepard]: https://gitlab.com/dlr-shepard
[WOGRA AG]: https://www.wogra.com/
[Supabase docs]: https://supabase.com/docs
[supabase-cli]: https://supabase.com/docs/guides/cli
[Documentation]: https://wogra-ag.github.io/recast-docs