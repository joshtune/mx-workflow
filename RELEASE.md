# Release Process

## Before Releasing

1. **Update version numbers:**
   ```bash
   # Update both files
   .claude-plugin/plugin.json → "version": "X.Y.Z"
   .claude-plugin/marketplace.json → "version": "X.Y.Z"
   ```

2. **Test locally:**
   ```bash
   # Load plugin in current session
   claude --plugin-dir ~/workspace/claude/mx-workflow

   # Test key commands
   /mx:help
   /mx:plan
   /mx:implement
   ```

3. **Update CHANGELOG** (if maintaining one):
   Document user-facing changes, new commands, bug fixes

4. **Review README** for accuracy of installation steps and command descriptions

## Publishing

### For Marketplace Distribution

1. **Tag the release:**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Update the marketplace repo** where `marketplace.json` is hosted:
   ```bash
   # Ensure the plugin repo is cloned at the location specified in marketplace.json
   # Users will run: /plugin marketplace add <repo-url>
   ```

3. **Test installation:**
   ```bash
   # In a test project
   /plugin marketplace add https://github.com/username/mx-workflow.git
   /plugin install mx@joshuatune-mx-workflow
   ```

### For Direct Cloning

Users can directly clone and load:
```bash
git clone https://github.com/username/mx-workflow.git ~/mx-workflow
claude --plugin-dir ~/mx-workflow
```

## Post-Release

1. Pin the version in your own `~/.claude/settings.json` if you track versions
2. Announce on relevant channels (team Slack, documentation, etc.)
3. Monitor issues for user feedback

## Versioning Scheme

Use semantic versioning:
- `1.0.0` - Initial release
- `1.1.0` - New commands or features
- `1.0.1` - Bug fixes
- `2.0.0` - Breaking changes (e.g., renamed commands)
