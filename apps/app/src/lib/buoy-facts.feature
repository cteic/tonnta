Feature: Offshore buoy observations

  Scenario: A recent observation shows every reading with its age
    Given an M2 observation from 40 minutes ago with all readings
    Then the card lists waves, period, wind and sea temperature
    And the observation is current and 40 minutes old

  Scenario: Readings the buoy did not report say so
    Given an M2 observation with only a wave height
    Then period, wind and sea temperature are marked not reported

  Scenario: An old observation is marked stale
    Given an M2 observation from 5 hours ago
    Then the observation is marked stale and 5 hours old

  Scenario: No observation is reported as missing
    Given no M2 observation
    Then the buoy facts are missing
