#!/bin/bash

# Setup Git hooks for development
echo "🔧 Setting up Git hooks..."

# Create hooks directory if it doesn't exist
mkdir -p .git/hooks

# Create pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

echo "🔍 Running pre-commit checks..."

# Run TypeScript checking
echo "📝 Checking TypeScript..."
npm run typecheck
if [ $? -ne 0 ]; then
  echo "❌ TypeScript check failed"
  exit 1
fi

# Run ESLint
echo "🔧 Running ESLint..."
npm run lint:fix
if [ $? -ne 0 ]; then
  echo "❌ ESLint check failed"
  exit 1
fi

echo "✅ All pre-commit checks passed!"
EOF

# Make the hook executable
chmod +x .git/hooks/pre-commit

echo "✅ Git hooks setup complete!"
echo "📝 Pre-commit hook will now run TypeScript checks and ESLint on every commit"