Feature: Session diary

  Scenario: A logged session round-trips through storage
    Given a good longboard session in 0.6m cross-off waves
    When I serialize the diary and parse it back
    Then the parsed diary contains that session unchanged

  Scenario: Junk in storage is dropped without crashing
    Given a storage payload with one valid session and assorted junk
    When I parse the diary
    Then only the valid session survives

  Scenario: A corrupted payload yields an empty diary
    Given a storage payload that is not valid JSON
    When I parse the diary
    Then the diary is empty

  Scenario: Entries come back newest first
    Given three sessions logged on different days
    When I parse the diary
    Then the most recent session is first

  Scenario: No insights before three good sessions
    Given two good sessions and one poor session
    When I ask for insights
    Then there are no insights yet

  Scenario: Insights summarise what good sessions have in common
    Given four good sessions around half a metre with cross-off wind
    When I ask for insights
    Then the insights report a median near 0.55m and cross-off wind

  Scenario: Notes are trimmed and capped
    Given a new session with a very long note
    When I create the entry
    Then the stored note is at most 500 characters
