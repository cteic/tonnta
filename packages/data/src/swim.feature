Feature: Snámh swim verdict engine

  Scenario: Calm flat water is a great swim
    Given calm conditions of 0.2m waves with 8km/h wind
    When I assess the swim hour
    Then the swim verdict should be great

  Scenario: A great swim near high tide mentions the tide
    Given calm conditions of 0.2m waves with 8km/h wind near a high tide
    When I assess the swim hour
    Then the swim verdict should be great
    And the result should note it is near high tide

  Scenario: Light chop is grand for a dip
    Given choppy conditions of 0.5m waves with 20km/h wind
    When I assess the swim hour
    Then the swim verdict should be ok

  Scenario: A rough sea is not a swim day
    Given rough conditions of 0.8m waves with 30km/h wind
    When I assess the swim hour
    Then the swim verdict should be no

  Scenario: A surf GO day is a swim NO day
    Given surfable conditions of 0.7m waves with 24km/h wind
    When I assess the swim hour
    Then the swim verdict should be no

  Scenario: A bathing restriction overrides a great swim verdict
    Given calm conditions of 0.2m waves with 8km/h wind
    And an active bathing restriction at Balcarrick
    When I assess the swim hour with water quality applied
    Then the swim verdict should be no
    And the reason should mention the restriction

  Scenario: A lifted restriction changes nothing
    Given calm conditions of 0.2m waves with 8km/h wind
    And a lifted bathing restriction at Balcarrick
    When I assess the swim hour with water quality applied
    Then the swim verdict should be great

  Scenario: Swim windows prefer high tide
    Given a swimmable morning far from high tide and a swimmable evening near high tide
    When I find the swim windows
    Then the first window should be the one near high tide

  Scenario: The EPA alert parser finds an active restriction
    Given an EPA alerts payload with a restriction for Balcarrick
    When I parse the payload for Balcarrick
    Then the parsed alert should have a restriction in place

  Scenario: The EPA alert parser ignores other beaches
    Given an EPA alerts payload with a restriction for another beach
    When I parse the payload for Balcarrick
    Then no alert should be found

  Scenario: An active restriction wins over a lifted one at the same beach
    Given an EPA alerts payload listing a lifted incident before an active one for Balcarrick
    When I parse the payload for Balcarrick
    Then the parsed alert should have a restriction in place

  Scenario: A calm day splits at the high-tide band
    Given calm water from 09:00 to 21:00 Irish time and a high tide at 15:00
    When I find the swim windows
    Then the first window runs from 13:00 to the 17:00 hour, around that high tide
    And the low-water stretches either side are separate windows

  Scenario: A swim window that has ended is not offered
    Given calm water from 09:00 to 11:00 Irish time and rough water after
    When I find the swim windows at 14:00
    Then there are no swim windows

  Scenario: No swimming in a thunderstorm
    Given calm water under a thunderstorm
    When I assess the swim
    Then the swim verdict should be no because of lightning

  Scenario: A swim window in progress starts at the hour in progress
    Given calm water from 09:00 to 13:00 Irish time
    When I find the swim windows at 11:30
    Then the window starts at 11:00
