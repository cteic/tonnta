Feature: Spot route param

  Scenario: A known spot id resolves to its spot
    Given a route param of donabate
    When I resolve the spot route
    Then the spot is Donabate

  Scenario: Spot ids are matched case-insensitively
    Given a route param of Donabate
    When I resolve the spot route
    Then the spot is Donabate

  Scenario: An unknown spot id keeps the id but finds no spot
    Given a route param of lahinch
    When I resolve the spot route
    Then the spot id is lahinch
    And no spot is found

  Scenario: A repeated param takes its first value
    Given a repeated route param of donabate and lahinch
    When I resolve the spot route
    Then the spot is Donabate

  Scenario: A missing param yields no id
    Given no route param
    When I resolve the spot route
    Then there is no spot id

  Scenario: A param with path characters is rejected
    Given a route param of ../etc
    When I resolve the spot route
    Then there is no spot id
