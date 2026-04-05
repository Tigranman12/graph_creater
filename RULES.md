rules:
  feature_development_flow:
    description: Ensure tests pass after each feature before continuing
    steps:
      - step: implement_feature
        action: write_code_for_feature

      - step: run_tests
        action: execute_tests
        command: make test   # or pytest / ctest / npm test / your test command

      - step: verify_results
        condition: tests_passed == true
        action: continue

      - step: on_failure
        condition: tests_passed == false
        action: fix_errors_and_rerun_tests
