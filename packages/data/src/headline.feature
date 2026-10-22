Feature: What the home screen leads with

  Scenario: In daylight the headline is the verdict for the hour in progress
    Given the forecast for 22 October at Donabate
    When it is 11:30 Irish time
    Then the headline is the verdict for the 11:00 hour

  Scenario: After dark there is no verdict, only sunrise and the first-light verdict
    Given the forecast for 22 October at Donabate
    When it is 21:00 Irish time
    Then the headline says it is dark
    And it gives the next sunrise, about 08:05 Irish time
    And it previews the verdict for the first light hour, 08:00
