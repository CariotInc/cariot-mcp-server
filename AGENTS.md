# Agent Instructions

## Commit Message Guidelines

Commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification.
**Always write the entire commit message (subject, body, and footers) in English**, even when the conversation, the issue, or the PR description is in Japanese.

### Format

```text
<type>(<scope>): <description>

<body>

<footer>
```

- `type`: one of `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
- `scope` (optional): the affected module or area, e.g. `auth-provider`, `http-client`, `package`
- `description`: imperative mood, starting with a lowercase letter, no trailing period
- `body` and `footer` are optional. For breaking changes, add `!` after the type/scope (e.g. `feat(api)!: ...`) and explain the change in a `BREAKING CHANGE:` footer

### Examples

```text
feat: add FetchClient class to replace axios
fix(auth-provider): prevent timer leak in fetchToken()
chore(package): bump engines.node to >=18.18.0
```

## Pull Request Guidelines

When creating a pull request, please include **only the Overview section** in the PR description.
**Please write the PR description in Japanese.**

### Overview Structure

The Overview should contain:

- A brief summary of what changes were made
- The purpose or reason for the changes
- Any important context reviewers should know

**Note:** Do not include detailed implementation details, file-by-file breakdowns, or other verbose sections. Keep the PR description concise and focused on the overview.
