Implement the feature described in $ARGUMENTS, then verify it with tests.

Follow this exact flow:

1. **Implement** the feature — write or modify the necessary code.

2. **Run tests** — execute:
   ```
   npm test
   ```
   If no test script exists yet, run the TypeScript compiler check instead:
   ```
   npx tsc --noEmit
   ```

3. **Check results**:
   - If tests/compilation **pass** → report success and summarize what was built.
   - If tests/compilation **fail** → read the errors, fix the code, re-run, and repeat until passing. Do not move on while tests are failing.

Never skip the test step. Never mark the feature done until tests pass.
