# Slide Sage

![Slide Sage Screenshot](./public/demo.png)  

This repository contains the code for an AI-powered lecture slide web application that allows students to upload PowerPoint or PDF files and learn a lecture at their own pace. The app is built with:

- **TypeScript**
- **Remix.js**: A full-stack React framework built on Node.js.
- **React**
- **Node.js**
- **PostgreSQL**: Stores user accounts, uploaded lecture slides, and AI-generated summaries.
- **Redis**: Tracks a queue of background tasks, enabling background generation of summaries for slides that users have not yet navigated to.

The bulk of the code can be found within the [`app/routes`](./app/routes) directory, where all application routes are defined using Remix file naming conventions explained [here](https://remix.run/docs/en/main/file-conventions/routes).

## Environment Variables

You'll need to set up a few environment variables for the app to work:

- `DATABASE_URL`: The PostgreSQL database connection URL.  
- `SESSION_SECRET`: A key for encrypting sessions.  
- `REDIS_URL`: The Redis database connection URL.  
- `OPENAI_API_KEY`: Used to generate summaries and their embeddings. 
- `PINECONE_API_KEY`: Needed for storing and retrieving embeddings for RAG.
- `PINECONE_INDEX`: The name of the Pinecone index used to store embeddings.  
