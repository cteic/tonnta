Feature: Geometry of the 24-hour conditions chart

  Scenario: Each hour gets an equal slot coloured by its verdict
    Given 24 hours of conditions
    When I lay the chart out 248 points wide with 4-point margins
    Then there are 24 bands, each 10 points wide
    And each band carries its hour's verdict

  Scenario: The wave axis rounds up to the next half metre, never below a metre
    Given hours whose biggest wave is 1.3m
    When I lay the chart out 248 points wide with 4-point margins
    Then the wave axis tops out at 1.5m
    And on a flat day the wave axis tops out at 1m

  Scenario: Ticks mark every sixth hour
    Given 24 hours of conditions
    When I lay the chart out 248 points wide with 4-point margins
    Then there are ticks at hours 0, 6, 12 and 18

  Scenario: A finger anywhere in a slot selects that hour
    Given 24 hours of conditions
    Then x 3 selects hour 0, x 125 selects hour 12 and x 400 selects hour 23

  Scenario: The spoken summary names the longest GO run
    Given hours that go GO, MAYBE, GO, GO, GO, FLAT
    Then the longest GO run is from the third hour to the fifth
