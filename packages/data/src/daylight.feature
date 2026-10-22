Feature: Only recommending the water in daylight

  Scenario: Sunrise and sunset at Donabate on the shortest day
    When I work out the sun times at Donabate for 21 December 2026
    Then the sun rises within three minutes of 08:38 and sets within three minutes of 16:08

  Scenario: A December hour counts only if its middle is between sunrise and sunset
    Given Donabate on 21 December 2026, when the sun rises at about 08:38 and sets at about 16:06
    Then the 08:00 and 16:00 hours are dark
    And the 09:00 and 15:00 hours are light

  Scenario: A midsummer evening stays light until about ten
    Given Donabate on 21 June 2026, when the sun sets at about 21:57 Irish time
    Then the 21:00 Irish-time hour is light
    And the 22:00 Irish-time hour is dark
