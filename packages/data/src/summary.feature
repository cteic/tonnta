Feature: Summarising the forecast into windows and days

  Scenario: The next window skips one that has already ended
    Given GO hours at 08:00 to 09:00 and at 14:00 to 15:00 Donabate time
    When I ask for the next window at 11:00
    Then the next window starts at 14:00

  Scenario: A window in progress is still the next window
    Given GO hours at 08:00 to 09:00 and at 14:00 to 15:00 Donabate time
    When I ask for the next window at 09:30
    Then the next window starts at 08:00

  Scenario: A day of only blown-out hours is summarised as blown
    Given four hours of 0.8m waves under a 40km/h onshore wind
    When I summarise the days
    Then the day's verdict is blown
