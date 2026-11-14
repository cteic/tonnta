Feature: Choosing the hour in progress

  Scenario: Mid-hour, the hour in progress is current
    Given forecast hours from 10:00 to 13:00 UTC
    When it is 10:40 UTC
    Then the current hour is 10:00 UTC

  Scenario: On the hour, that hour is current
    Given forecast hours from 10:00 to 13:00 UTC
    When it is 11:00 UTC
    Then the current hour is 11:00 UTC

  Scenario: Before the forecast starts, the first hour is current
    Given forecast hours from 10:00 to 13:00 UTC
    When it is 09:15 UTC
    Then the current hour is 10:00 UTC

  Scenario: Across a gap in the forecast, the next hour is current
    Given forecast hours at 10:00 and 13:00 UTC
    When it is 11:30 UTC
    Then the current hour is 13:00 UTC
