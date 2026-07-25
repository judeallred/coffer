#!/bin/bash
# Install Git hooks for the Coffer project

echo "🔧 Installing Git hooks..."

# Create the pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
echo "🔍 Running pre-commit checks..."
echo ""

# Auto-fix formatting
echo "📝 Auto-fixing code formatting..."
deno task format:fix
if [ $? -ne 0 ]; then
  echo "❌ Formatting failed!"
  exit 1
fi
echo "✅ Formatting fixed"
echo ""

# Check linting
echo "🔎 Checking lint rules..."
deno task lint
if [ $? -ne 0 ]; then
  echo "❌ Linting failed! Please fix the errors above."
  exit 1
fi
echo "✅ Linting passed"
echo ""

# Build project
echo "🏗️  Building project..."
deno task build > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "❌ Build failed! Run 'deno task build' to see details."
  exit 1
fi
echo "✅ Build succeeded"
echo ""

echo "✨ All pre-commit checks passed!"
EOF

# Make the hook executable
chmod +x .git/hooks/pre-commit

echo "✅ Git hooks installed successfully!"
echo ""
echo "The pre-commit hook will run:"
echo "  - deno task format:fix"
echo "  - deno task lint"
echo "  - deno task build"
echo ""
echo "To skip the hook (not recommended), use: git commit --no-verify"


