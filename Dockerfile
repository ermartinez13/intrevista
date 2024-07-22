FROM node:20
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# Corepack is a Node tool that identifies whatever package manager is configured for project, installs it if needed, and runs it without requiring explicit user interactions
RUN corepack enable