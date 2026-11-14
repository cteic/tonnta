Feature: Holding the live tide connection open

  Scenario: The stream reopens after the server closes it
    Given a server that sends a snapshot with a 1200ms retry hint and closes
    When the connection opens
    Then the status goes live, then reconnecting
    And a reconnect is scheduled after 1200ms

  Scenario: A stopped connection that fails late does not open a second stream
    Given a server whose aborted requests reject only when told to
    When the connection opens, pauses and resumes
    And the first request's rejection finally arrives
    Then no reconnect is scheduled
    And only two requests were made

  Scenario: A connection that goes silent is dropped and reopened
    Given a server that sends a snapshot and then nothing, without closing
    When the connection opens and a minute passes with no data
    Then the status goes live, then reconnecting
    And a reconnect is scheduled after 5000ms

  Scenario: Every chunk counts as activity, heartbeats included
    Given a server that sends a snapshot, then a heartbeat, then closes
    When the connection opens
    Then activity is reported once per chunk, at the time it arrived
