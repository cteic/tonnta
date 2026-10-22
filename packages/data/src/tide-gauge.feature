Feature: Reading the live tide gauge

  Scenario: A tide that has climbed over 15 minutes is rising
    Given gauge readings that climb 2 cm every 5 minutes
    When I read the trend
    Then the tide is "rising"

  Scenario: A tide that has dropped over 15 minutes is falling
    Given gauge readings that drop 2 cm every 5 minutes
    When I read the trend
    Then the tide is "falling"

  Scenario: Near high water the tide is slack
    Given gauge readings that move less than a centimetre every 5 minutes
    When I read the trend
    Then the tide is "slack"

  Scenario: Too short a history gives no trend
    Given two gauge readings 5 minutes apart
    When I read the trend
    Then there is no trend

  Scenario: A stream sends only readings the client has not seen
    Given gauge readings that climb 2 cm every 5 minutes
    When I take the readings after 16:05
    Then only the 16:10 and 16:15 readings remain

  Scenario: A cursor with milliseconds marks the same instant
    Given gauge readings that climb 2 cm every 5 minutes
    When I take the readings after 16:05 written with milliseconds
    Then only the 16:10 and 16:15 readings remain
