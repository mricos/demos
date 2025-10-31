#!/bin/bash
# Run all unit tests for the vecterm server
# Usage: ./vtmp/run-tests.sh

echo "================================================"
echo "  Vecterm Server Unit Tests"
echo "================================================"

total_passed=0
total_failed=0
test_suites=0

# Run each test file
for test_file in vtmp/test-*.js; do
  if [ -f "$test_file" ]; then
    node "$test_file"
    exit_code=$?

    if [ $exit_code -eq 0 ]; then
      ((total_passed++))
    else
      ((total_failed++))
    fi
    ((test_suites++))
  fi
done

echo "================================================"
echo "  Overall Results"
echo "================================================"
echo "Test suites: $test_suites"
echo "Passed: $total_passed"
echo "Failed: $total_failed"
echo "================================================"

if [ $total_failed -eq 0 ]; then
  echo "✅ All test suites passed!"
  exit 0
else
  echo "❌ Some test suites failed"
  exit 1
fi
