Feature: Window range formatting

  Scenario: A multi-hour window shows start and end
    Given a window from 08:00 to 11:00 UTC
    When I format the window range for Dublin
    Then I see both times joined by a dash

  Scenario: A single-hour window shows one time only
    Given a window from 21:00 to 21:00 UTC
    When I format the window range for Dublin
    Then I see a single time with no dash
