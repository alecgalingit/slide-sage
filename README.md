# AI Lecture Slide App

This repository contains the code for an AI-powered lecture slide application that allows students to upload PowerPoint (`.pptx`) or PDF files and learn a lecture at their own pace.

## Technologies Used

- **Remix.js**: A full-stack React framework built on Node.js that provides seamless integration between the frontend and backend.
- **React**: Used for building the user interface, enabling interactive and dynamic elements.
- **Node.js**: Powers the server-side logic, handling requests and managing data flow.
- **TypeScript**: Ensures type safety and improves code maintainability.
- **PostgreSQL**: Stores user accounts, uploaded lecture slides, and AI-generated summaries.
- **Redis**: Tracks a queue of background tasks, enabling background generation of summaries for slides that users have not yet navigated to.

## Project Structure

The bulk of the code can be found within the [`app/routes`](./app/routes) directory, where all application routes are defined. Remix.js follows a unique file-based routing convention that does not clearly separate frontend and backend logic. More details on Remix routes can be found in the [official documentation](https://remix.run/docs/en/main/file-conventions/routes)
