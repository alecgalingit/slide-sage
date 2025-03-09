# Slide Sage

This repository contains the code for an AI-powered lecture slide web application that allows students to upload PowerPoint or PDF files and learn a lecture at their own pace. The app is built with:

- **TypeScript**
- **Remix.js**: A full-stack React framework built on Node.js.
- **React**
- **Node.js**
- **PostgreSQL**: Stores user accounts, uploaded lecture slides, and AI-generated summaries.
- **Redis**: Tracks a queue of background tasks, enabling background generation of summaries for slides that users have not yet navigated to.

The bulk of the code can be found within the [`app/routes`](./app/routes) directory, where all application routes are defined using remix file naming conventions explained [here](https://remix.run/docs/en/main/file-conventions/routes).
