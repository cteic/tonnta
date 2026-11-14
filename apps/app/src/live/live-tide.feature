Feature: Following the live tide gauge stream

  Scenario: Events split across network chunks are reassembled
    Given a stream that arrives in three arbitrary chunks
    When the parser reads them
    Then it dispatches one snapshot event and one reading event
    And it remembers the server's retry interval and last event id

  Scenario: Comments and heartbeats dispatch nothing
    Given a stream of only heartbeat comments
    When the parser reads it
    Then no events are dispatched

  Scenario: A snapshot replaces the state with the last hour
    Given an empty live tide state
    When a snapshot with 14 readings over 65 minutes arrives
    Then the state keeps the readings from the last hour
    And the trend is "rising"

  Scenario: A new reading is appended once
    Given a live tide state from a snapshot
    When the same new reading arrives twice
    Then it is appended once

  Scenario: A malformed event is ignored
    Given a live tide state from a snapshot
    When a reading arrives without a level
    Then the state is unchanged

  Scenario: Levels print signed, like a tide table
    Then 0.439 prints as "+0.44 m" and -0.12 prints as "−0.12 m"
