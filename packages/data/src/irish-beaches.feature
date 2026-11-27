Feature: Irish surf beaches

  Each beach's facing decides what the app calls offshore. These scenarios
  check the stored facing against the best wind that surf guides give.

  Scenario Outline: The guide's best wind reads as offshore at <beach>
    Given the beach <beach>
    When a 15 km/h wind blows from <bestWind> degrees
    Then the app calls the wind offshore or cross-offshore

    Examples:
      | beach            | bestWind |
      | rossnowlagh      | 90       |
      | strandhill       | 135      |
      | streedagh        | 135      |
      | easkey-left      | 180      |
      | mullaghmore-head | 135      |
      | keel-achill      | 45       |
      | lahinch          | 90       |
      | inch-kerry       | 90       |
      | brandon-bay      | 135      |
      | inchydoney       | 0        |
      | garrettstown     | 0        |
      | brittas-bay      | 270      |
      | magheramore      | 270      |

  Scenario: Every Irish beach links to a real EPA bathing water or to none
    Given every Irish beach in the registry
    Then each EPA id names a bathing water in the EPA list

  Scenario: No Irish beach relies on the offline north-west buoy
    Given every Irish beach in the registry
    Then none uses buoy M4

  Scenario: Mullaghmore Head is not rated good on an ordinary swell
    Given Mullaghmore Head with a clean 15 km/h offshore wind
    When the swell is 1.5 m at 12 s
    Then it is not rated good
    When the swell is 3.5 m at 14 s
    Then it is rated good
