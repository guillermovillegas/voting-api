# Team Development Rules

## Own Your Folder

Each person works in their own folder. Don't edit other people's folders.

Before starting, agree as a team who owns what folders.

## Git Basics

**Create your branch:**
```bash
git checkout -b feature/your-feature-name
```

**Save your work:**
```bash
git add .
git commit -m "feat: describe what you did"
git push origin feature/your-feature-name
```

## When You Get Merge Conflicts

This happens when two people edited the same file. Don't panic!

**Step 1:** Update your code
```bash
git fetch origin
git rebase origin/main
```

**Step 2:** Look for conflict markers in files:
```
<<<<<<< HEAD
your code
=======
their code
>>>>>>> main
```

**Step 3:** Keep BOTH pieces of code if they do different things. Delete the markers.

**Step 4:** Save and continue
```bash
git add .
git rebase --continue
```

## Shared Files

If multiple people need to edit the same file, only ADD to the end - don't change existing code.

## Quick Fixes

| Problem | Solution |
|---------|----------|
| "Your branch is behind" | `git pull --rebase origin main` |
| "Merge conflict in X" | Open file, find `<<<<`, keep both versions, delete markers |
| "Cannot push" | `git pull --rebase` then `git push` again |
| Accidentally edited wrong file | `git checkout -- path/to/file` to undo |
| Need to start over | `git checkout main` then create new branch |
