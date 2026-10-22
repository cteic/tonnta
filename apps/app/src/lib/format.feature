Feature: Formatting times for the spot's local clock

  Scenario: A single good hour reads as the hour it spans
    Given a window whose only good hour starts at 18:00 UTC in late October
    When it is formatted for Dublin
    Then it reads "19:00–20:00"

  Scenario: A run of good hours ends when its last hour does
    Given a window of good hours starting at 16:00 and 18:00 UTC
    When it is formatted for Dublin
    Then it reads "17:00–20:00"
