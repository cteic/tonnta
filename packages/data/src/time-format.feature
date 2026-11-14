Feature: Formatting times for the spot's local clock

  Scenario: A single good hour reads as the hour it spans
    Then a window whose only hour starts at 18:00 UTC in late October reads "19:00–20:00" in Dublin

  Scenario: A run of good hours ends when its last hour does
    Then a window of hours starting 16:00 to 18:00 UTC reads "17:00–20:00" in Dublin
